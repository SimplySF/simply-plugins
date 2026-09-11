# 0037 — `simply cicd build publish-utam-page-objects`

**Status:** Draft
**Package:** `packages/simply-cicd`
**Date:** 2026-09-11

## Problem

A team that UI-tests an Unlocked Package with [UTAM](https://utam.dev) authors one `.utam.json` page
object per Lightning Web Component, in a `__utam__` folder beside the component source. Those JSON
files are useless to a test until the UTAM compiler turns them into JavaScript, and that compiled
output has to reach the UI-test suite somehow — today by hand, or by committing generated code.

Neither works once a package has more than one live version. A UI-test suite pinned to package
version `1.2.3.4` needs the page objects _as they were at `1.2.3.4`_: a page object compiled from a
later commit describes DOM the installed package doesn't have. `simply-cicd` already creates the
package version, verifies coverage, and pushes a git tag carrying the `04t` ID
([`build create-package-version`](../../packages/simply-cicd/src/common/build/createPackageVersion.ts)),
so it is the one place that knows, at the moment a version is born, exactly which source produced it.
Nothing then compiles the page objects from that same source and publishes them under a name a test
suite can `npm install`.

The ask: every Salesforce Unlocked Package version gets a corresponding npm package of its compiled
UTAM page objects, produced by the same pipeline, immediately after `create-package-version`.

## Decision

Add one build command, `sf simply cicd build publish-utam-page-objects`, that runs after
`create-package-version` in the `package` stage. It resolves the version number of the `04t` that
stage just produced, compiles every `.utam.json` under the default package directory with the UTAM
compiler in a throwaway staging directory, wraps the output in a generated `package.json` whose
version is derived 1:1 from the Salesforce version number, and runs `npm publish`. It records the
published name and version in the same dotenv file the packaging stage already hands downstream.

It lives in `simply-cicd`, not `simply-package` or a new package: it is pipeline glue — CI context,
tokens, dotenv artifacts, skip guards — of exactly the kind `create-package-version` and
`create-fallback-tag` already are, and it has no plausible non-CLI consumer (0019's criterion 3).

The plugin does not bundle the UTAM compiler. Like `lwc-jest` installs `@salesforce/sfdx-lwc-jest`
at run time, this command `npm install`s `utam` into the staging directory, so `simply-cicd` carries
no rollup-sized dependency for a feature most of its users won't turn on.

### What the spike established

Measured with `utam@3.3.0` against a fixture sfdx tree
(`force-app/main/default/lwc/hello/__utam__/hello.utam.json` plus a second page object two folders
deeper), so the design below rests on observed compiler behaviour rather than the docs:

| Question                                                                      | Observed                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Output layout                                                                 | **Flat.** Every page object lands in `pageObjectsOutputDir` by file name regardless of source depth: `pageObjects/hello.js`, `pageObjects/greeting.js`. Names must be unique per package — LWC already guarantees that.                                                  |
| Files per page object                                                         | Four: `.js` (per `moduleTarget`), `.cjs`, `.d.ts`, `.d.cts`.                                                                                                                                                                                                             |
| Cross-package `"type": "salesforce-pageobjects/lightning/pageObjects/button"` | Compiles to a bare `import _Button from 'salesforce-pageobjects/lightning/pageObjects/button'` **without** `salesforce-pageobjects` being installed. Resolution is the consumer's problem, at test time — the compile step needs no `npm install` of the project's deps. |
| `alias`                                                                       | Rewrites import specifiers: `{ "my-pageobjects/*": "@acme/my-pageobjects/*" }` turned `"type": "my-pageobjects/pageObjects/greeting"` into `import from '@acme/my-pageobjects/pageObjects/greeting'`.                                                                    |
| `version` / `copyright`                                                       | `version` becomes `@version 1.2.3-4` in each file's JSDoc; `copyright` lines become the file header. Both land in the `.d.ts` too.                                                                                                                                       |
| Runtime imports of generated code                                             | Only `@utam/core` (plus whatever the JSON referenced). The published package therefore needs `@utam/core` as a peer, nothing else.                                                                                                                                       |
| CLI surface                                                                   | `utam -c <config>`, `-p <projects…>`, `-t commonjs\|module`, `-v`. **No flag sets `version`** — it has to be written into the config file, which is why the command generates the config rather than passing arguments.                                                  |

The `salesforce-pageobjects` package (12.0.0) is the reference shape for what we publish: `"type":
"module"`, an `exports` map of `./*` onto `.js`/`.cjs` with `.d.ts`/`.d.cts` types, the source
`.utam.json` shipped alongside the compiled output, and an `index.js` that only prints "import a
page object by path". It declares no dependency on `@utam/core` at all and relies on
`wdio-utam-service` bringing it; we declare the peer explicitly, which is the same contract stated
honestly.

## Behavior

### Command

```
sf simply cicd build publish-utam-page-objects
  --packaging-devhub <alias>
  [--subscriber-package-version-id <04t>]
  [--npm-package-name <name>] [--npm-registry <url>] [--npm-token <token>]
  [--npm-access public|restricted] [--npm-dist-tag <tag>]
  [--ci-commit-ref-name <ref>] [--package-release-branch-prefix <prefix>]
  [--utam-version <npm spec>] [--dry-run] [--out <file>] [--env-file <file>]
  [--debug] [--disabled] [--json]
```

| Flag                              | Env var                                     | Required | Purpose                                                                                                                                                                                                                          |
| --------------------------------- | ------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--packaging-devhub`              | `SIMPLY_CICD_PACKAGING_DEVHUB`              | yes      | Already-authenticated Dev Hub alias, for `sf package version report`. Same flag and variable as `create-package-version`.                                                                                                        |
| `--subscriber-package-version-id` | — (see resolution below)                    | no       | The `04t` to publish page objects for.                                                                                                                                                                                           |
| `--npm-package-name`              | `SIMPLY_CICD_NPM_PACKAGE_NAME`              | no\*     | Name to publish under. \*Required unless `plugins.simply.utam.packageName` is set in `sfdx-project.json`. Flag wins.                                                                                                             |
| `--npm-registry`                  | `SIMPLY_CICD_NPM_REGISTRY`                  | no       | Registry URL. Omitted → npm's own configured default.                                                                                                                                                                            |
| `--npm-token`                     | `SIMPLY_CICD_NPM_TOKEN`                     | no       | Auth token. When given, written as `//<registry host+path>/:_authToken=` into a `.npmrc` **inside the staging directory only** — the repo's `.npmrc`, if any, is never touched. Omitted → whatever npm auth the job already has. |
| `--npm-access`                    | `SIMPLY_CICD_NPM_ACCESS`                    | no       | Passed through as `npm publish --access`. Needed on npmjs.com for a public scoped package; ignored by GitLab.                                                                                                                    |
| `--npm-dist-tag`                  | —                                           | no       | Overrides the derived dist-tag (table below).                                                                                                                                                                                    |
| `--ci-commit-ref-name`            | `SIMPLY_CICD_CI_COMMIT_REF_NAME`            | no       | With `--package-release-branch-prefix`, reproduces `create-package-version`'s tag-suffix decision so the npm version mirrors the git tag.                                                                                        |
| `--package-release-branch-prefix` | —                                           | no       | As on `create-package-version`.                                                                                                                                                                                                  |
| `--utam-version`                  | `SIMPLY_CICD_UTAM_VERSION`                  | no       | npm spec of the compiler to install. Default `^3`.                                                                                                                                                                               |
| `--dry-run`                       | —                                           | no       | Compile and `npm pack`; do not publish. The tarball is copied to the project root so a pipeline can keep it as an artifact.                                                                                                      |
| `--out`                           | —                                           | no       | Dotenv file to append results to. Default `subscriberPackageVersionId.env`, matching `create-fallback-tag`.                                                                                                                      |
| `--env-file`                      | —                                           | no       | Dotenv file to read the `04t` from when neither flag nor env var has it. Default `subscriberPackageVersionId.env`.                                                                                                               |
| `--debug`, `--disabled`           | `SIMPLY_CICD_DEBUG`, `SIMPLY_CICD_DISABLED` | no       | Standard build-command guards.                                                                                                                                                                                                   |

`--npm-package-name`/`--npm-registry`/`--npm-token`/`--npm-access` are pipeline-wide constants, so
they get `SIMPLY_CICD_*` variables per the
[environment-variables convention](../../site/src/content/docs/cicd/concepts/environment-variables.md).
`--npm-dist-tag`, `--dry-run`, `--out`, `--env-file` are per-invocation and deliberately don't.

### Resolving the `04t`

The value has two natural sources depending on where the command runs, and the command tries both
so the pipeline author doesn't have to plumb it:

| Order | Source                                                | Covers                                                                                                                                                 |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `--subscriber-package-version-id`                     | Explicit.                                                                                                                                              |
| 2     | `SUBSCRIBER_PACKAGE_VERSION_ID` in the environment    | A **separate job** downstream of `create-package-version`, receiving its `dotenv` report artifact (GitLab injects it as a variable).                   |
| 3     | `SUBSCRIBER_PACKAGE_VERSION_ID=` line in `--env-file` | The **same job**, later in the `script:` list — a dotenv report only reaches _other_ jobs, but the file `create-package-version` wrote is right there. |
| —     | none of the above                                     | Warn and skip (`{ skipped: true }`). A build that made no package version has no page objects to publish. Not an error.                                |

### Skip guards, in order

1. `getSkipReason('publish-utam-page-objects')` — `PACKAGE_CHANGED=FALSE` skips, same as
   `create-package-version` (the job is added to `PACKAGE_CHANGED_GATED_JOBS`).
2. `--disabled`.
3. No `04t` resolvable (above).
4. No `**/__utam__/**/*.utam.json` under the default package directory — info-level skip. A project
   that hasn't adopted UTAM yet can wire the job in ahead of time.
5. `npm view <name>@<version> version` already resolves on the target registry — info-level skip,
   reported as `published: false, alreadyPublished: true`. This is what makes a GitLab "retry" of a
   job that died _after_ `npm publish` succeed instead of failing on a 409.

Everything after that throws on failure. `lwc-jest` logs-not-throws because a failing unit test
shouldn't block a package build; here a missing page-object package would silently break every UI
test pinned to that version, so the job must go red.

### Version mapping

`sf package version report --package <04t>` returns `Version` as `major.minor.patch.build`
(`1.2.3.4`), which is not semver. The npm version is derived so that it is valid semver, unique per
Salesforce version, and reversible by eye — and so that it is the **same** transformation
`sfdx-project.json` itself uses for dependency pins (`"package": "MyPackage@1.2.3-4"`), and the
inverse of the one `git.ts` already applies when deducing a tag from such a pin:

| Salesforce version | Build context                              | Git tag (existing, from `determineVersionTag`) | npm version         | dist-tag    |
| ------------------ | ------------------------------------------ | ---------------------------------------------- | ------------------- | ----------- |
| `1.2.3.4`          | release branch                             | `v1.2.3.4`                                     | `1.2.3-4`           | `latest`    |
| `1.2.3.4`          | package `branch` attribute `beta`          | `v1.2.3.4-beta`                                | `1.2.3-4.beta`      | `beta`      |
| `1.2.3.4`          | `feature/x` with `--always-create-package` | `v1.2.3.4-feature/x`                           | `1.2.3-4.feature-x` | `feature-x` |

Rules: the build number becomes the first prerelease identifier; the git tag's suffix, if any,
becomes the second, sanitised to `[0-9A-Za-z-]` (semver's prerelease alphabet — `/` in a branch name
is the common offender). The dist-tag is `latest` exactly when the git tag has no suffix, else the
sanitised suffix. `--npm-dist-tag` overrides.

Consequences worth stating:

- Numeric prerelease identifiers compare numerically, so `1.2.3-10 > 1.2.3-9`. Ordering within a
  patch line matches Salesforce's.
- A prerelease version is never matched by a caret/tilde range (`^1.2.3` skips `1.2.3-4`). That is
  fine and arguably right: a UI-test suite pins the exact version it tests against, and `latest`
  is the "just give me the newest release build" handle for humans.
- The suffix is carried even when Salesforce version numbers happen to be unique across package
  branches, because the point is that the npm version reads like the git tag.

### Generated package

Staged in `os.tmpdir()/simply-cicd-utam-<pipeline id or pid>/`, never inside the repo:

```
package.json            generated, below
.npmrc                  only if --npm-token was given
utam.config.json        generated, below
node_modules/utam       installed with `npm install --no-save utam@<--utam-version>`
pageObjects/*.{js,cjs,d.ts,d.cts}   compiler output
utils/*                 compiler output for extensions, if any
source/**/*.utam.json   the inputs, copied verbatim (salesforce-pageobjects ships these too)
```

`package.json`:

```json
{
  "name": "@acme/my-package-pageobjects",
  "version": "1.2.3-4",
  "description": "UTAM page objects for MyPackage 1.2.3.4 (04tXXXXXXXXXXXXXXX)",
  "type": "module",
  "files": ["pageObjects", "utils", "source"],
  "exports": {
    "./package.json": "./package.json",
    "./*": {
      "import": { "types": "./*.d.ts", "default": "./*.js" },
      "require": { "types": "./*.d.cts", "default": "./*.cjs" }
    }
  },
  "peerDependencies": { "@utam/core": "^3.3.0" },
  "salesforce": {
    "package": "MyPackage",
    "versionNumber": "1.2.3.4",
    "subscriberPackageVersionId": "04tXXXXXXXXXXXXXXX",
    "tag": "v1.2.3.4",
    "commitSha": "<from sf package version report: Tag>",
    "pipelineUrl": "<from sf package version report: Description>"
  }
}
```

- `@utam/core`'s peer range is `^<major>.<minor>.0` of whatever `utam` version actually got
  installed, read from `node_modules/utam/package.json` — not hard-coded, so `--utam-version 4`
  produces a coherent package on the day UTAM 4 exists.
- `peerDependencies` from `plugins.simply.utam.peerDependencies` are merged in, for projects whose
  page objects reference `salesforce-pageobjects` or a dependency package's page objects.
- The `salesforce` block is the audit trail. `create-package-version` already stores the commit SHA
  as the package version's `Tag` and the pipeline URL as its `Description`, so both are recoverable
  from the report without extra flags.

`utam.config.json`:

```json
{
  "pageObjectsRootDir": "<absolute path to the default package directory>",
  "pageObjectsFileMask": ["**/__utam__/**/*.utam.json"],
  "pageObjectsOutputDir": "<staging>/pageObjects",
  "extensionsOutputDir": "<staging>/utils",
  "moduleTarget": "module",
  "module": "@acme/my-package-pageobjects",
  "version": "1.2.3-4",
  "copyright": ["UTAM page objects for MyPackage 1.2.3.4 (04tXXXXXXXXXXXXXXX)"],
  "alias": { "…from plugins.simply.utam.alias, if any…": "" }
}
```

`module` is set to the npm name so a page object can reference a sibling as
`"type": "@acme/my-package-pageobjects/pageObjects/greeting"` and the import resolves once
installed — no alias needed for self-references. If `plugins.simply.utam.compilerConfig` names a
file, it is read and merged **beneath** the keys above; the command owns root, masks, output dirs,
`module`, `version`, and `copyright`, and the project owns everything else (`profiles`, `lint`,
`interruptCompilerOnError`, …).

### `sfdx-project.json`

```json
"plugins": {
  "simply": {
    "utam": {
      "packageName": "@acme/my-package-pageobjects",
      "alias": { "salesforce-pageobjects/*": "salesforce-pageobjects/*" },
      "peerDependencies": { "salesforce-pageobjects": "^12.0.0" },
      "compilerConfig": "config/utam.config.json"
    }
  }
}
```

All four are optional; `packageName` is required _somewhere_ (here or `--npm-package-name`). Read
via `getPluginConfig`, the same way `coverageRequirement` is today.

### Output

Appends to `--out` (via the existing `appendToEnvFile`):

```
UTAM_PAGE_OBJECTS_PACKAGE=@acme/my-package-pageobjects
UTAM_PAGE_OBJECTS_VERSION=1.2.3-4
```

so a downstream UI-test job — or the child deploy pipeline `start-deployment` already triggers —
can `npm install "$UTAM_PAGE_OBJECTS_PACKAGE@$UTAM_PAGE_OBJECTS_VERSION"` without knowing the
mapping rule. `--json` returns
`{ skipped, published, alreadyPublished?, packageName?, version?, distTag?, tarball? }`.

### Pipeline

```yaml
create-package-version:
  stage: package
  # …as in the guide…
  artifacts:
    reports:
      dotenv:
        subscriberPackageVersionId.env # the guide's current example omits this — it must be
        # there for start-deployment's $SUBSCRIBER_PACKAGE_VERSION_ID too

publish-utam-page-objects:
  stage: package
  needs: [create-package-version]
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  before_script:
    - sf org login jwt --alias packaging-devhub … # same login as create-package-version
  script:
    - sf simply cicd build publish-utam-page-objects
      --packaging-devhub packaging-devhub
      --package-release-branch-prefix release/
  variables:
    SIMPLY_CICD_NPM_REGISTRY: ${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/npm/
    SIMPLY_CICD_NPM_TOKEN: ${CI_JOB_TOKEN}
```

A separate job rather than a fourth line in `create-package-version`'s `script:` because a registry
outage shouldn't retroactively fail a package version that was created, tagged, and coverage-checked
successfully — and because the retry story is then per-job. The same-job form works too (source 3
in the `04t` resolution table) for pipelines that prefer it.

### Source layout the project must adopt

- Page objects live at `<lwc bundle>/__utam__/<name>.utam.json`, UTAM's own convention.
- `.forceignore` gains `**/__utam__/**`. LWC bundles don't tolerate stray subfolders on deploy, and
  the JSON has no business in the package. This is what `utam-js-recipes` does.
- `determine-package-changes` diffs the package directory, so a page-object-only commit still
  counts as a package change and builds a new package version. That is the intended contract —
  every published page-object version corresponds to a real `04t`, never to a commit between two —
  not a bug to filter out.

## Alternatives considered

**Commit compiled page objects to the repo.** Rejected. Generated-code churn on every page-object
edit, and the version a test needs is "the one for `04t…`", which a file in `main` can't express.
Publishing under the Salesforce version number is the entire feature.

**Publish the tarball as a GitLab generic package / release asset instead of to npm.** Rejected.
UI-test suites consume dependencies through `package.json`; anything that isn't `npm install`-able
pushes the mapping problem onto every consumer.

**Let the project own `utam.config.json` and `package.json`, and have the command just run
`npm run build && npm publish`.** Rejected as the default, kept as the escape hatch
(`compilerConfig`). The version must be stamped by CI from the `04t` — the compiler has no
`--version` flag, so the config has to be written per build regardless — and an sfdx project root
is a bad place to grow a second `package.json` whose `version` field is a lie between releases.

**Fold the build number into the patch: `1.2.3.4` → `1.2.34` or `1.2.3004`.** Rejected. Lossy or
absurd, and it no longer reads as the Salesforce version. **`1.2.3+4` build metadata.** Rejected:
semver ignores build metadata in comparisons, so `1.2.3+4` and `1.2.3+5` are the same version to
every range resolver, and registries reject the second publish. **Plain `1.2.3`.** Rejected: the
build number is the one component that changes between two CI runs on the same patch line, so two
consecutive package versions would collide. **`1.2.3-4`** is what `sfdx-project.json` already writes
for a dependency pin, which settles it.

**Bundle `utam` as a dependency of `simply-cicd`.** Rejected. It pulls in rollup, `@utam/*`,
`yargs`, and `fast-glob` for every `simply-cicd` user, most of whom don't use UTAM. Run-time install
into the staging directory is the precedent `lwc-jest` set, and `--utam-version` gives the pin.

**Extract the compile/publish logic to `simply-cicd-core`.** Rejected per 0035: it shells out
(`execa` → `npm`, `sf`), uses the plugin logger throughout, and has no non-CLI consumer.

**A `--publish-utam-page-objects` flag on `create-package-version`.** Rejected. Couples a registry
failure to package creation success, and every flag this command needs would have to be added to
that one too. Separate command, separate job, `needs:` between them.

**Fail softly when no page objects exist vs. requiring opt-in.** Chosen: soft skip. A pipeline can
be wired before the first `.utam.json` lands, and `--disabled` exists for turning it off on purpose.

## Implementation plan

1. `src/common/build/createPackageVersion.ts` — export `determineVersionTag` and
   `refIncludesPrefix` (currently module-private). No behaviour change; both are reused to keep the
   npm version and the git tag derived from one rule.
2. `src/common/build/utamPageObjects.ts` — pure, unit-testable helpers:
   `toNpmVersion(salesforceVersion, tagSuffix?)`, `toDistTag(tagSuffix?)`, `sanitizePrereleaseId`,
   `buildPackageManifest(...)`, `buildCompilerConfig(...)`, `findPageObjectSources(dir)`,
   `readUtamPluginConfig(sfdxProject)`, `resolveSubscriberPackageVersionId(flag, env, envFile)`.
3. `src/common/build/publishUtamPageObjects.ts` — the orchestration: guards → report → stage →
   `npm install --no-save utam@…` → `utam -c` → copy sources → write manifest/`.npmrc` →
   `npm view` idempotency check → `npm publish --tag … [--registry …] [--access …]` or `npm pack` →
   `appendToEnvFile`. Uses `runSfJson` for the report and `execa` for `npm`/`npx`.
4. `src/common/build/skipGuard.ts` — add `'publish-utam-page-objects'` to
   `PACKAGE_CHANGED_GATED_JOBS`.
5. `src/commands/simply/cicd/build/publish-utam-page-objects.ts` — thin `SfCommand`, flags as
   tabled, delegating like `lwc-jest.ts` does.
6. `messages/simply.cicd.build.publish-utam-page-objects.md`.
7. Tests (below), then `pnpm run build` (regenerates `command-snapshot.json`) and `pnpm run readme`
   in `packages/simply-cicd`; `packages/simply` bundles `simply-cicd`, so its README needs
   `pnpm run readme` too.
8. Site: new `site/src/content/docs/cicd/guides/utam-page-objects.md`; add the job and the missing
   `dotenv` artifact to `guides/gitlab-ci-pipeline.md`; add `plugins.simply.utam` to
   `concepts/sfdx-project-fields.md`; add the four `SIMPLY_CICD_NPM_*` variables and
   `SIMPLY_CICD_UTAM_VERSION` to `concepts/environment-variables.md`; `pnpm --filter site run sync`.
9. Row in `docs/design/README.md`.

No new runtime dependencies for `simply-cicd`. `npm` on `PATH` is already assumed by `lwc-jest`.

## Testing

Unit (vitest, `execa` and `logger` mocked as in `lwcJest.test.ts`):

- `toNpmVersion` / `toDistTag` — the three rows of the mapping table, plus `feature/x/y` and a
  branch with `.` and `_` in it, plus a build number ≥ 10 to pin numeric ordering.
- `resolveSubscriberPackageVersionId` — flag beats env beats file; file with and without trailing
  newline; file absent; malformed value rejected via `isSubscriberPackageVersionId`.
- `buildPackageManifest` — `exports` shape, peer range derived from an installed-`utam` fixture
  `package.json`, project peers merged, `salesforce` block populated from a report fixture.
- `buildCompilerConfig` — command-owned keys win over `compilerConfig` file keys; `module` equals
  the package name; `alias` passthrough.
- `publishUtamPageObjects` — each skip guard in order and that nothing is executed past it; the
  exact `execa` calls for install → compile → view → publish, with `--tag`, `--registry`, `--access`
  present only when they should be; `.npmrc` written only with a token and only into staging;
  `npm view` hit → `alreadyPublished` and no publish; `--dry-run` → `npm pack`, no publish, tarball
  path returned; compile failure and publish failure both throw; `appendToEnvFile` receives the
  two keys.
- `getSkipReason('publish-utam-page-objects')` gated on `PACKAGE_CHANGED`.
- Command test: flags map onto the options object; `--json` result shape.

Integration (opt-in, needs network — `SIMPLY_CICD_UTAM_INTEGRATION=1`): run the real compiler on
the fixture tree from the spike with `--dry-run`, unpack the tarball, and assert the four files per
page object, the `@version` JSDoc, the alias-rewritten import, and that importing
`pageObjects/hello.js` fails only on the missing `@utam/core` peer and nothing else. No NUT against
a registry.

## Open questions

- **Registry conventions beyond GitLab.** GitHub Packages requires the scope to equal the repo
  owner; npmjs.com needs `--npm-access public` for scoped packages. The flags cover both, but the
  guide will document GitLab's project-level endpoint as the worked example. Whether to add a
  `--vcs-provider`-aware default for `--npm-registry` is deferred until someone runs this on GitHub.
- **Ship `source/**/*.utam.json`?** Proposed yes, matching `salesforce-pageobjects`, so a consumer
  can read what a page object exposes without the `.d.ts`. Cheap to drop if it's noise.
- **Should `create-package-version` also write `PACKAGE_VERSION_NUMBER` to the dotenv?** It would
  save this command the `sf package version report` round trip. Not done here — the report is also
  where `Tag`/`Description` come from, and one source of truth beats two — but it's a small,
  independent change if a later stage wants the number too.
- **Compiler major bumps.** `--utam-version` defaults to `^3`. When UTAM 4 ships, the peer range
  follows automatically but the default should be reviewed against `salesforce-pageobjects`'
  compatibility note, since consumers must run one `@utam/core` major across everything they load.
