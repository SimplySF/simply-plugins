---
title: Environment variables
description: Configure simply-cicd's common flags once via SIMPLY_CICD_* environment variables instead of repeating them on every command.
sidebar:
  order: 5
---

Every `simply-cicd` command flag can still be passed explicitly, but flags that represent **common configuration** — org credentials, VCS provider settings, CI pipeline context, file locations — can also be set once as an environment variable, typically in your CI platform's project- or group-level variables. This avoids re-specifying the same values on every stage of a pipeline.

## Precedence

For every flag listed below, resolution order is:

1. The CLI flag, if passed explicitly.
2. The environment variable, if set.
3. The flag's hardcoded default, if it has one.

This is oclif's built-in `env` flag option — there's no custom parsing involved, so `--help` output for any command shows the exact environment variable name backing each flag.

## Naming convention

All variables use the form `SIMPLY_CICD_<FLAG_NAME>`, uppercased with hyphens converted to underscores — e.g. `--vcs-provider` is backed by `SIMPLY_CICD_VCS_PROVIDER`. Flags that are inherently per-invocation (a specific package version ID, a `--dry-run` toggle passed once, `--from`/`--to` diff ranges) intentionally do **not** have an environment variable — only flags a team would reasonably want to set once across a whole pipeline are covered. Flags that accept **multiple values** (`--dev-hub`, `--teams-webhook-url`) also don't have an environment variable — a single variable can't cleanly represent a repeated flag, so these must still be passed explicitly, once per value.

## Reference by category

### Org aliases (deploy, build, notify commands)

`simply-cicd` never authenticates Salesforce orgs itself — every flag below just takes an alias that must already be authenticated by the pipeline before the command runs, however it chooses to do that (`sf org login jwt`, `sf org login web`, `sf org login sfdx-url`, or the Client Credentials flow available via `@simplysf/simply-core`).

| Flag                 | Environment variable           |
| -------------------- | ------------------------------ |
| `--alias`            | `SIMPLY_CICD_ALIAS`            |
| `--packaging-devhub` | `SIMPLY_CICD_PACKAGING_DEVHUB` |

See [DevHub (build commands)](#devhub-build-commands) below for the scratch-org lifecycle's `--dev-hub`/`--jwt-key-file` flags — the one place `simply-cicd` still authenticates on its own behalf.

### VCS provider (see [VCS providers](/cicd/concepts/vcs-providers/))

| Flag                     | Environment variable               |
| ------------------------ | ---------------------------------- |
| `--vcs-provider`         | `SIMPLY_CICD_VCS_PROVIDER`         |
| `--vcs-host`             | `SIMPLY_CICD_VCS_HOST`             |
| `--ci-job-token`         | `SIMPLY_CICD_CI_JOB_TOKEN`         |
| `--project-access-token` | `SIMPLY_CICD_PROJECT_ACCESS_TOKEN` |

### CI/pipeline context (deploy, build, notify)

| Flag                                       | Environment variable                       |
| ------------------------------------------ | ------------------------------------------ |
| `--ci-commit-ref-name`                     | `SIMPLY_CICD_CI_COMMIT_REF_NAME`           |
| `--ci-commit-sha`                          | `SIMPLY_CICD_CI_COMMIT_SHA`                |
| `--ci-pipeline-id`                         | `SIMPLY_CICD_CI_PIPELINE_ID`               |
| `--ci-pipeline-url`                        | `SIMPLY_CICD_CI_PIPELINE_URL`              |
| `--ci-pipeline-source`                     | `SIMPLY_CICD_CI_PIPELINE_SOURCE`           |
| `--ci-project-path`                        | `SIMPLY_CICD_CI_PROJECT_PATH`              |
| `--ci-project-id` (diff commands)          | `SIMPLY_CICD_CI_PROJECT_ID`                |
| `--ci-project-title`                       | `SIMPLY_CICD_CI_PROJECT_TITLE`             |
| `--ci-environment-name`                    | `SIMPLY_CICD_CI_ENVIRONMENT_NAME`          |
| `--ci-job-name`                            | `SIMPLY_CICD_CI_JOB_NAME`                  |
| `--ci-job-stage`                           | `SIMPLY_CICD_CI_JOB_STAGE`                 |
| `--ci-job-status`                          | `SIMPLY_CICD_CI_JOB_STATUS`                |
| `--ci-merge-request-iid`                   | `SIMPLY_CICD_CI_MERGE_REQUEST_IID`         |
| `--ci-merge-request-project-url`           | `SIMPLY_CICD_CI_MERGE_REQUEST_PROJECT_URL` |
| `--ci-repository` (diff commands)          | `SIMPLY_CICD_CI_REPOSITORY`                |
| `--ci-pull-request-number` (diff commands) | `SIMPLY_CICD_CI_PULL_REQUEST_NUMBER`       |
| `--ci-run-id` (diff commands)              | `SIMPLY_CICD_CI_RUN_ID`                    |
| `--ci-server-url` (diff commands)          | `SIMPLY_CICD_CI_SERVER_URL`                |

The `--ci-project-id`/`--ci-merge-request-iid` pair is GitLab-only and the `--ci-repository`/`--ci-pull-request-number`/`--ci-run-id`/`--ci-server-url` group is GitHub-only; the diff commands read whichever set matches `--vcs-provider`. Most of these correspond 1:1 with a predefined CI variable of the same shape on their platform (e.g. `CI_COMMIT_REF_NAME`, `CI_PIPELINE_ID`) — set the `SIMPLY_CICD_*` variable to `$CI_COMMIT_REF_NAME` etc. once at the pipeline or job level rather than passing `--ci-commit-ref-name "$CI_COMMIT_REF_NAME"` on every command.

### Deploy file locations and test config

| Flag                     | Environment variable               |
| ------------------------ | ---------------------------------- |
| `--deploy-config-file`   | `SIMPLY_CICD_DEPLOY_CONFIG_FILE`   |
| `--deploy-progress-file` | `SIMPLY_CICD_DEPLOY_PROGRESS_FILE` |
| `--deploy-rules-file`    | `SIMPLY_CICD_DEPLOY_RULES_FILE`    |
| `--source-branch-name`   | `SIMPLY_CICD_SOURCE_BRANCH_NAME`   |
| `--test-level`           | `SIMPLY_CICD_TEST_LEVEL`           |
| `--test-suite`           | `SIMPLY_CICD_TEST_SUITE`           |
| `--tests`                | `SIMPLY_CICD_TESTS`                |

### DevHub (build commands)

The scratch-org lifecycle (`build create-scratch`/`delete-scratch`/`cleanup-scratch-orgs`/`push-scratch`/`test-scratch`/`install-dependencies` — see the [scratch org lifecycle guide](/cicd/guides/scratch-org-lifecycle/)) is the one place `simply-cicd` still authenticates on its own behalf, because a scratch org's username isn't known until it's created, so later stages (potentially in a fresh CI container) need to be able to mint a session for it on demand.

| Flag             | Environment variable       |
| ---------------- | -------------------------- |
| `--jwt-key-file` | `SIMPLY_CICD_JWT_KEY_FILE` |

`--jwt-key-file` is only accepted by `install-dependencies`/`push-scratch`/`test-scratch`/`delete-scratch` — the commands that re-authenticate the scratch org's own identity after creation — and even there it's only required when the Dev Hub that owns the scratch org was itself JWT-authenticated. A Dev Hub authenticated via web login or an SFDX auth URL leaves the scratch org with its own refresh token instead, which `simply-cicd` uses directly with no key file needed. `create-scratch` and `cleanup-scratch-orgs` never take `--jwt-key-file` at all — they only touch the Dev Hub itself, which is already authenticated by the pipeline, and `sf org create scratch` reads the Dev Hub's key file path off that existing session internally. `--dev-hub` (`create-scratch`/`cleanup-scratch-orgs`/`delete-scratch`, one already-authenticated Dev Hub alias per repeated flag on the first two) accepts multiple values and is not backed by an environment variable — see the note on multi-value flags above.

### Notifications (see [Teams notifications](/cicd/guides/teams-notifications/))

| Flag                             | Environment variable          |
| -------------------------------- | ----------------------------- |
| `--enabled`                      | `SIMPLY_CICD_ENABLED`         |
| `--webhook-url` (`notify teams`) | `SIMPLY_CICD_WEBHOOK_URL`     |
| `--alm-base-url`                 | `SIMPLY_CICD_ALM_BASE_URL`    |
| `--alm-project-key`              | `SIMPLY_CICD_ALM_PROJECT_KEY` |
| `--alm-provider`                 | `SIMPLY_CICD_ALM_PROVIDER`    |

`--teams-webhook-url` (`notify project`/`notify happy-soup`) accepts multiple values, one per Teams channel, and is not backed by an environment variable — see the note on multi-value flags above.

### `sfdx-dependabot`

| Flag                      | Environment variable                |
| ------------------------- | ----------------------------------- |
| `--vcs-host`              | `SIMPLY_CICD_VCS_HOST`              |
| `--vcs-api-url`           | `SIMPLY_CICD_VCS_API_URL`           |
| `--vcs-token`             | `SIMPLY_CICD_VCS_TOKEN`             |
| `--vcs-provider`          | `SIMPLY_CICD_VCS_PROVIDER`          |
| `--root-group-id`         | `SIMPLY_CICD_ROOT_GROUP_ID`         |
| `--devhub-username`       | `SIMPLY_CICD_DEVHUB_USERNAME`       |
| `--dry-run`               | `SIMPLY_CICD_DRY_RUN`               |
| `--project-allowlist`     | `SIMPLY_CICD_PROJECT_ALLOWLIST`     |
| `--project-denylist`      | `SIMPLY_CICD_PROJECT_DENYLIST`      |
| `--skip-archived`         | `SIMPLY_CICD_SKIP_ARCHIVED`         |
| `--skip-forks`            | `SIMPLY_CICD_SKIP_FORKS`            |
| `--branch-prefix`         | `SIMPLY_CICD_BRANCH_PREFIX`         |
| `--change-request-labels` | `SIMPLY_CICD_CHANGE_REQUEST_LABELS` |
| `--fail-on-error`         | `SIMPLY_CICD_FAIL_ON_ERROR`         |
| `--max-projects`          | `SIMPLY_CICD_MAX_PROJECTS`          |

`sfdx-dependabot` predates this convention and still honors its original `SFDX_DEPENDABOT_*` variables (e.g. `SFDX_DEPENDABOT_VCS_API_URL`, `SFDX_DEPENDABOT_VCS_TOKEN`) as a fallback below the `SIMPLY_CICD_*` variable in precedence, and `--vcs-api-url` additionally falls back to GitLab CI's own `CI_API_V4_URL` if nothing else is set — so in a GitLab CI job you rarely need to set it explicitly at all. New pipelines should prefer the `SIMPLY_CICD_*` names.

### Debug

Every command's `--debug` flag is backed by `SIMPLY_CICD_DEBUG`. Every `--disabled`/`--enabled` guard flag is backed by `SIMPLY_CICD_DISABLED`/`SIMPLY_CICD_ENABLED` respectively, so a whole stage can be toggled off pipeline-wide by setting one CI/CD variable rather than editing every job.
