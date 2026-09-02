---
title: 'Notify'
description: 'Command reference for pipeline notification commands.'
---

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

_See code: [lib/commands/simply/cicd/notify/happy-soup.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.6.1/packages/simply-cicd/lib/commands/simply/cicd/notify/happy-soup.js)_

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

_See code: [lib/commands/simply/cicd/notify/project.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.6.1/packages/simply-cicd/lib/commands/simply/cicd/notify/project.js)_

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

_See code: [lib/commands/simply/cicd/notify/teams.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.6.1/packages/simply-cicd/lib/commands/simply/cicd/notify/teams.js)_
