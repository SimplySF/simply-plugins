---
title: 'Build'
description: 'Command reference for scratch-org and package build commands.'
---

## `sf simply cicd build cleanup-scratch-orgs`

Delete scratch orgs older than 3 hours from every configured Dev Hub.

```
USAGE
  $ sf simply cicd build cleanup-scratch-orgs --dev-hub-name <value>... --dev-hub-username <value>... --dev-hub-client-id <value>...
    --dev-hub-instance-url <value>... --jwt-key-file <value> [--json] [--flags-dir <value>] [--debug] [--disabled]

FLAGS
  --debug                            [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --dev-hub-client-id=<value>...     (required) [env: SIMPLY_CICD_DEV_HUB_CLIENT_ID] Connected app client ID for a Dev
                                     Hub.
  --dev-hub-instance-url=<value>...  (required) [env: SIMPLY_CICD_DEV_HUB_INSTANCE_URL] Login instance URL for a Dev
                                     Hub.
  --dev-hub-name=<value>...          (required) [env: SIMPLY_CICD_DEV_HUB_NAME] Friendly name of a Dev Hub. Repeat this
                                     flag alongside --dev-hub-username, --dev-hub-client-id, and --dev-hub-instance-url
                                     (in the same order) for each Dev Hub to try.
  --dev-hub-username=<value>...      (required) [env: SIMPLY_CICD_DEV_HUB_USERNAME] Username of a Dev Hub.
  --disabled                         [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                     running it.
  --jwt-key-file=<value>             (required) [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used
                                     for authentication.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Delete scratch orgs older than 3 hours from every configured Dev Hub.

  For each Dev Hub, queries `ActiveScratchOrg` records created more than 3 hours ago and bulk-deletes them. Useful for
  keeping a shared Dev Hub's scratch org allotment from being exhausted by abandoned CI runs.

EXAMPLES
  $ sf simply cicd build cleanup-scratch-orgs --dev-hub-name main --dev-hub-username devhub@example.com --dev-hub-client-id 3MVG9... --dev-hub-instance-url https://login.salesforce.com --jwt-key-file ./server.key
```

_See code: [lib/commands/simply/cicd/build/cleanup-scratch-orgs.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/cleanup-scratch-orgs.js)_

## `sf simply cicd build create-fallback-tag`

Create a fallback git tag carrying forward the previous package version's ID, for builds that didn't produce a new package version.

```
USAGE
  $ sf simply cicd build create-fallback-tag --ci-commit-ref-name <value> --ci-pipeline-id <value> --ci-project-path <value>
    --project-access-token <value> [--json] [--flags-dir <value>] [--vcs-host <value>] [--vcs-provider gitlab] [--debug]
    [--disabled] [--last-tag <value>] [--out <value>]

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
  --vcs-host=<value>              [default: gitlab.com, env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance hosting
                                  this project.
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The VCS platform hosting this
                                  project.
                                  <options: gitlab>

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

_See code: [lib/commands/simply/cicd/build/create-fallback-tag.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/create-fallback-tag.js)_

## `sf simply cicd build create-package-version`

Create a new package version, verify minimum code coverage, and create/push a version-tracking git tag.

```
USAGE
  $ sf simply cicd build create-package-version --ci-commit-ref-name <value> --ci-pipeline-id <value> --ci-project-path <value>
    --project-access-token <value> --jwt-key-file <value> --ci-commit-sha <value> --ci-pipeline-url <value>
    --devhub-tooling-username <value> --devhub-tooling-client-id <value> --devhub-tooling-instance-url <value> [--json]
    [--flags-dir <value>] [--vcs-host <value>] [--vcs-provider gitlab] [--debug] [--disabled] [--ci-pipeline-source
    <value>] [--always-create-package] [--code-coverage-minimum <value>] [--package-release-branch-prefix <value>]

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
  --devhub-tooling-client-id=<value>       (required) [env: SIMPLY_CICD_DEVHUB_TOOLING_CLIENT_ID] Connected app client
                                           ID for the tooling Dev Hub.
  --devhub-tooling-instance-url=<value>    (required) [env: SIMPLY_CICD_DEVHUB_TOOLING_INSTANCE_URL] Login instance URL
                                           for the tooling Dev Hub.
  --devhub-tooling-username=<value>        (required) [env: SIMPLY_CICD_DEVHUB_TOOLING_USERNAME] Username of the Dev Hub
                                           used for tooling operations like package version creation.
  --disabled                               [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead
                                           of running it.
  --jwt-key-file=<value>                   (required) [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file
                                           used for authentication.
  --package-release-branch-prefix=<value>  Prefix identifying release branches. Determines whether this build creates a
                                           package version and how the resulting git tag is named.
  --project-access-token=<value>           (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] Access token used to
                                           authenticate git remote operations (tagging, pushing).
  --vcs-host=<value>                       [default: gitlab.com, env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance
                                           hosting this project.
  --vcs-provider=<option>                  [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The VCS platform hosting
                                           this project.
                                           <options: gitlab>

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
  $ sf simply cicd build create-package-version --ci-commit-ref-name main --ci-commit-sha a1b2c3d --ci-pipeline-id 123 --ci-pipeline-url https://gitlab.example.com/pipelines/123 --ci-project-path group/project --project-access-token glpat-... --devhub-tooling-username devhub-tooling@example.com --devhub-tooling-client-id 3MVG9... --devhub-tooling-instance-url https://login.salesforce.com --jwt-key-file ./server.key
```

_See code: [lib/commands/simply/cicd/build/create-package-version.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/create-package-version.js)_

## `sf simply cicd build create-scratch`

Create a scratch org, trying each configured Dev Hub in order.

```
USAGE
  $ sf simply cicd build create-scratch --dev-hub-name <value>... --dev-hub-username <value>... --dev-hub-client-id <value>...
    --dev-hub-instance-url <value>... --jwt-key-file <value> [--json] [--flags-dir <value>] [--debug] [--disabled]
    [--scratch-definition-file <value>] [--scratch-duration-days <value>]

FLAGS
  --debug                            [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --dev-hub-client-id=<value>...     (required) [env: SIMPLY_CICD_DEV_HUB_CLIENT_ID] Connected app client ID for a Dev
                                     Hub.
  --dev-hub-instance-url=<value>...  (required) [env: SIMPLY_CICD_DEV_HUB_INSTANCE_URL] Login instance URL for a Dev
                                     Hub.
  --dev-hub-name=<value>...          (required) [env: SIMPLY_CICD_DEV_HUB_NAME] Friendly name of a Dev Hub. Repeat this
                                     flag alongside --dev-hub-username, --dev-hub-client-id, and --dev-hub-instance-url
                                     (in the same order) for each Dev Hub to try.
  --dev-hub-username=<value>...      (required) [env: SIMPLY_CICD_DEV_HUB_USERNAME] Username of a Dev Hub.
  --disabled                         [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                     running it.
  --jwt-key-file=<value>             (required) [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used
                                     for authentication.
  --scratch-definition-file=<value>  Definition file used to create the scratch org, if not specified in
                                     sfdx-project.json.
  --scratch-duration-days=<value>    [default: 1] Duration of the scratch org in days.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create a scratch org, trying each configured Dev Hub in order.

  Reads the default package directory's `definitionFile` from `sfdx-project.json` (falling back to
  `--scratch-definition-file`), and attempts creation against each `--dev-hub-*` in order. A Dev Hub that has hit its
  daily scratch org limit is skipped in favor of the next one. Writes the resulting org's auth fields to
  `SCRATCH_ORG_INFO.json` for later build steps, best-effort sets a default `CountryCode`, and assigns any permission
  sets/licenses declared under the default package directory's `packageMetadataAccess`.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build create-scratch --dev-hub-name main --dev-hub-username devhub@example.com --dev-hub-client-id 3MVG9... --dev-hub-instance-url https://login.salesforce.com --jwt-key-file ./server.key
```

_See code: [lib/commands/simply/cicd/build/create-scratch.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/create-scratch.js)_

## `sf simply cicd build delete-scratch`

Delete the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build delete-scratch --dev-hub-name <value>... --dev-hub-username <value>... --dev-hub-client-id <value>...
    --dev-hub-instance-url <value>... --jwt-key-file <value> [--json] [--flags-dir <value>] [--debug] [--disabled]

FLAGS
  --debug                            [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --dev-hub-client-id=<value>...     (required) [env: SIMPLY_CICD_DEV_HUB_CLIENT_ID] Connected app client ID for a Dev
                                     Hub.
  --dev-hub-instance-url=<value>...  (required) [env: SIMPLY_CICD_DEV_HUB_INSTANCE_URL] Login instance URL for a Dev
                                     Hub.
  --dev-hub-name=<value>...          (required) [env: SIMPLY_CICD_DEV_HUB_NAME] Friendly name of a Dev Hub. Repeat this
                                     flag alongside --dev-hub-username, --dev-hub-client-id, and --dev-hub-instance-url
                                     (in the same order) for each Dev Hub to try.
  --dev-hub-username=<value>...      (required) [env: SIMPLY_CICD_DEV_HUB_USERNAME] Username of a Dev Hub.
  --disabled                         [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                     running it.
  --jwt-key-file=<value>             (required) [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used
                                     for authentication.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Delete the scratch org created by `build create-scratch`.

  Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`) to find which Dev Hub owns the scratch org,
  authenticates to that Dev Hub and the scratch org, and deletes it. Deletion failures are logged rather than thrown,
  since a scratch org left behind after a failed deletion just needs manual cleanup and shouldn't fail an
  otherwise-successful pipeline run.

  Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

EXAMPLES
  $ sf simply cicd build delete-scratch --dev-hub-name main --dev-hub-username devhub@example.com --dev-hub-client-id 3MVG9... --dev-hub-instance-url https://login.salesforce.com --jwt-key-file ./server.key
```

_See code: [lib/commands/simply/cicd/build/delete-scratch.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/delete-scratch.js)_

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

_See code: [lib/commands/simply/cicd/build/determine-package-changes.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/determine-package-changes.js)_

## `sf simply cicd build generate-flexipage-diff`

Generate a FlexiPage delta between two commits and post the results to the merge request.

```
USAGE
  $ sf simply cicd build generate-flexipage-diff --ci-project-id <value> --ci-merge-request-iid <value> --from <value> --to <value>
    --project-access-token <value> [--json] [--flags-dir <value>] [--out <value>] [--debug] [--disabled]

FLAGS
  --ci-merge-request-iid=<value>  (required) [env: SIMPLY_CICD_CI_MERGE_REQUEST_IID] GitLab CI merge request internal
                                  ID.
  --ci-project-id=<value>         (required) [env: SIMPLY_CICD_CI_PROJECT_ID] GitLab CI project ID.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                      [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                  running it.
  --from=<value>                  (required) Base commit SHA to diff from.
  --out=<value>                   Output directory or file path for the delta results.
  --project-access-token=<value>  (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] Project access token used to post
                                  the diff results back to the merge request.
  --to=<value>                    (required) Head commit SHA to diff to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a FlexiPage delta between two commits and post the results to the merge request.

  Runs the upstream `flexipage-delta` binary to diff `**/*.flexipage-meta.xml` files between `--from` and `--to`, then
  `flexipage-delta-gitlab` to post the results back to the GitLab merge request. Both binaries are GitLab-specific, so
  this command isn't routed through the VCS provider abstraction. Failures are logged, not thrown — a diff-posting step
  shouldn't fail the build.

EXAMPLES
  $ sf simply cicd build generate-flexipage-diff --ci-project-id 123 --ci-merge-request-iid 45 --from abc123 --to def456 --project-access-token glpat-...
```

_See code: [lib/commands/simply/cicd/build/generate-flexipage-diff.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/generate-flexipage-diff.js)_

## `sf simply cicd build generate-flow-diff`

Generate a Flow delta between two commits and post the results to the merge request.

```
USAGE
  $ sf simply cicd build generate-flow-diff --ci-project-id <value> --ci-merge-request-iid <value> --from <value> --to <value>
    --project-access-token <value> [--json] [--flags-dir <value>] [--out <value>] [--debug] [--disabled]

FLAGS
  --ci-merge-request-iid=<value>  (required) [env: SIMPLY_CICD_CI_MERGE_REQUEST_IID] GitLab CI merge request internal
                                  ID.
  --ci-project-id=<value>         (required) [env: SIMPLY_CICD_CI_PROJECT_ID] GitLab CI project ID.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                      [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                  running it.
  --from=<value>                  (required) Base commit SHA to diff from.
  --out=<value>                   Output directory or file path for the delta results.
  --project-access-token=<value>  (required) [env: SIMPLY_CICD_PROJECT_ACCESS_TOKEN] Project access token used to post
                                  the diff results back to the merge request.
  --to=<value>                    (required) Head commit SHA to diff to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a Flow delta between two commits and post the results to the merge request.

  Runs the upstream `flow-delta` binary to diff `**/*.flow-meta.xml` files between `--from` and `--to`, then
  `flow-delta-gitlab` to post the results back to the GitLab merge request. Both binaries are GitLab-specific, so this
  command isn't routed through the VCS provider abstraction. Failures are logged, not thrown — a diff-posting step
  shouldn't fail the build.

EXAMPLES
  $ sf simply cicd build generate-flow-diff --ci-project-id 123 --ci-merge-request-iid 45 --from abc123 --to def456 --project-access-token glpat-...
```

_See code: [lib/commands/simply/cicd/build/generate-flow-diff.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/generate-flow-diff.js)_

## `sf simply cicd build install-dependencies`

Install packaged dependencies into the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build install-dependencies --jwt-key-file <value> [--json] [--flags-dir <value>] [--debug] [--disabled] [--install-type
    All|Delta|Upgrade]

FLAGS
  --debug                  [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled               [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.
  --install-type=<option>  [default: Upgrade] The type of dependency installation to perform.
                           <options: All|Delta|Upgrade>
  --jwt-key-file=<value>   (required) [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used for
                           authentication.

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

_See code: [lib/commands/simply/cicd/build/install-dependencies.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/install-dependencies.js)_

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

_See code: [lib/commands/simply/cicd/build/lwc-jest.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/lwc-jest.js)_

## `sf simply cicd build push-scratch`

Push source to the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build push-scratch --jwt-key-file <value> [--json] [--flags-dir <value>] [--debug] [--disabled]
    [--ignore-warnings] [--scratch-org-source-dir <value>]

FLAGS
  --debug                           [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disabled                        [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of
                                    running it.
  --ignore-warnings                 Append --ignore-warnings to the underlying sf project deploy start call.
  --jwt-key-file=<value>            (required) [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used for
                                    authentication.
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

_See code: [lib/commands/simply/cicd/build/push-scratch.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/push-scratch.js)_

## `sf simply cicd build test-scratch`

Run Apex tests against the scratch org created by `build create-scratch`.

```
USAGE
  $ sf simply cicd build test-scratch --jwt-key-file <value> [--json] [--flags-dir <value>] [--debug] [--disabled]
    [--disable-apex-tests]

FLAGS
  --debug                 [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --disable-apex-tests    Skip running Apex tests, without skipping the rest of the job.
  --disabled              [env: SIMPLY_CICD_DISABLED] Skip this job entirely, logging a warning instead of running it.
  --jwt-key-file=<value>  (required) [env: SIMPLY_CICD_JWT_KEY_FILE] Path to the JWT private key file used for
                          authentication.

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

_See code: [lib/commands/simply/cicd/build/test-scratch.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/build/test-scratch.js)_
