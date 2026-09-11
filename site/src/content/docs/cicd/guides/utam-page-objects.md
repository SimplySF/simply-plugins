---
title: Publishing UTAM page objects per package version
description: Give every Unlocked Package version a matching npm package of compiled UTAM page objects, so a UI-test suite can pin the page objects that describe the version it tests.
---

[UTAM](https://utam.dev) page objects are authored as JSON next to the component they describe, and a UI test can't use them until the UTAM compiler turns them into JavaScript. That compiled output has to reach the test suite somehow — and which output the suite needs depends on **which package version is installed in the org it's testing**. A page object compiled from a later commit describes DOM that version doesn't have.

`sf simply cicd build publish-utam-page-objects` closes that gap: it runs right after [`build create-package-version`](/cicd/reference/build/), compiles the page objects from the same source that produced the package version, and publishes them to an npm registry under a version derived from the Salesforce version number. Every `04t` gets a matching npm package.

## What the project needs

Page objects live in a `__utam__` folder inside the component bundle, which is UTAM's own convention:

```
force-app/main/default/lwc/hello/
├── hello.html
├── hello.js
├── hello.js-meta.xml
└── __utam__/
    └── hello.utam.json
```

Add `**/__utam__/**` to `.forceignore`. LWC bundles don't tolerate stray subfolders on deploy, and the JSON has no business inside the package itself.

Then declare the npm package name in `sfdx-project.json` (see [sfdx-project.json fields](/cicd/concepts/sfdx-project-fields/)):

```json
{
  "plugins": {
    "simply": {
      "utam": {
        "packageName": "@acme/my-package-pageobjects"
      }
    }
  }
}
```

That's the minimum. `alias`, `peerDependencies`, and `compilerConfig` are available for projects that need them.

## Wiring the job

Add one job to the build pipeline's `package` stage, downstream of `create-package-version`:

```yaml
create-package-version:
  stage: package
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  before_script:
    - sf org login jwt --alias packaging-devhub --username $PACKAGING_DEVHUB_USERNAME
      --jwt-key-file $PACKAGING_DEVHUB_JWT_KEY_FILE --client-id $PACKAGING_DEVHUB_CLIENT_ID
      --instance-url $PACKAGING_DEVHUB_INSTANCE_URL
  script:
    - sf simply cicd build create-package-version
      --ci-commit-ref-name $CI_COMMIT_REF_NAME --ci-commit-sha $CI_COMMIT_SHA
      --ci-pipeline-id $CI_PIPELINE_ID --ci-pipeline-url $CI_PIPELINE_URL
      --ci-project-path $CI_PROJECT_PATH --ci-pipeline-source $CI_PIPELINE_SOURCE
      --project-access-token $PROJECT_ACCESS_TOKEN
      --packaging-devhub packaging-devhub
      --package-release-branch-prefix release/
  artifacts:
    reports:
      dotenv: subscriberPackageVersionId.env

publish-utam-page-objects:
  stage: package
  needs: [create-package-version]
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  before_script:
    - sf org login jwt --alias packaging-devhub --username $PACKAGING_DEVHUB_USERNAME
      --jwt-key-file $PACKAGING_DEVHUB_JWT_KEY_FILE --client-id $PACKAGING_DEVHUB_CLIENT_ID
      --instance-url $PACKAGING_DEVHUB_INSTANCE_URL
  script:
    - sf simply cicd build publish-utam-page-objects
      --packaging-devhub packaging-devhub
      --ci-commit-ref-name $CI_COMMIT_REF_NAME
      --package-release-branch-prefix release/
  variables:
    SIMPLY_CICD_NPM_REGISTRY: ${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/npm/
    SIMPLY_CICD_NPM_TOKEN: ${CI_JOB_TOKEN}
```

The `dotenv` report on `create-package-version` is what carries the new `04t` into this job — GitLab injects it as `$SUBSCRIBER_PACKAGE_VERSION_ID`, and the command picks it up with no flag. (The same report is what `start-deployment` reads, so a project pipeline needs it regardless.)

A separate job rather than a fourth line in `create-package-version`'s `script:` keeps a registry outage from retroactively failing a package version that was created, tagged, and coverage-checked successfully. If you'd rather run it in the same job, that works too — the command falls back to reading `subscriberPackageVersionId.env` off disk, which is where `create-package-version` just wrote it.

## The version it publishes under

The Salesforce version number isn't semver, so it's mapped — the same way `sfdx-project.json` already writes a dependency pin (`"package": "MyPackage@1.2.3-4"`):

| Salesforce version | Build                                       | Git tag              | npm version         | dist-tag    |
| ------------------ | ------------------------------------------- | -------------------- | ------------------- | ----------- |
| `1.2.3.4`          | release branch                              | `v1.2.3.4`           | `1.2.3-4`           | `latest`    |
| `1.2.3.4`          | package `branch` attribute `beta`           | `v1.2.3.4-beta`      | `1.2.3-4.beta`      | `beta`      |
| `1.2.3.4`          | `feature/x`, with `--always-create-package` | `v1.2.3.4-feature/x` | `1.2.3-4.feature-x` | `feature-x` |

The build number becomes the first prerelease identifier, and the git tag's suffix — if the build got one — becomes the second, reduced to the characters semver allows. Pass `--ci-commit-ref-name` and `--package-release-branch-prefix` exactly as you pass them to `create-package-version`, so the two agree on whether this is a release build.

Two consequences worth knowing:

- Because the version is always a prerelease, `^1.2.3` will **not** match it. Pin the exact version, or install by dist-tag.
- Numeric prerelease identifiers compare numerically, so `1.2.3-10` is newer than `1.2.3-9`, matching Salesforce's own ordering.

## Consuming the result

On success the command appends to its `--out` dotenv file:

```
UTAM_PAGE_OBJECTS_PACKAGE=@acme/my-package-pageobjects
UTAM_PAGE_OBJECTS_VERSION=1.2.3-4
```

so a downstream UI-test job can install the right page objects without knowing the mapping rule:

```yaml
ui-test:
  script:
    - npm install "$UTAM_PAGE_OBJECTS_PACKAGE@$UTAM_PAGE_OBJECTS_VERSION"
```

Page objects are addressed by path, the same way `salesforce-pageobjects` works:

```js
import Hello from '@acme/my-package-pageobjects/pageObjects/hello';

const hello = await utam.load(Hello);
```

The published package declares `@utam/core` as a **peer dependency**, matching the compiler it was built with. Your test suite provides it — and must resolve a single copy across your own page objects and `salesforce-pageobjects` alike.

## What gets published

```
pageObjects/<name>.js      ES module
pageObjects/<name>.cjs     CommonJS
pageObjects/<name>.d.ts    types for the ESM entry
pageObjects/<name>.d.cts   types for the CJS entry
utils/                     compiled extensions, if the project has any
source/**/*.utam.json      the JSON the output was compiled from
```

Compiler output is flat: every page object lands in `pageObjects/` under its own file name, whatever depth it was authored at. LWC already guarantees those names are unique.

The generated `package.json` also records where the output came from, so any published version can be traced back to the package version and commit that produced it:

```json
{
  "salesforce": {
    "package": "MyPackage",
    "versionNumber": "1.2.3.4",
    "subscriberPackageVersionId": "04t...",
    "tag": "v1.2.3.4",
    "commitSha": "abc123",
    "pipelineUrl": "https://gitlab.example.com/pipelines/999"
  }
}
```

## When it does nothing

The job skips, without failing, when:

- `PACKAGE_CHANGED=FALSE` — no new package version was built (see [`build determine-package-changes`](/cicd/reference/build/)).
- `--disabled` is passed, or `SIMPLY_CICD_DISABLED` is set.
- No package version ID can be found in any of the three sources.
- The project authors no `.utam.json` files yet — so the job can be wired up before UTAM is adopted.
- That exact version is already on the registry. This is what lets you **retry** a job that died after publishing succeeded, instead of failing on a version conflict.

Anything else fails the job. A missing page-object package would silently break every UI test pinned to that version, so it's not something to warn about and carry on from.

## Other registries

The example above targets GitLab's project-level npm registry. For npmjs.com, a scoped package needs `--npm-access public` on its first publish:

```bash
sf simply cicd build publish-utam-page-objects \
  --packaging-devhub packaging-devhub \
  --npm-registry https://registry.npmjs.org/ \
  --npm-token "$NPM_TOKEN" \
  --npm-access public
```

The token is written to an `.npmrc` inside a staging directory outside your repo — your own `.npmrc`, if you have one, is never touched.

## Trying it without publishing

`--dry-run` compiles and packs, then copies the tarball into the working directory instead of publishing:

```bash
sf simply cicd build publish-utam-page-objects \
  --packaging-devhub packaging-devhub \
  --subscriber-package-version-id 04t... \
  --dry-run
```

Useful for inspecting what a project would produce before wiring the job into a pipeline. Keep the tarball as a CI artifact if you want to diff two builds.

## The compiler

The UTAM compiler is installed at run time into the staging directory, not shipped with `simply-cicd` — it pulls in rollup and the whole `@utam/*` family, which would otherwise be carried by every user of this plugin. `--utam-version` (default `^3`) pins which one, and the published package's `@utam/core` peer range follows whatever actually got installed.

That means the job needs network access to your npm registry for the install, on top of the access it needs to publish.
