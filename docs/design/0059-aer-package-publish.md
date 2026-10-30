# 0059 — `simply cicd build publish-aer-package`

**Status:** Draft
**Package:** `packages/simply-cicd` (command), `simply-plugins-core/packages/simply-cicd-core` (logic)
**Date:** 2026-10-30

## Problem

[aer](https://www.octoberswimmer.com/tools/aer) (Apex Execution Runtime, October Swimmer) runs Apex
and Apex tests locally, with no org. You can use it directly as the `aer` binary, or through the
`@octoberswimmer/aer-sf-plugin` sf plugin (`sf aer apex run test`). The plugin resolves the same
binary and runs it.

A project whose Apex calls into _another_ package's Apex needs that package's types to compile and
test locally. aer handles this with package files. `aer package create -o <file> <source-path>…`
compiles source into a `.pkg` of "schema and compiled code". `aer test --package <file>` or
`--package-dir <dir>` loads it, and so does `aer package create` itself, for type checking.

The `.pkg` has to match the version the consumer has installed. A `.pkg` built from `main`
describes classes and method signatures the installed `04t` may not have. Today a consumer's only
option is to check out the dependency's repo at the right tag and build the `.pkg` themselves.

`simply-cicd` already knows, at the moment a package version is born, which source produced it.
[0037](0037-utam-page-objects-publish.md) used that to publish UTAM page objects per version. This
doc does the same for aer: every Unlocked Package version gets a matching `.pkg`, built by the same
pipeline and uploaded to an artifact repository (Artifactory, Nexus, GitLab generic packages, …)
under a path derived from the Salesforce version number.

## Decision

Add `sf simply cicd build publish-aer-package`. It runs after `create-package-version` in the
`package` stage, as a separate job, the same way `publish-utam-page-objects` does. It:

1. resolves the `04t` and its version number, using 0037's resolution order and version mapping;
2. downloads the `.pkg` files of the package's dependencies;
3. runs `aer package create` over the default package directory in a throwaway staging directory;
4. uploads the `.pkg` with one HTTP `PUT` to a URL rendered from a template;
5. appends the resulting URL and version to the dotenv file the packaging stage already hands
   downstream.

The logic lives in `simply-cicd-core` (`build/publishAerPackage.ts`). The command in `simply-cicd`
is a thin flag-parsing wrapper, per [0056](0056-simply-cicd-core-common.md).

The upload is a plain `PUT`, not npm and not a per-vendor client. Artifactory generic repos, Nexus
raw repos, GitLab's generic package registry, and S3 presigned URLs all accept `PUT <url>` with a
body and an auth header. One template flag covers all of them, and the command carries no vendor
SDK.

The command does not choose what goes into the `.pkg`. It passes the default package directory to
`aer package create`, and what goes into the `.pkg` is aer's decision.

### What the spike established

These were measured with `aer v1.4.45` (windows/amd64, from `octoberswimmer/aer-dist`, SHA-256
checked) against a two-package fixture, so the design rests on observed behavior. aer's docs don't
cover most of this.

| Question                                  | Observed                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aer package create` flags                | Only `-o/--output` (required), `--package`, and `--package-dir`. It has no version flag and no namespace flag, and it doesn't read `sfdx-project.json`.                                                                                                                                                                       |
| **Namespace**                             | **Taken from the output file name.** It must be `<namespace>.pkg` or `<package>@<namespace>.pkg`, with each part matching `[A-Za-z][A-Za-z0-9_]*`. `Dep.pkg` and `Dep@dep.pkg` work. `Dep@.pkg` (empty namespace) and `Dep-1.2.3-4.pkg` are rejected. Every `.pkg` has a namespace. A package without one can't be expressed. |
| Version inside the `.pkg`                 | `aer package list` reports `Version: 1.0.0` regardless of `sfdx-project.json`. It can't be set, so the version lives **only in the repository path**, never in the file name.                                                                                                                                                 |
| Missing dependency types                  | **Fatal.** `type check errors: "App.AppSvc", line 2: Error Variable does not exist: DepUtil`, exit 1, no `.pkg` written. `create` has no `--skip-errors`.                                                                                                                                                                     |
| Unqualified reference to a `.pkg`'s class | Fails, both in `create` and in `test`, even with the `.pkg` loaded. A reference resolves only as `Dep.DepUtil`. `aer test -d/--default-namespace Dep --package Dep.pkg app` does resolve it, because the consumer's code is treated as part of `Dep`. `create` has no `-d`.                                                   |
| Plain source directories                  | `aer test dep app` (two source directories, no `.pkg`) resolves unqualified cross-directory references and passes.                                                                                                                                                                                                            |
| License                                   | `package create`, `package list`, and `test` all ran with no license installed (`aer license show`: "license key not provided"). October Swimmer's docs still require a CI license for CI (`AER_LICENSE_KEY`).                                                                                                                |
| `aer --version`                           | Prints `aer version v1.4.45`.                                                                                                                                                                                                                                                                                                 |
| Binary resolution in the sf plugin        | The order is `AER_BIN`, then the plugin's download cache (`aer-sf-plugin/aer-bin/` under `LOCALAPPDATA`, `XDG_DATA_HOME`, or Application Support), then `aer` on `PATH`. Failing all three, it downloads the latest GitHub release (`--install-aer`).                                                                         |

The namespace and unqualified-reference rows matter most. They mean a `.pkg` models a
**namespaced** package. An Unlocked Package without a namespace can still be published, but its
consumers have to run `aer test -d <namespace>`, and only one such dependency can be "the default
namespace" at a time. See [Packages without a namespace](#packages-without-a-namespace).

## Behavior

### Command

```
sf simply cicd build publish-aer-package
  --packaging-devhub <alias>
  --repository-url <url template>
  [--repository-header "<Name>: <value>"]
  [--subscriber-package-version-id <04t>]
  [--dependency-package-dir <dir>]...
  [--ci-commit-ref-name <ref>] [--package-release-branch-prefix <prefix>]
  [--aer-path <path>] [--dry-run] [--out <file>] [--env-file <file>]
  [--debug] [--disabled] [--json]
```

| Flag                              | Env var                                     | Required | Purpose                                                                                                                                        |
| --------------------------------- | ------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--packaging-devhub`              | `SIMPLY_CICD_PACKAGING_DEVHUB`              | yes      | For `sf package version report` and the `Package2` namespace lookup, as on `create-package-version`.                                           |
| `--repository-url`                | `SIMPLY_CICD_AER_REPOSITORY_URL`            | yes\*    | URL template the `.pkg` is `PUT` to (placeholders below). \*Or `plugins.simply.aer.repositoryUrl`.                                             |
| `--repository-header`             | `SIMPLY_CICD_AER_REPOSITORY_HEADER`         | no       | One `Name: value` header sent on `HEAD`, `GET`, and `PUT`, e.g. `Authorization: Bearer …`, `X-JFrog-Art-Api: …`, `JOB-TOKEN: …`. Never logged. |
| `--subscriber-package-version-id` | — (0037's resolution order)                 | no       | The `04t` to build for.                                                                                                                        |
| `--dependency-package-dir`        | —                                           | no       | Extra directories of `.pkg` files passed to aer as `--package-dir`, typically committed `aer package mock` output for managed packages.        |
| `--ci-commit-ref-name`            | `SIMPLY_CICD_CI_COMMIT_REF_NAME`            | no       | With `--package-release-branch-prefix`, reproduces the git tag suffix, as in 0037.                                                             |
| `--package-release-branch-prefix` | —                                           | no       | As on `create-package-version`.                                                                                                                |
| `--aer-path`                      | `AER_BIN`                                   | no       | The aer binary. Otherwise the sf plugin's resolution order is used (below).                                                                    |
| `--dry-run`                       | —                                           | no       | Build the `.pkg` and copy it to the project root, but upload nothing. Dependencies are still downloaded.                                       |
| `--out` / `--env-file`            | —                                           | no       | As in 0037. Both default to `subscriberPackageVersionId.env`.                                                                                  |
| `--debug`, `--disabled`           | `SIMPLY_CICD_DEBUG`, `SIMPLY_CICD_DISABLED` | no       | Standard build-command guards.                                                                                                                 |

`--repository-header` takes the whole header, not only a token, because every repository names
its header differently: Artifactory accepts `Authorization: Bearer` or `X-JFrog-Art-Api`, GitLab
uses `JOB-TOKEN` or `PRIVATE-TOKEN`, and Nexus uses `Authorization: Basic`. One opaque CI secret
covers all of them.

`--aer-path` reads `AER_BIN`, not a `SIMPLY_CICD_*` variable, so that one setting serves both this
command and `sf aer apex run test` in the same image.

### Finding aer

The order is `--aer-path`/`AER_BIN`, then the sf plugin's download cache, then `aer` on `PATH`.
That's the plugin's own order, minus its last step. A job image that has already run
`sf aer apex run test --install-aer`, or that ships the binary, works without extra configuration.
If none of those finds aer, the command fails with the plugin's install hint. It doesn't download
aer itself. See the alternatives.

`aer --version` is run once and logged, and the version is returned in `--json` output as
`aerVersion`.

### Namespace and file name

aer reads a package's namespace from its file name, so the published file name **is** the
contract. It is always `<package>@<namespace>.pkg`:

| `sfdx-project.json`                          | Namespace used                 | File                      |
| -------------------------------------------- | ------------------------------ | ------------------------- |
| `"namespace": "acme"`                        | `acme`                         | `MyPackage@acme.pkg`      |
| no namespace, default package `MyPackage`    | `MyPackage`                    | `MyPackage@MyPackage.pkg` |
| no namespace, package name not an identifier | sanitized: `My-Pkg` → `My_Pkg` | `My_Pkg@My_Pkg.pkg`       |

The `<package>` part is the default package directory's `package`, sanitized the same way. The
command validates both parts against aer's rule before building. A name that still doesn't fit
after sanitizing fails with aer's rule quoted.

There's deliberately no override for the no-namespace fallback. A dependent repo has to compute
the same file name to download a dependency, and it can only do that if the rule is fixed.

### URL template

| Placeholder       | Value for `1.2.3.4` on `release/x` (no suffix) | Value for `1.2.3.4` built from `beta` |
| ----------------- | ---------------------------------------------- | ------------------------------------- |
| `{name}`          | `MyPackage`                                    | `MyPackage`                           |
| `{version}`       | `1.2.3-4`                                      | `1.2.3-4.beta`                        |
| `{versionNumber}` | `1.2.3.4`                                      | `1.2.3.4`                             |
| `{channel}`       | `latest`                                       | `beta`                                |
| `{namespace}`     | `acme`                                         | `acme`                                |
| `{file}`          | `MyPackage@acme.pkg`                           | `MyPackage@acme.pkg`                  |

`{version}` and `{channel}` use 0037's `toNpmVersion`/`toDistTag` mapping unchanged. A UTAM
package and an aer package from the same `04t` therefore carry the same version string. Values are
URL-encoded, so `@` becomes `%40` in the path. Repositories decode it, and the file lands under its
real name. An unknown placeholder, or a template whose rendered path could collide across versions
(no `{version}` and no `{versionNumber}`), fails the job before anything is built.

Examples:

```
# Artifactory generic repo
https://acme.jfrog.io/artifactory/aer-local/{name}/{version}/{file}
# GitLab generic packages
${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/packages/generic/{name}/{version}/{file}
# Nexus raw
https://nexus.acme.com/repository/aer-raw/{name}/{version}/{file}
```

### Dependencies

Missing types are fatal to `aer package create`, so every Apex dependency has to be on hand before
the build. For each entry in the default package directory's `dependencies`:

| Dependency kind                                                                                    | How its `.pkg` is staged                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Another Unlocked Package in this Dev Hub (its alias resolves to a `04t` the Dev Hub can report on) | Its version number comes from `sf package version report`, and its namespace from `Package2.NamespacePrefix`, with the same fallback as above. The command renders the same URL template for it, `GET`s the file into `<staging>/dependencies/<file>`, and passes that directory as `--package-dir`. A 404 fails the job and names the URL. |
| Anything else (managed package, a package from another Dev Hub)                                    | Not fetched. It has to be in a `--dependency-package-dir`, typically committed `aer package mock <namespace>` output.                                                                                                                                                                                                                       |

Before running aer, the command logs which dependencies it staged and which it expects from
`--dependency-package-dir`. If aer then fails with a type error, the log already shows the likely
missing package. The command doesn't try to guess which managed packages contain Apex. aer is the
authority on what fails to resolve.

This needs no dependency config. It assumes every package in the chain publishes to one repository
under one template, which is the expected setup for a team adopting the job across its packages.

### Packages without a namespace

A `.pkg` always has a namespace, and `create` resolves a reference into a `.pkg` only when it's
qualified. That has two consequences for Unlocked Packages without a namespace, which are the
common case:

- **Publishing one works.** It becomes `MyPackage@MyPackage.pkg`. A consumer runs
  `aer test -d MyPackage --package MyPackage@MyPackage.pkg <their source>`, so their unqualified
  references resolve. The guide documents this.
- **Building one that depends on another no-namespace package doesn't.** The dependent's source
  calls `DepUtil.twice(…)` unqualified, `create` has no `-d`, and the build fails with a type error.
  The command can't work around that without editing source. It detects the case up front (default
  package has no namespace, and an own-Dev-Hub dependency also has none) and fails with a message
  that says so, rather than letting aer's type error look like a broken dependency. The case needs
  a `--default-namespace` on `aer package create`, which is an upstream request (open question 1).

### Skip guards, in order

1. `getSkipReason('publish-aer-package')`: `PACKAGE_CHANGED=FALSE` skips. The job is added to
   `PACKAGE_CHANGED_GATED_JOBS`.
2. `--disabled`.
3. No `04t` can be resolved: warn and skip, as in 0037.
4. No `.cls`/`.trigger` under the default package directory: info-level skip. A metadata-only
   package has nothing for aer to compile.
5. `HEAD <rendered url>` returns 2xx: info-level skip, `alreadyPublished: true`, dotenv still
   written. This makes a retried job succeed. Any other status means the URL is not published yet.
   Real auth problems then surface on the `PUT`.

Everything after the guards throws. That covers the no-namespace dependency case, an aer type
error (aer's stderr goes into the error), a dependency 404, and a non-2xx `PUT`. A missing `.pkg`
silently breaks every consumer pinned to that version.

### Build

In a `fs.mkdtemp` directory prefixed `simply-cicd-aer-`, never inside the repo:

```
<aer> package create -o <staging>/<file> \
  [--package-dir <staging>/dependencies] [--package-dir <each --dependency-package-dir>] \
  <absolute default package directory>
```

The environment is passed through, so `AER_LICENSE_KEY` reaches aer. `AER_NO_RC=1` is set so that a
developer's `~/.aerrc`, or a repo `.aerrc` meant for `aer test`, can't change what gets published.

### Upload

`PUT <url>` with the file as the body, `Content-Type: application/octet-stream`, the
`--repository-header`, and `X-Checksum-Sha256: <hex>`. Artifactory verifies that checksum and
rejects a corrupted upload, and other repositories ignore the header. Non-2xx fails the job with
the status and the first 500 bytes of the body.

### Output

Appends to `--out`:

```
AER_PACKAGE_URL=https://acme.jfrog.io/artifactory/aer-local/MyPackage/1.2.3-4/MyPackage%40acme.pkg
AER_PACKAGE_FILE=MyPackage@acme.pkg
AER_PACKAGE_VERSION=1.2.3-4
```

A consumer has to save the download under `AER_PACKAGE_FILE`, because aer reads the namespace from
it. `--json` returns
`{ skipped, published, alreadyPublished?, packageName?, namespace?, version?, url?, file?, aerVersion? }`.
`file` is the local path on `--dry-run`.

### Pipeline

```yaml
publish-aer-package:
  stage: package
  needs: [create-package-version]
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  before_script:
    - sf org login jwt --alias packaging-devhub … # same login as create-package-version
  script:
    - sf simply cicd build publish-aer-package
      --packaging-devhub packaging-devhub
      --ci-commit-ref-name $CI_COMMIT_REF_NAME
      --package-release-branch-prefix release/
  variables:
    SIMPLY_CICD_AER_REPOSITORY_URL: https://acme.jfrog.io/artifactory/aer-local/{name}/{version}/{file}
    AER_BIN: /usr/local/bin/aer # baked into the image, pinned version
    # SIMPLY_CICD_AER_REPOSITORY_HEADER and AER_LICENSE_KEY: masked CI/CD variables
```

### `sfdx-project.json`

```json
"plugins": {
  "simply": {
    "aer": {
      "repositoryUrl": "https://acme.jfrog.io/artifactory/aer-local/{name}/{version}/{file}"
    }
  }
}
```

This is optional, and the flag and environment variable take precedence. It lives here so that a
producer's upload and a dependent's download agree on one template without every pipeline
repeating it.

## Alternatives considered

**Wrap the `.pkg` in an npm package and reuse `npm publish`.** Rejected. Artifactory and GitLab
both host npm, so this would reuse 0037's whole publish path. But aer consumers aren't Node
projects, so `npm install`-ing a binary blob into `node_modules` to feed `aer test --package-dir` is
a detour. A generic `PUT` reaches every repository type a team already has.

**Choose which classes go into the `.pkg`**, for example by excluding `@IsTest` classes or applying
`.forceignore`. Rejected. `aer package create` already builds the package from a source directory,
and it owns what's in the result.

**Put the version in the file name** (`MyPackage-1.2.3-4.pkg`). Rejected, because aer reads the
namespace from the file name and refuses that name. The version can't be stamped inside the `.pkg`
either, so it lives in the path.

**Publish source (a zip of the package directory) instead of a `.pkg`**, since `aer test dep app`
resolves unqualified references across plain directories. Rejected for this job, which is asked to
publish aer packages. It's also the only current answer for no-namespace dependency chains, so it
is noted in open question 1 as the fallback if aer doesn't add `create --default-namespace`.

**Download aer in the command** (the sf plugin's `--install-aer`). Rejected. The plugin always
takes the _latest_ release, so the published `.pkg` format would change under a pipeline with no
code change. A pinned binary in the image (or `AER_BIN`) is reproducible. Reusing the plugin's
cache still lets a team that prefers the plugin's download do so in a `before_script`.

**Vendor clients (JFrog CLI, Nexus API).** Rejected. Each adds a dependency or a binary for a
single `PUT`.

**Fold into `publish-utam-page-objects`.** Rejected. The two have different tools, licenses, and
destinations, and a team may adopt one without the other. They share code instead: see the
implementation plan.

## Implementation plan

`simply-plugins-core/packages/simply-cicd-core`:

1. `build/packageVersionArtifact.ts`: move the artifact-agnostic helpers out of
   `utamPageObjects.ts`. These are `resolveSubscriberPackageVersionId`, `readEnvFileValue`,
   `sanitizePrereleaseId`, `toNpmVersion`, `toDistTag`, and `SUBSCRIBER_PACKAGE_VERSION_ID_KEY`.
   `utamPageObjects.ts` re-exports them, so its public surface is unchanged.
2. `sfPackages.ts`: add `getPackageNamespace(package2Id, devHub)`, a `Package2.NamespacePrefix`
   query.
3. `build/aerPackage.ts`: pure helpers. These are `readAerPluginConfig`, `toAerIdentifier`
   (sanitize and validate against aer's rule), `toAerPackageFile`, `renderRepositoryUrl`,
   `parseRepositoryHeader`, `findApexSources`, and `classifyDependencies`.
4. `build/aerBinary.ts`: `resolveAerBinary` (the order above) and `readAerVersion`.
5. `build/publishAerPackage.ts`: the flow, shaped like `publishUtamPageObjects.ts`. It contains
   `resolveTarget`, `stageDependencies` (`GET`), `buildPackage` (`execa` of aer), `isAlreadyPublished`
   (`HEAD`), and `upload` (`PUT` via `fetch`, with SHA-256).
6. `skipGuard.ts`: add `publish-aer-package` to `PACKAGE_CHANGED_GATED_JOBS`.
7. `index.ts`: export `publishAerPackage` and its option and result types.

`simply-plugins/packages/simply-cicd`:

8. `src/commands/simply/cicd/build/publish-aer-package.ts` and
   `messages/simply.cicd.build.publish-aer-package.md`.
9. `command-snapshot.json`, README (`pnpm run readme`), and the site pages:
   `reference/build.md`, `concepts/environment-variables.md`, `concepts/sfdx-project-fields.md`,
   a new `guides/aer-packages.md` (including the consumer side, `aer test -d`), and the job in
   `guides/gitlab-ci-pipeline.md`.
10. Bump `simply-cicd-core`.

## Testing

Core unit tests, with `execa` and `fetch` stubbed as `publishUtamPageObjects.test.ts` does:

- `toAerIdentifier` and `toAerPackageFile`: a namespace from `sfdx-project.json`; the no-namespace
  fallback; sanitizing (`My-Pkg` → `My_Pkg`, a leading digit); and a rejection that quotes aer's
  rule.
- URL rendering for each placeholder, `@` and `/` encoding, the unknown-placeholder error, and the
  "no version in template" error.
- Header parsing: `Name: value` with colons in the value; a malformed header throws; the value
  never appears in logs.
- Each skip guard, in order. `HEAD` 200 gives `alreadyPublished` with dotenv written, and `HEAD`
  404/401 proceeds.
- Dependency classification: an own-Dev-Hub `04t` is `GET` from the rendered URL into
  `dependencies/<file>`; a 404 throws naming the URL; a foreign or managed package is logged as
  expected from `--dependency-package-dir`; a no-namespace package depending on a no-namespace
  package throws the dedicated message.
- aer binary resolution: `--aer-path`, then `AER_BIN`, then the plugin cache, then `PATH`, then the
  not-found error.
- aer argv and environment: output path, every `--package-dir`, the absolute source path, and
  `AER_NO_RC=1`. A non-zero exit throws with aer's stderr.
- `PUT` sends `X-Checksum-Sha256`. Non-2xx throws with status and body excerpt, and 2xx appends
  all three dotenv keys.
- `--dry-run` copies the `.pkg` to the project root and makes no `PUT`.
- `utamPageObjects` re-exports still resolve (guards the helper move).

Plus one core test that runs the real binary when `AER_BIN` is set, and skips otherwise. It builds
the spike's two-package fixture, checks `aer package list` reports the expected namespace, and
asserts the unqualified-dependency type error. Then a future aer release that changes the
file-name rule or adds `-d` to `create` shows up as a failing test, not a broken pipeline.

Plugin: the usual flag-wiring test plus the command snapshot.

## Open questions

1. **No-namespace dependency chains.** These need `aer package create --default-namespace` (or
   equivalent) from October Swimmer. Until then, the job fails clearly for that case. Decide whether
   to raise it on `octoberswimmer/aer-dist`, and whether a source-zip fallback is worth a later
   design.
2. **Has a no-namespace package published as `MyPackage@MyPackage.pkg` been tested from a real
   consumer repo** with `aer test -d MyPackage` alongside a second, namespaced `.pkg`? The spike
   covered one dependency only.
