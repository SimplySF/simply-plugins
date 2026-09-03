# @simplysf/simply-cicd

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-cicd?label=@simplysf/simply-cicd)](https://npmjs.com/@simplysf/simply-cicd) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-cicd.svg)](https://npmjs.com/@simplysf/simply-cicd) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-cicd
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-plugins/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-plugins) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-plugins/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-plugins/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply cicd build cleanup-scratch-orgs`](#sf-simply-cicd-build-cleanup-scratch-orgs)
- [`sf simply cicd build create-fallback-tag`](#sf-simply-cicd-build-create-fallback-tag)
- [`sf simply cicd build create-package-version`](#sf-simply-cicd-build-create-package-version)
- [`sf simply cicd build create-scratch`](#sf-simply-cicd-build-create-scratch)
- [`sf simply cicd build delete-scratch`](#sf-simply-cicd-build-delete-scratch)
- [`sf simply cicd build determine-package-changes`](#sf-simply-cicd-build-determine-package-changes)
- [`sf simply cicd build generate-flexipage-diff`](#sf-simply-cicd-build-generate-flexipage-diff)
- [`sf simply cicd build generate-flow-diff`](#sf-simply-cicd-build-generate-flow-diff)
- [`sf simply cicd build install-dependencies`](#sf-simply-cicd-build-install-dependencies)
- [`sf simply cicd build lwc-jest`](#sf-simply-cicd-build-lwc-jest)
- [`sf simply cicd build push-scratch`](#sf-simply-cicd-build-push-scratch)
- [`sf simply cicd build test-scratch`](#sf-simply-cicd-build-test-scratch)
- [`sf simply cicd deploy happy-soup deploy-unpackaged`](#sf-simply-cicd-deploy-happy-soup-deploy-unpackaged)
- [`sf simply cicd deploy happy-soup deployment-close-out`](#sf-simply-cicd-deploy-happy-soup-deployment-close-out)
- [`sf simply cicd deploy happy-soup install-packaged`](#sf-simply-cicd-deploy-happy-soup-install-packaged)
- [`sf simply cicd deploy happy-soup post-deploy`](#sf-simply-cicd-deploy-happy-soup-post-deploy)
- [`sf simply cicd deploy happy-soup post-destructive`](#sf-simply-cicd-deploy-happy-soup-post-destructive)
- [`sf simply cicd deploy happy-soup pre-destructive`](#sf-simply-cicd-deploy-happy-soup-pre-destructive)
- [`sf simply cicd deploy happy-soup tag-deployment`](#sf-simply-cicd-deploy-happy-soup-tag-deployment)
- [`sf simply cicd deploy happy-soup validate`](#sf-simply-cicd-deploy-happy-soup-validate)
- [`sf simply cicd deploy project deploy-unpackaged`](#sf-simply-cicd-deploy-project-deploy-unpackaged)
- [`sf simply cicd deploy project install-packaged`](#sf-simply-cicd-deploy-project-install-packaged)
- [`sf simply cicd deploy project post-deploy`](#sf-simply-cicd-deploy-project-post-deploy)
- [`sf simply cicd deploy project post-destructive`](#sf-simply-cicd-deploy-project-post-destructive)
- [`sf simply cicd deploy project pre-destructive`](#sf-simply-cicd-deploy-project-pre-destructive)
- [`sf simply cicd deploy project run-apex-tests`](#sf-simply-cicd-deploy-project-run-apex-tests)
- [`sf simply cicd deploy project validate`](#sf-simply-cicd-deploy-project-validate)
- [`sf simply cicd deploy validate`](#sf-simply-cicd-deploy-validate)
- [`sf simply cicd notify happy-soup`](#sf-simply-cicd-notify-happy-soup)
- [`sf simply cicd notify project`](#sf-simply-cicd-notify-project)
- [`sf simply cicd notify teams`](#sf-simply-cicd-notify-teams)
- [`sf simply cicd sfdx-dependabot`](#sf-simply-cicd-sfdx-dependabot)

## `sf simply cicd build cleanup-scratch-orgs`

Delete scratch orgs older than 3 hours from every configured Dev Hub.

```
USAGE
  $ sf simply cicd build cleanup-scratch-orgs --dev-hub <value>... [--json] [--flags-dir <value>] [--debug] [--disabled]

FLAGS
  --debug               [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --dev-hub=<value>...  (required) Alias of a Dev Hub. Must already be authenticated. Repeat this flag for each Dev Hub
                        to try, in order.
  --disabled            [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Delete scratch orgs older than 3 hours from every configured Dev Hub.

  For each Dev Hub, queries `ActiveScratchOrg` records created more than 3 hours ago and bulk-deletes them. Useful for
  keeping a shared Dev Hub's scratch org allotment from being exhausted by abandoned CI runs. Every `--dev-hub` alias
  must already be authenticated.

EXAMPLES
  $ sf simply cicd build cleanup-scratch-orgs --dev-hub my-devhub
```

_See code: [lib/commands/simply/cicd/build/cleanup-scratch-orgs.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/cleanup-scratch-orgs.js)_

## `sf simply cicd build create-fallback-tag`

Create a fallback git tag carrying forward the previous package version's ID, for builds that didn't produce a new package version.

```
USAGE
  $ sf simply cicd build create-fallback-tag --ci-commit-ref-name <value> --ci-pipeline-id <value> --ci-project-path <value>
    --project-access-token <value> [--json] [--flags-dir <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]
    [--debug] [--disabled] [--last-tag <value>] [--out <value>]

FLAGS
  --ci-commit-ref-name=<value>    (required) [env: SIMPLY_CICD_CI_COMMIT_REF_NAME] Git branch or ref name being built.
  --ci-pipeline-id=<value>        (required) [env: SIMPLY_CICD_CI_PIPELINE_ID] CI pipeline ID, used to name the
                                  temporary authenticated git remote.
  --ci-project-path=<value>       (required) [env: SIMPLY_CICD_CI_PROJECT_PATH] CI project's git path (e.g.
                                  group/project), used to build the authenticated git remote URL.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                      [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                  running it.
  --last-tag=<value>              Manually specify the last tag to increment, instead of resolving it from git.
  --out=<value>                   [default: subscriberPackageVersionId.env] Output dotenv file path.
  --project-access-token=<value>  (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] Access token used to authenticate
                                  git remote operations (tagging, pushing).
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance hosting this project.
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The VCS platform hosting this
                                  project.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a fallback git tag carrying forward the previous package version's ID, for builds that didn't produce a new
  package version.

  Resolves the last tag to increment (either `--last-tag`, or the closest reachable tag matching the project's version
  prefix), extracts its annotated `04t` package version ID, and creates/pushes a new tag with an incremented numeric
  suffix (e.g. `v1.1.0` -> `v1.1.0-1` -> `v1.1.0-2`) annotated with that same package ID. Soft no-ops (does not error)
  when no last tag, or no valid package ID within it, can be found — a build with nothing to fall back to just has
  nothing to do here.

  Skipped automatically when `PACKAGE_CHANGED=TRUE` is set in the environment (see `build determine-package-changes`) —
  a real package version will be created instead.

EXAMPLES
  $ sf simply cicd build create-fallback-tag --ci-commit-ref-name main --ci-project-path group/project --project-access-token glpat-... --ci-pipeline-id 123
```

_See code: [lib/commands/simply/cicd/build/create-fallback-tag.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/create-fallback-tag.js)_

## `sf simply cicd build create-package-version`

Create a new package version, verify minimum code coverage, and create/push a version-tracking git tag.

```
USAGE
  $ sf simply cicd build create-package-version --ci-commit-ref-name <value> --ci-pipeline-id <value> --ci-project-path <value>
    --project-access-token <value> --ci-commit-sha <value> --ci-pipeline-url <value> --packaging-devhub <value> [--json]
    [--flags-dir <value>] [--vcs-host <value>] [--vcs-provider github|gitlab] [--debug] [--disabled]
    [--ci-pipeline-source <value>] [--always-create-package] [--code-coverage-minimum <value>]
    [--package-release-branch-prefix <value>]

FLAGS
  --always-create-package                  Create a package version even when this isn't a release-branch build.
  --ci-commit-ref-name=<value>             (required) [env: SIMPLY_CICD_CI_COMMIT_REF_NAME] Git branch or ref name being
                                           built.
  --ci-commit-sha=<value>                  (required) [env: SIMPLY_CICD_CI_COMMIT_SHA] Commit SHA to tag as the package
                                           version's source.
  --ci-pipeline-id=<value>                 (required) [env: SIMPLY_CICD_CI_PIPELINE_ID] CI pipeline ID, used to name the
                                           temporary authenticated git remote.
  --ci-pipeline-source=<value>             [env: SIMPLY_CICD_CI_PIPELINE_SOURCE] Source trigger of the CI pipeline (e.g.
                                           merge_request_event). When set to merge_request_event, package creation is
                                           skipped.
  --ci-pipeline-url=<value>                (required) [env: SIMPLY_CICD_CI_PIPELINE_URL] URL of the CI pipeline, used as
                                           the package version's description.
  --ci-project-path=<value>                (required) [env: SIMPLY_CICD_CI_PROJECT_PATH] CI project's git path (e.g.
                                           group/project), used to build the authenticated git remote URL.
  --code-coverage-minimum=<value>          [default: 75] Minimum Apex code coverage percentage required for the new
                                           package version.
  --debug                                  [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                               [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead
                                           of running it.
  --package-release-branch-prefix=<value>  Prefix identifying release branches. Determines whether this build creates a
                                           package version and how the resulting git tag is named.
  --packaging-devhub=<value>               (required) [env: SIMPLY_CICD_PACKAGING_DEVHUB] Alias of the Dev Hub used for
                                           packaging operations like package version creation. Must already be
                                           authenticated.
  --project-access-token=<value>           (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] Access token used to
                                           authenticate git remote operations (tagging, pushing).
  --vcs-host=<value>                       [env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance hosting this
                                           project.
  --vcs-provider=<option>                  [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The VCS platform hosting
                                           this project.
                                           <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a new package version, verify minimum code coverage, and create/push a version-tracking git tag.

  Skips entirely (without error) when the pipeline was triggered by a merge request, or when this isn't a release-branch
  build and `--always-create-package` wasn't passed. Otherwise, creates a new version of the default package directory's
  package, polls until creation finishes, verifies the resulting version's Apex code coverage meets
  `--code-coverage-minimum` (or the project's own `plugins.simply.coverageRequirement.minimumCoverageRequired`, if
  declared in `sfdx-project.json`), and creates/pushes a git tag annotated with the new package version's `04t` ID.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build create-package-version --ci-commit-ref-name main --ci-commit-sha a1b2c3d --ci-pipeline-id 123 --ci-pipeline-url https://gitlab.example.com/pipelines/123 --ci-project-path group/project --project-access-token glpat-... --packaging-devhub my-packaging-devhub
```

_See code: [lib/commands/simply/cicd/build/create-package-version.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/create-package-version.js)_

## `sf simply cicd build create-scratch`

Create a scratch org, trying each configured Dev Hub in order.

```
USAGE
  $ sf simply cicd build create-scratch --dev-hub <value>... [--json] [--flags-dir <value>] [--debug] [--disabled]
    [--scratch-definition-file <value>] [--scratch-duration-days <value>]

FLAGS
  --debug                            [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --dev-hub=<value>...               (required) Alias of a Dev Hub. Must already be authenticated. Repeat this flag for
                                     each Dev Hub to try, in order.
  --disabled                         [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                     running it.
  --scratch-definition-file=<value>  Definition file used to create the scratch org, if not specified in
                                     sfdx-project.json.
  --scratch-duration-days=<value>    [default: 1] Duration of the scratch org in days.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a scratch org, trying each configured Dev Hub in order.

  Reads the default package directory's `definitionFile` from `sfdx-project.json` (falling back to
  `--scratch-definition-file`), and attempts creation against each `--dev-hub` alias in order (each must already be
  authenticated). A Dev Hub that has hit its daily scratch org limit is skipped in favor of the next one. Writes the
  resulting org's auth fields to `SCRATCH_ORG_INFO.json` for later build steps, best-effort sets a default
  `CountryCode`, and assigns any permission sets/licenses declared under the default package directory's
  `packageMetadataAccess`.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build create-scratch --dev-hub my-devhub
```

_See code: [lib/commands/simply/cicd/build/create-scratch.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/create-scratch.js)_

## `sf simply cicd build delete-scratch`

Delete the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build delete-scratch --dev-hub <value> [--json] [--flags-dir <value>] [--jwt-key-file <value>] [--debug]
    [--disabled]

FLAGS
  --debug                 [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --dev-hub=<value>       (required) Alias of a Dev Hub. Must already be authenticated. Repeat this flag for each Dev
                          Hub to try, in order.
  --disabled              [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.
  --jwt-key-file=<value>  [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used to re-authenticate the
                          scratch org (or its Dev Hub) when it was JWT-authenticated. Not needed when the Dev Hub was
                          authenticated via web login or an SFDX auth URL — the scratch org's own refresh token is used
                          instead.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Delete the scratch org created by `build create-scratch`.

  Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`) to confirm `--dev-hub` is the Dev Hub that owns the
  scratch org, re-authenticates to it and the scratch org as needed, and deletes it. Deletion failures are logged rather
  than thrown, since a scratch org left behind after a failed deletion just needs manual cleanup and shouldn't fail an
  otherwise-successful pipeline run.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build delete-scratch --dev-hub my-devhub
```

_See code: [lib/commands/simply/cicd/build/delete-scratch.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/delete-scratch.js)_

## `sf simply cicd build determine-package-changes`

Determine if any package-relevant files have changed since the last release tag.

```
USAGE
  $ sf simply cicd build determine-package-changes [--json] [--flags-dir <value>] [--debug] [--disabled] [--out <value>]

FLAGS
  --debug        [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled     [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.
  --out=<value>  [default: changes.env] Output dotenv file path.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Determine if any package-relevant files have changed since the last release tag.

  Reads the default package directory from `sfdx-project.json`, finds the closest reachable git tag matching its version
  prefix, and diffs that tag against `HEAD` for the package directory and `sfdx-project.json` itself. Writes
  `PACKAGE_CHANGED=TRUE|FALSE` and `LAST_TAG=<tag>` to the output file. Any failure during detection (missing/invalid
  sfdx-project.json, git errors) defaults to `PACKAGE_CHANGED=TRUE`, so a build never silently skips work it should have
  done.

EXAMPLES
  $ sf simply cicd build determine-package-changes --out changes.env
```

_See code: [lib/commands/simply/cicd/build/determine-package-changes.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/determine-package-changes.js)_

## `sf simply cicd build generate-flexipage-diff`

Generate a Flexipage delta between two commits and post the results to the change request.

```
USAGE
  $ sf simply cicd build generate-flexipage-diff --from <value> --to <value> --project-access-token <value> [--json] [--flags-dir <value>]
    [--vcs-host <value>] [--vcs-provider github|gitlab] [--ci-project-id <value>] [--ci-merge-request-iid <value>]
    [--ci-repository <value>] [--ci-pull-request-number <value>] [--ci-run-id <value>] [--ci-server-url <value>]
    [--ci-commit-sha <value>] [--out <value>] [--debug] [--disabled]

FLAGS
  --ci-commit-sha=<value>           [env: SIMPLY_CICD_CI_COMMIT_SHA] Commit SHA to attribute the posted diff to.
  --ci-merge-request-iid=<value>    [env: SIMPLY_CICD_CI_MERGE_REQUEST_IID] GitLab only: internal ID of the merge
                                    request to post the diff to.
  --ci-project-id=<value>           [env: SIMPLY_CICD_CI_PROJECT_ID] GitLab only: numeric CI project ID of the project
                                    to post the diff to.
  --ci-pull-request-number=<value>  [env: SIMPLY_CICD_CI_PULL_REQUEST_NUMBER] GitHub only: number of the pull request to
                                    post the diff to.
  --ci-repository=<value>           [env: SIMPLY_CICD_CI_REPOSITORY] GitHub only: repository to post the diff to, as
                                    owner/repo.
  --ci-run-id=<value>               [env: SIMPLY_CICD_CI_RUN_ID] GitHub only: Actions run ID, used to build links back
                                    to the run's artifacts.
  --ci-server-url=<value>           [env: SIMPLY_CICD_CI_SERVER_URL] GitHub only: server URL, for instances other than
                                    github.com.
  --debug                           [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                        [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                    running it.
  --from=<value>                    (required) Base commit SHA to diff from.
  --out=<value>                     Output directory or file path for the delta results.
  --project-access-token=<value>    (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] Project access token used to post
                                    the diff results back to the merge request.
  --to=<value>                      (required) Head commit SHA to diff to.
  --vcs-host=<value>                [env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance hosting this project.
  --vcs-provider=<option>           [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The VCS platform hosting this
                                    project.
                                    <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a Flexipage delta between two commits and post the results to the change request.

  Runs the upstream `flexipage-delta` binary to diff `**/*.flexipage-meta.xml` files between `--from` and `--to`, then
  the reporter binary for the platform `--vcs-provider` selects — `flexipage-delta-gitlab` or `flexipage-delta-github` —
  to post the results back to the merge or pull request. Failures are logged, not thrown — a diff-posting step shouldn't
  fail the build.

EXAMPLES
  $ sf simply cicd build generate-flexipage-diff --ci-project-id 123 --ci-merge-request-iid 45 --from abc123 --to def456 --project-access-token glpat-...

  $ sf simply cicd build generate-flexipage-diff --vcs-provider github --ci-repository my-org/my-repo --ci-pull-request-number 45 --ci-run-id 987 --from abc123 --to def456 --project-access-token ghp-...
```

_See code: [lib/commands/simply/cicd/build/generate-flexipage-diff.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/generate-flexipage-diff.js)_

## `sf simply cicd build generate-flow-diff`

Generate a Flow delta between two commits and post the results to the change request.

```
USAGE
  $ sf simply cicd build generate-flow-diff --from <value> --to <value> --project-access-token <value> [--json] [--flags-dir <value>]
    [--vcs-host <value>] [--vcs-provider github|gitlab] [--ci-project-id <value>] [--ci-merge-request-iid <value>]
    [--ci-repository <value>] [--ci-pull-request-number <value>] [--ci-run-id <value>] [--ci-server-url <value>]
    [--ci-commit-sha <value>] [--out <value>] [--debug] [--disabled]

FLAGS
  --ci-commit-sha=<value>           [env: SIMPLY_CICD_CI_COMMIT_SHA] Commit SHA to attribute the posted diff to.
  --ci-merge-request-iid=<value>    [env: SIMPLY_CICD_CI_MERGE_REQUEST_IID] GitLab only: internal ID of the merge
                                    request to post the diff to.
  --ci-project-id=<value>           [env: SIMPLY_CICD_CI_PROJECT_ID] GitLab only: numeric CI project ID of the project
                                    to post the diff to.
  --ci-pull-request-number=<value>  [env: SIMPLY_CICD_CI_PULL_REQUEST_NUMBER] GitHub only: number of the pull request to
                                    post the diff to.
  --ci-repository=<value>           [env: SIMPLY_CICD_CI_REPOSITORY] GitHub only: repository to post the diff to, as
                                    owner/repo.
  --ci-run-id=<value>               [env: SIMPLY_CICD_CI_RUN_ID] GitHub only: Actions run ID, used to build links back
                                    to the run's artifacts.
  --ci-server-url=<value>           [env: SIMPLY_CICD_CI_SERVER_URL] GitHub only: server URL, for instances other than
                                    github.com.
  --debug                           [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                        [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                    running it.
  --from=<value>                    (required) Base commit SHA to diff from.
  --out=<value>                     Output directory or file path for the delta results.
  --project-access-token=<value>    (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] Project access token used to post
                                    the diff results back to the merge request.
  --to=<value>                      (required) Head commit SHA to diff to.
  --vcs-host=<value>                [env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance hosting this project.
  --vcs-provider=<option>           [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The VCS platform hosting this
                                    project.
                                    <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a Flow delta between two commits and post the results to the change request.

  Runs the upstream `flow-delta` binary to diff `**/*.flow-meta.xml` files between `--from` and `--to`, then the
  reporter binary for the platform `--vcs-provider` selects — `flow-delta-gitlab` or `flow-delta-github` — to post the
  results back to the merge or pull request. Failures are logged, not thrown — a diff-posting step shouldn't fail the
  build.

EXAMPLES
  $ sf simply cicd build generate-flow-diff --ci-project-id 123 --ci-merge-request-iid 45 --from abc123 --to def456 --project-access-token glpat-...

  $ sf simply cicd build generate-flow-diff --vcs-provider github --ci-repository my-org/my-repo --ci-pull-request-number 45 --ci-run-id 987 --from abc123 --to def456 --project-access-token ghp-...
```

_See code: [lib/commands/simply/cicd/build/generate-flow-diff.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/generate-flow-diff.js)_

## `sf simply cicd build install-dependencies`

Install packaged dependencies into the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build install-dependencies [--json] [--flags-dir <value>] [--jwt-key-file <value>] [--debug] [--disabled] [--install-type
    All|Delta|Upgrade]

FLAGS
  --debug                  [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled               [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.
  --install-type=<option>  [default: Upgrade] The type of dependency installation to perform.
                           <options: All|Delta|Upgrade>
  --jwt-key-file=<value>   [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used to re-authenticate the
                           scratch org (or its Dev Hub) when it was JWT-authenticated. Not needed when the Dev Hub was
                           authenticated via web login or an SFDX auth URL — the scratch org's own refresh token is used
                           instead.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install packaged dependencies into the scratch org created by `build create-scratch`.

  Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`), authenticates as that scratch org, and installs its
  packaged dependencies.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build install-dependencies --jwt-key-file ./server.key
```

_See code: [lib/commands/simply/cicd/build/install-dependencies.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/install-dependencies.js)_

## `sf simply cicd build lwc-jest`

Install the LWC Jest test libraries and run the project's LWC Jest tests with coverage.

```
USAGE
  $ sf simply cicd build lwc-jest [--json] [--flags-dir <value>] [--debug] [--disabled]

FLAGS
  --debug     [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled  [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install the LWC Jest test libraries and run the project's LWC Jest tests with coverage.

  Installs `@salesforce/sfdx-lwc-jest` and `@sa11y/jest`, then runs `sfdx-lwc-jest --coverage -- --passWithNoTests`.
  Failures are logged, not thrown.

EXAMPLES
  $ sf simply cicd build lwc-jest
```

_See code: [lib/commands/simply/cicd/build/lwc-jest.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/lwc-jest.js)_

## `sf simply cicd build push-scratch`

Push source to the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build push-scratch [--json] [--flags-dir <value>] [--jwt-key-file <value>] [--debug] [--disabled]
    [--ignore-warnings] [--scratch-org-source-dir <value>]

FLAGS
  --debug                           [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                        [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                    running it.
  --ignore-warnings                 Append --ignore-warnings to the underlying sf project deploy start call.
  --jwt-key-file=<value>            [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used to
                                    re-authenticate the scratch org (or its Dev Hub) when it was JWT-authenticated. Not
                                    needed when the Dev Hub was authenticated via web login or an SFDX auth URL — the
                                    scratch org's own refresh token is used instead.
  --scratch-org-source-dir=<value>  Source directory to push to the scratch org, in addition to the default package
                                    directory.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Push source to the scratch org created by `build create-scratch`.

  Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`), authenticates as that scratch org, strips metadata
  types the scratch org push doesn't support (Einstein Conversation Agent file types), and runs `sf project deploy
  start`. When `--scratch-org-source-dir` is given, also deploys the default package directory's `seedMetadata.path`, if
  declared in `sfdx-project.json`.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build push-scratch --jwt-key-file ./server.key
```

_See code: [lib/commands/simply/cicd/build/push-scratch.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/push-scratch.js)_

## `sf simply cicd build test-scratch`

Run Apex tests against the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build test-scratch [--json] [--flags-dir <value>] [--jwt-key-file <value>] [--debug] [--disabled]
    [--disable-apex-tests]

FLAGS
  --debug                 [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disable-apex-tests    Skip running Apex tests, without skipping the rest of the job.
  --disabled              [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.
  --jwt-key-file=<value>  [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used to re-authenticate the
                          scratch org (or its Dev Hub) when it was JWT-authenticated. Not needed when the Dev Hub was
                          authenticated via web login or an SFDX auth URL — the scratch org's own refresh token is used
                          instead.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run Apex tests against the scratch org created by `build create-scratch`.

  Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`), authenticates as that scratch org, and runs its
  Apex tests with `RunLocalTests`.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build test-scratch --jwt-key-file ./server.key
```

_See code: [lib/commands/simply/cicd/build/test-scratch.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/build/test-scratch.js)_

## `sf simply cicd deploy happy-soup deploy-unpackaged`

Run the deploy-unpackaged stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup deploy-unpackaged --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file. If
                                  not provided, derived from --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --source-branch-name=<value>    [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used
                                  to derive the deployment config file path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the deploy-unpackaged stage of a happy-soup deployment.

  Runs the `bin/unpackagedDeploy.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup deploy-unpackaged --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/deploy-unpackaged.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/deploy-unpackaged.js)_

## `sf simply cicd deploy happy-soup deployment-close-out`

Archive the deployment config file used for a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup deployment-close-out --ci-commit-ref-name <value> --ci-pipeline-id <value> --ci-project-path <value>
    --project-access-token <value> [--json] [--flags-dir <value>] [--debug] [--deploy-config-file <value>]
    [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--deploy-release-date <value>] [--source-branch-name
    <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --ci-commit-ref-name=<value>    (required) [env: SIMPLY_CICD_CI_COMMIT_REF_NAME] The commit ref (branch) to fetch and
                                  switch to before archiving.
  --ci-pipeline-id=<value>        (required) [env: SIMPLY_CICD_CI_PIPELINE_ID] The CI pipeline ID, used to build the
                                  authenticated push remote.
  --ci-project-path=<value>       (required) [env: SIMPLY_CICD_CI_PROJECT_PATH] The project path (e.g. group/project),
                                  used to build the authenticated push remote.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file to
                                  archive, if --deploy-release-date is not provided.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-release-date=<value>   The release date (e.g. 2026-01-15) used to resolve the source file as
                                  `deployment-configs/<date>.json`, taking priority over --deploy-config-file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --project-access-token=<value>  (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] A project access token with write
                                  access, used to push the archive commit.
  --source-branch-name=<value>    [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used
                                  to derive the deployment config file path if --deploy-config-file is not provided.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Archive the deployment config file used for a happy-soup deployment.

  Fetches and switches to the commit ref, then copies the deployment config file that was used (either
  --deploy-release-date resolved to `deployment-configs/<date>.json`, or the explicit/derived deploy config file) to
  `config/deploy.json` and commits it. If no source file can be found, an existing obsolete `config/deploy.json` is
  removed instead. Both cases push the change with a `[skip ci]` commit message.

EXAMPLES
  $ sf simply cicd deploy happy-soup deployment-close-out --ci-commit-ref-name main --ci-pipeline-id 123 --ci-project-path group/project --project-access-token $PROJECT_ACCESS_TOKEN --deploy-release-date 2026-01-15
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/deployment-close-out.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/deployment-close-out.js)_

## `sf simply cicd deploy happy-soup install-packaged`

Install packaged dependencies into the target org for a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup install-packaged --alias <value> [--json] [--flags-dir <value>] [--vcs-host <value>] [--vcs-provider
    github|gitlab] [--debug] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--install-type
    All|Delta|Upgrade] [--packaging-devhub <value>]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --install-type=<option>         [default: Upgrade] The type of dependency installation to perform.
                                  <options: All|Delta|Upgrade>
  --packaging-devhub=<value>      [env: SIMPLY_CICD_PACKAGING_DEVHUB] Alias of the Dev Hub used to look up package
                                  version information for upgraded packages. Must already be authenticated. Omitted
                                  entirely (with a warning) when not provided, skipping origin lookup for upgraded
                                  packages.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install packaged dependencies into the target org for a happy-soup deployment.

  Installs the packaged dependencies declared in `sfdx-project.json` into the target org (`--alias`), which must already
  be authenticated. For every dependency that upgrades an already-installed package, records the previous/target version
  and origin commit information to the deploy progress file, for `notify happy-soup` to look up related stories from
  later.

EXAMPLES
  $ sf simply cicd deploy happy-soup install-packaged --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/install-packaged.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/install-packaged.js)_

## `sf simply cicd deploy happy-soup post-deploy`

Run the post-deploy stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup post-deploy --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file. If
                                  not provided, derived from --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --source-branch-name=<value>    [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used
                                  to derive the deployment config file path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-deploy stage of a happy-soup deployment.

  Runs the `bin/postDeploy.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup post-deploy --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/post-deploy.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/post-deploy.js)_

## `sf simply cicd deploy happy-soup post-destructive`

Run the post-destructive stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup post-destructive --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file. If
                                  not provided, derived from --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --source-branch-name=<value>    [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used
                                  to derive the deployment config file path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-destructive stage of a happy-soup deployment.

  Runs the `bin/postDestructive.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup post-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/post-destructive.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/post-destructive.js)_

## `sf simply cicd deploy happy-soup pre-destructive`

Run the pre-destructive stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup pre-destructive --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file. If
                                  not provided, derived from --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --source-branch-name=<value>    [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used
                                  to derive the deployment config file path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the pre-destructive stage of a happy-soup deployment.

  Runs the `bin/preDestructive.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup pre-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/pre-destructive.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/pre-destructive.js)_

## `sf simply cicd deploy happy-soup tag-deployment`

Tag the current commit with details about a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup tag-deployment --ci-merge-request-iid <value> --ci-merge-request-project-url <value> --ci-pipeline-id <value>
    --ci-pipeline-url <value> --ci-project-path <value> --project-access-token <value> --alias <value> [--json]
    [--flags-dir <value>] [--debug] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                         (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-merge-request-iid=<value>          (required) [env: SIMPLY_CICD_CI_MERGE_REQUEST_IID] The merge request's
                                          internal ID (IID), used to build the merge request link in the tag message.
  --ci-merge-request-project-url=<value>  (required) [env: SIMPLY_CICD_CI_MERGE_REQUEST_PROJECT_URL] The project's URL,
                                          used to build the merge request link in the tag message.
  --ci-pipeline-id=<value>                (required) [env: SIMPLY_CICD_CI_PIPELINE_ID] The CI pipeline ID.
  --ci-pipeline-url=<value>               (required) [env: SIMPLY_CICD_CI_PIPELINE_URL] The CI pipeline URL, included in
                                          the tag message if provided.
  --ci-project-path=<value>               (required) [env: SIMPLY_CICD_CI_PROJECT_PATH] The project path (e.g.
                                          group/project), used to build the authenticated push remote.
  --debug                                 [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-progress-file=<value>          [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to
                                          the deployment progress file.
  --deploy-rules-file=<value>             [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path
                                          to the deployment rules file.
  --project-access-token=<value>          (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] A project access token with
                                          write access, used to push the tag.
  --vcs-host=<value>                      [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g.
                                          gitlab.com).
  --vcs-provider=<option>                 [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting
                                          platform to talk to.
                                          <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Tag the current commit with details about a happy-soup deployment.

  Authenticates to the target org, derives an org domain prefix from its instance URL, and creates an annotated git tag
  (`deployed--<org-domain-prefix>-<timestamp>`) recording the deployment time (America/New_York) and, if provided, the
  associated pipeline and merge request links. The tag is pushed to the source repository.

EXAMPLES
  $ sf simply cicd deploy happy-soup tag-deployment --alias my-org --ci-pipeline-id 123 --ci-pipeline-url https://gitlab.example.com/group/project/-/pipelines/123 --ci-project-path group/project --ci-merge-request-iid 45 --ci-merge-request-project-url https://gitlab.example.com/group/project --project-access-token $PROJECT_ACCESS_TOKEN
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/tag-deployment.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/tag-deployment.js)_

## `sf simply cicd deploy happy-soup validate`

Validate deployment configuration files for a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>] [--source-branch-name <value>]

FLAGS
  --deploy-config-file=<value>    [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file. If
                                  not provided, derived from --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --source-branch-name=<value>    [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used
                                  to derive the deployment config file path if --deploy-config-file is not provided.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate deployment configuration files for a happy-soup deployment.

  Validates the deployment config file (explicit, or derived from --source-branch-name) and, if --deploy-rules-file is
  given, the deployment rules file. A missing file is skipped with a warning; a malformed or schema-invalid file fails
  the command.

EXAMPLES
  $ sf simply cicd deploy happy-soup validate --source-branch-name release/uat

  $ sf simply cicd deploy happy-soup validate --deploy-config-file deployment-configs/uat.json --deploy-rules-file config/deploy-rules.json
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/validate.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/validate.js)_

## `sf simply cicd deploy project deploy-unpackaged`

Run the deploy-unpackaged stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project deploy-unpackaged --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the deploy-unpackaged stage of a project deployment.

  Runs the `bin/unpackagedDeploy.sh` script (if present) against the local project directory, resuming from the
  deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project deploy-unpackaged --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/deploy-unpackaged.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/deploy-unpackaged.js)_

## `sf simply cicd deploy project install-packaged`

Install packaged dependencies and the project's own package into the target org.

```
USAGE
  $ sf simply cicd deploy project install-packaged --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab] [--debug] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>] [--subscriber-package-version-id <value>] [--install-type All|Delta|Upgrade]

FLAGS
  --alias=<value>                          (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>                   (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to
                                           authenticate read-only repository clones.
  --debug                                  [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>             [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to
                                           the deployment configuration file.
  --deploy-progress-file=<value>           [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path
                                           to the deployment progress file.
  --deploy-rules-file=<value>              [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path
                                           to the deployment rules file.
  --install-type=<option>                  [default: Upgrade] The type of dependency installation to perform.
                                           <options: All|Delta|Upgrade>
  --subscriber-package-version-id=<value>  The subscriber package version ID (04t...) to install. If not provided, the
                                           ID is looked up from the git tag annotation at HEAD.
  --vcs-host=<value>                       [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g.
                                           gitlab.com).
  --vcs-provider=<option>                  [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting
                                           platform to talk to.
                                           <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install packaged dependencies and the project's own package into the target org.

  Installs the packaged dependencies declared in `sfdx-project.json`, then installs the project's own main package —
  prioritizing --subscriber-package-version-id if given, otherwise looking for a `04t...` package ID annotated on the
  git tag pointing at HEAD.

EXAMPLES
  $ sf simply cicd deploy project install-packaged --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/install-packaged.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/install-packaged.js)_

## `sf simply cicd deploy project post-deploy`

Run the post-deploy stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project post-deploy --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-deploy stage of a project deployment.

  Runs the `bin/postDeploy.sh` script (if present) against the local project directory, resuming from the deployment
  progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project post-deploy --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/post-deploy.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/post-deploy.js)_

## `sf simply cicd deploy project post-destructive`

Run the post-destructive stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project post-destructive --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-destructive stage of a project deployment.

  Runs the `bin/postDestructive.sh` script (if present) against the local project directory, resuming from the
  deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project post-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/post-destructive.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/post-destructive.js)_

## `sf simply cicd deploy project pre-destructive`

Run the pre-destructive stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project pre-destructive --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the pre-destructive stage of a project deployment.

  Runs the `bin/preDestructive.sh` script (if present) against the local project directory, resuming from the deployment
  progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project pre-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/pre-destructive.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/pre-destructive.js)_

## `sf simply cicd deploy project run-apex-tests`

Run Apex tests against the target org for a project deployment.

```
USAGE
  $ sf simply cicd deploy project run-apex-tests --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab] [--debug] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run Apex tests against the target org for a project deployment.

  Authenticates to the target org and runs its Apex tests, if any exist in the project's package directories.

EXAMPLES
  $ sf simply cicd deploy project run-apex-tests --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/run-apex-tests.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/run-apex-tests.js)_

## `sf simply cicd deploy project validate`

Validate deployment configuration files for a project deployment.

```
USAGE
  $ sf simply cicd deploy project validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>]

FLAGS
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file. Accepted for consistency with the other project deployment
                                  commands; not used by validation.
  --deploy-rules-file=<value>     [env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the deployment rules file.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate deployment configuration files for a project deployment.

  Validates `config/deploy.json` (or the path given by --deploy-config-file) and, if --deploy-rules-file is given, the
  deployment rules file. A missing file is skipped with a warning; a malformed or schema-invalid file fails the command.

EXAMPLES
  $ sf simply cicd deploy project validate

  $ sf simply cicd deploy project validate --deploy-config-file config/deploy.json --deploy-rules-file config/deploy-rules.json
```

_See code: [lib/commands/simply/cicd/deploy/project/validate.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/validate.js)_

## `sf simply cicd deploy validate`

Validate deployment configuration files against their JSON schemas.

```
USAGE
  $ sf simply cicd deploy validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-rules-file <value>]
    [--source-branch-name <value>]

FLAGS
  --deploy-config-file=<value>  [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file.
  --deploy-rules-file=<value>   [env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the deployment rules file.
  --source-branch-name=<value>  [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used to
                                derive the deployment config file path if --deploy-config-file is not provided.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate deployment configuration files against their JSON schemas.

  Validates the deployment config file (`deploy.json`) and deployment rules file independently against their schemas. A
  missing file is skipped with a warning; a malformed or schema-invalid file fails the command.

  This is the generic form of the command, with no namespace-specific default file paths — see `deploy project validate`
  and `deploy happy-soup validate` for versions with sensible defaults for those deployment styles.

EXAMPLES
  $ sf simply cicd deploy validate --deploy-config-file config/deploy.json --deploy-rules-file config/deploy-rules.json
```

_See code: [lib/commands/simply/cicd/deploy/validate.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/validate.js)_

## `sf simply cicd notify happy-soup`

Send a happy-soup deployment stage notification to Microsoft Teams, with ALM story integration for upgraded packages.

```
USAGE
  $ sf simply cicd notify happy-soup [--json] [--flags-dir <value>] [--after-script] [--before-script] [--ci-commit-ref-name
    <value>] [--ci-environment-name <value>] [--ci-job-name <value>] [--ci-job-stage <value>] [--ci-job-status <value>]
    [--ci-job-token <value>] [--ci-pipeline-id <value>] [--ci-pipeline-url <value>] [--deploy-progress-file <value>]
    [--enabled] [--alm-base-url <value>] [--alm-project-key <value>] [--alm-provider gitlab-issues|jira]
    [--project-access-token <value>] [--teams-webhook-url <value>...] [--notify-on-completion] [--is-final-job]
    [--debug]

FLAGS
  --after-script                  Run the after-stage notification logic.
  --alm-base-url=<value>          [env: SIMPLY_CICD_ALM_BASE_URL] Base URL that an issue reference is appended to, e.g.
                                  https://jira.example.com/browse for Jira or https://gitlab.com/group/project/-/issues
                                  for GitLab Issues. References are shown without links if not provided.
  --alm-project-key=<value>       [env: SIMPLY_CICD_ALM_PROJECT_KEY] Fallback project key(s) used to search commit
                                  messages for issue references, if none are configured in .sfdevrc.json. Only used by
                                  prefix-keyed trackers such as Jira.
  --alm-provider=<option>         [default: jira, env: SIMPLY_CICD_ALM_PROVIDER] The issue tracker whose reference
                                  format to look for in commit messages.
                                  <options: gitlab-issues|jira>
  --before-script                 Run the before-stage (starting) notification logic.
  --ci-commit-ref-name=<value>    [env: SIMPLY_CICD_CI_COMMIT_REF_NAME] The git branch or tag ref for this pipeline run.
  --ci-environment-name=<value>   [env: SIMPLY_CICD_CI_ENVIRONMENT_NAME] The name of the target CI environment.
  --ci-job-name=<value>           [env: SIMPLY_CICD_CI_JOB_NAME] The name of the current CI job.
  --ci-job-stage=<value>          [env: SIMPLY_CICD_CI_JOB_STAGE] The stage of the current CI job.
  --ci-job-status=<value>         [env: SIMPLY_CICD_CI_JOB_STATUS] The status of the current CI job (e.g. success,
                                  failed).
  --ci-job-token=<value>          [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token to try first when looking up an
                                  upgraded package's origin commit history. Falls back to --project-access-token if the
                                  job token can't read that repository.
  --ci-pipeline-id=<value>        [env: SIMPLY_CICD_CI_PIPELINE_ID] The ID of the current CI pipeline.
  --ci-pipeline-url=<value>       [env: SIMPLY_CICD_CI_PIPELINE_URL] The URL of the current CI pipeline.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file to read upgraded package information from.
  --enabled                       [env: SIMPLY_CICD_ENABLED] Whether the notification is actually sent. Defaults to
                                  false so pipelines can gate this behind their own condition.
  --is-final-job                  Marks this job as the final job in the pipeline. Combined with --after-script and
                                  --notify-on-completion, this is what actually triggers the final notification.
  --notify-on-completion          Only send a notification on the final job of the pipeline, suppressing per-stage
                                  notifications.
  --project-access-token=<value>  [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] A personal or project access token, used to
                                  look up an upgraded package's origin commit history when --ci-job-token isn't provided
                                  or can't read that repository.
  --teams-webhook-url=<value>...  One or more Teams webhook URLs to send the notification to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a happy-soup deployment stage notification to Microsoft Teams, with ALM story integration for upgraded packages.

  Run with `--before-script` at the start of a stage to post a "starting" card, and with `--after-script` at the end to
  post a success or failure card. With `--notify-on-completion`, intermediate stage notifications are suppressed and
  only the final job (`--is-final-job` combined with `--after-script`) posts a card.

  On a successful `--after-script`, reads the packages upgraded by `deploy happy-soup install-packaged` from the deploy
  progress file, looks up the commit history between each package's previous and target version in its own origin
  repository, and includes any matched issue references per package in the notification.

EXAMPLES
  $ sf simply cicd notify happy-soup --before-script --ci-job-stage pre-destructive --teams-webhook-url https://outlook.office.com/webhook/... --enabled

  $ sf simply cicd notify happy-soup --after-script --is-final-job --notify-on-completion --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/happy-soup.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/notify/happy-soup.js)_

## `sf simply cicd notify project`

Send a project deployment notification to Microsoft Teams, with issue-tracker integration.

```
USAGE
  $ sf simply cicd notify project [--json] [--flags-dir <value>] [--after-script] [--alias <value>] [--before-script]
    [--ci-commit-ref-name <value>] [--ci-environment-name <value>] [--ci-job-name <value>] [--ci-job-stage <value>]
    [--ci-job-status <value>] [--ci-pipeline-id <value>] [--ci-pipeline-url <value>] [--ci-project-title <value>]
    [--packaging-devhub <value>] [--enabled] [--alm-base-url <value>] [--alm-project-key <value>] [--alm-provider
    gitlab-issues|jira] [--prev-installed-package-version <value>] [--subscriber-package-version-id <value>]
    [--target-package-version <value>] [--teams-webhook-url <value>...] [--debug]

FLAGS
  --after-script                            Run the after-deployment notification logic.
  --alias=<value>                           [env: SIMPLY_CICD_ALIAS] Alias of the target Salesforce org to query for the
                                            previously installed package version. Must already be authenticated.
  --alm-base-url=<value>                    [env: SIMPLY_CICD_ALM_BASE_URL] Base URL that an issue reference is appended
                                            to, e.g. https://jira.example.com/browse for Jira or
                                            https://gitlab.com/group/project/-/issues for GitLab Issues. References are
                                            shown without links if not provided.
  --alm-project-key=<value>                 [env: SIMPLY_CICD_ALM_PROJECT_KEY] Fallback project key(s) used to search
                                            commit messages for issue references, if none are configured in
                                            .sfdevrc.json. Only used by prefix-keyed trackers such as Jira.
  --alm-provider=<option>                   [default: jira, env: SIMPLY_CICD_ALM_PROVIDER] The issue tracker whose
                                            reference format to look for in commit messages.
                                            <options: gitlab-issues|jira>
  --before-script                           Run the before-deployment setup logic (resolves and records package
                                            versions).
  --ci-commit-ref-name=<value>              [env: SIMPLY_CICD_CI_COMMIT_REF_NAME] The git branch or tag ref for this
                                            pipeline run.
  --ci-environment-name=<value>             [env: SIMPLY_CICD_CI_ENVIRONMENT_NAME] The name of the target CI
                                            environment.
  --ci-job-name=<value>                     [env: SIMPLY_CICD_CI_JOB_NAME] The name of the current CI job.
  --ci-job-stage=<value>                    [env: SIMPLY_CICD_CI_JOB_STAGE] The stage of the current CI job (e.g.
                                            pre-destructive, post-destructive).
  --ci-job-status=<value>                   [env: SIMPLY_CICD_CI_JOB_STATUS] The status of the current CI job (e.g.
                                            success, failed, canceled).
  --ci-pipeline-id=<value>                  [env: SIMPLY_CICD_CI_PIPELINE_ID] The ID of the current CI pipeline.
  --ci-pipeline-url=<value>                 [env: SIMPLY_CICD_CI_PIPELINE_URL] The URL of the current CI pipeline.
  --ci-project-title=<value>                [env: SIMPLY_CICD_CI_PROJECT_TITLE] The project title shown in the
                                            notification card's heading.
  --debug                                   [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --enabled                                 [env: SIMPLY_CICD_ENABLED] Whether the notification is actually sent.
                                            Defaults to false so pipelines can gate this behind their own condition.
  --packaging-devhub=<value>                [env: SIMPLY_CICD_PACKAGING_DEVHUB] Alias of the Dev Hub used to look up
                                            target package version information. Must already be authenticated.
  --prev-installed-package-version=<value>  The previously installed package version. Only needed if re-running
                                            --after-script without having run --before-script first in the same job.
  --subscriber-package-version-id=<value>   The subscriber package version ID (04t...) being deployed, used to resolve
                                            the target package version from the packaging DevHub.
  --target-package-version=<value>          The target package version. Only needed if re-running --after-script without
                                            having run --before-script first in the same job.
  --teams-webhook-url=<value>...            One or more Teams webhook URLs to send the notification to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a project deployment notification to Microsoft Teams, with issue-tracker integration.

  Run once with `--before-script` at the start of a deployment pipeline (to record the previously installed and target
  package versions), and once with `--after-script` at the end (to post a success or failure card to Teams, including
  the tracked issues that shipped between those two versions).

EXAMPLES
  $ sf simply cicd notify project --before-script --ci-job-stage pre-destructive --alias my-org --enabled

  $ sf simply cicd notify project --after-script --ci-job-stage post-destructive --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/project.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/notify/project.js)_

## `sf simply cicd notify teams`

Send a serialized JSON payload to a Microsoft Teams webhook.

```
USAGE
  $ sf simply cicd notify teams --payload <value> --webhook-url <value> [--json] [--flags-dir <value>] [--enabled]
  [--debug]

FLAGS
  --debug                [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --enabled              [env: SIMPLY_CICD_ENABLED] Whether the notification is actually sent. Defaults to false so
                         pipelines can gate this behind their own condition.
  --payload=<value>      (required) The JSON payload to send to Teams, as a serialized string.
  --webhook-url=<value>  (required) [env: SIMPLY_CICD_WEBHOOK_URL] The Teams webhook URL to send the payload to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a serialized JSON payload to a Microsoft Teams webhook.

  Posts a payload as-is to one or more Microsoft Teams incoming webhook URLs. Use this for custom notifications that
  don't fit the built-in `notify project` or `notify happy-soup` card templates.

EXAMPLES
  $ sf simply cicd notify teams --payload '{"text":"Deployment complete"}' --webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/teams.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/notify/teams.js)_

## `sf simply cicd sfdx-dependabot`

Automatically update downstream projects with a newly released Salesforce 2GP package version.

```
USAGE
  $ sf simply cicd sfdx-dependabot [--json] [--flags-dir <value>] [--vcs-host <value>] [--vcs-api-url <value>] [--vcs-token
    <value>] [--root-group-id <value>] [--subscriber-package-version-id <value>] [--devhub-username <value>] [--dry-run]
    [--project-allowlist <value>] [--project-denylist <value>] [--skip-archived] [--skip-forks] [--branch-prefix
    <value>] [--change-request-labels <value>] [--fail-on-error] [--max-projects <value>] [--vcs-provider github|gitlab]

FLAGS
  --branch-prefix=<value>                  [env: SIMPLY_CICD_BRANCH_PREFIX] Prefix used for generated branch names.
  --change-request-labels=<value>          [env: SIMPLY_CICD_CHANGE_REQUEST_LABELS] Comma-separated labels to apply to
                                           created or updated change requests (merge requests on GitLab, pull requests
                                           on GitHub).
  --devhub-username=<value>                [env: SIMPLY_CICD_DEVHUB_USERNAME] Salesforce DevHub username or alias used
                                           to resolve the package's name and version.
  --dry-run                                [env: SIMPLY_CICD_DRY_RUN] Run discovery and parsing, but perform zero write,
                                           commit, or change request operations.
  --fail-on-error                          [env: SIMPLY_CICD_FAIL_ON_ERROR] Return a non-zero exit code if one or more
                                           per-project operations fail.
  --max-projects=<value>                   [env: SIMPLY_CICD_MAX_PROJECTS] Optional safety limit restricting the maximum
                                           number of eligible projects to scan.
  --project-allowlist=<value>              [env: SIMPLY_CICD_PROJECT_ALLOWLIST] Comma-separated list of repository paths
                                           to include in the scan. If specified, only matching repositories are scanned.
  --project-denylist=<value>               [env: SIMPLY_CICD_PROJECT_DENYLIST] Comma-separated list of repository paths
                                           to exclude from scanning.
  --root-group-id=<value>                  [env: SIMPLY_CICD_ROOT_GROUP_ID] Group or organization ID, or URL-encoded
                                           path, to scan for downstream projects.
  --[no-]skip-archived                     [env: SIMPLY_CICD_SKIP_ARCHIVED] Skip archived repositories.
  --[no-]skip-forks                        [env: SIMPLY_CICD_SKIP_FORKS] Skip forked repositories.
  --subscriber-package-version-id=<value>  The newly released Salesforce subscriber package version ID (04t...).
  --vcs-api-url=<value>                    [env: SIMPLY_CICD_VCS_API_URL] Base URL of the VCS platform's API.
  --vcs-host=<value>                       [env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance hosting the
                                           downstream projects.
  --vcs-provider=<option>                  [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting
                                           platform to talk to.
                                           <options: github|gitlab>
  --vcs-token=<value>                      [env: SIMPLY_CICD_VCS_TOKEN] VCS access token with file-writing and change
                                           request privileges.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Automatically update downstream projects with a newly released Salesforce 2GP package version.

  Discovers repositories under a group or organization, reads each one's `sfdx-project.json`, and for any repository
  that both depends on the released package and has opted in via the `SFDX_DEPENDABOT_ENABLED=TRUE` repository-level CI
  variable, opens (or updates) a change request bumping the dependency to the newly released version.

  Each eligible repository must explicitly opt in — this command never touches a downstream repository's dependencies
  without that variable set.

EXAMPLES
  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --dry-run

  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --branch-prefix devops/dependabot --change-request-labels dependencies

  $ sf simply cicd sfdx-dependabot --vcs-provider github --root-group-id my-org --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com

FLAG DESCRIPTIONS
  --vcs-api-url=<value>  Base URL of the VCS platform's API.

    Only needed for self-hosted instances whose API is not at the provider's usual location. Falls back to the
    SFDX_DEPENDABOT_VCS_API_URL or CI_API_V4_URL environment variables if not provided.

  --vcs-host=<value>  Hostname of the VCS instance hosting the downstream projects.

    Defaults to the selected provider's public instance if not provided.
```

_See code: [lib/commands/simply/cicd/sfdx-dependabot.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/sfdx-dependabot.js)_
<!-- commandsstop -->

## License

Licensed under the [Apache-2.0](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt) license.
