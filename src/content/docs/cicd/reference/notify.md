---
title: 'Notify'
description: 'Command reference for pipeline notification commands.'
---

## `sf simply cicd notify happy-soup`

Send a happy-soup deployment stage notification to Microsoft Teams, without Jira story integration.

```
USAGE
  $ sf simply cicd notify happy-soup [--json] [--flags-dir <value>] [--after-script] [--before-script] [--ci-commit-ref-name
    <value>] [--ci-environment-name <value>] [--ci-job-name <value>] [--ci-job-stage <value>] [--ci-job-status <value>]
    [--ci-pipeline-id <value>] [--ci-pipeline-url <value>] [--enabled] [--teams-webhook-url <value>...]
    [--notify-on-completion] [--is-final-job] [--debug]

FLAGS
  --after-script                  Run the after-stage notification logic.
  --before-script                 Run the before-stage (starting) notification logic.
  --ci-commit-ref-name=<value>    The git branch or tag ref for this pipeline run.
  --ci-environment-name=<value>   The name of the target CI environment.
  --ci-job-name=<value>           The name of the current CI job.
  --ci-job-stage=<value>          The stage of the current CI job.
  --ci-job-status=<value>         The status of the current CI job (e.g. success, failed).
  --ci-pipeline-id=<value>        The ID of the current CI pipeline.
  --ci-pipeline-url=<value>       The URL of the current CI pipeline.
  --debug                         Enable verbose debug logging.
  --enabled                       Whether the notification is actually sent. Defaults to false so pipelines can gate
                                  this behind their own condition.
  --is-final-job                  Marks this job as the final job in the pipeline. Combined with --after-script and
                                  --notify-on-completion, this is what actually triggers the final notification.
  --notify-on-completion          Only send a notification on the final job of the pipeline, suppressing per-stage
                                  notifications.
  --teams-webhook-url=<value>...  One or more Teams webhook URLs to send the notification to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a happy-soup deployment stage notification to Microsoft Teams, without Jira story integration.

  Run with `--before-script` at the start of a stage to post a "starting" card, and with `--after-script` at the end to
  post a success or failure card. With `--notify-on-completion`, intermediate stage notifications are suppressed and
  only the final job (`--is-final-job` combined with `--after-script`) posts a card.

EXAMPLES
  $ sf simply cicd notify happy-soup --before-script --ci-job-stage pre-destructive --teams-webhook-url https://outlook.office.com/webhook/... --enabled

  $ sf simply cicd notify happy-soup --after-script --is-final-job --notify-on-completion --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/happy-soup.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/notify/happy-soup.js)_

## `sf simply cicd notify project`

Send a project deployment notification to Microsoft Teams, with Jira story integration.

```
USAGE
  $ sf simply cicd notify project [--json] [--flags-dir <value>] [--after-script] [--alias <value>] [--before-script]
    [--ci-commit-ref-name <value>] [--ci-environment-name <value>] [--ci-job-name <value>] [--ci-job-stage <value>]
    [--ci-job-status <value>] [--ci-pipeline-id <value>] [--ci-pipeline-url <value>] [--ci-project-title <value>]
    [--client-id <value>] [--devhub-tooling-client-id <value>] [--devhub-tooling-instance-url <value>]
    [--devhub-tooling-username <value>] [--enabled] [--instance-url <value>] [--jira-base-url <value>]
    [--jira-project-key <value>] [--jwt-key-file <value>] [--prev-installed-package-version <value>]
    [--subscriber-package-version-id <value>] [--target-package-version <value>] [--teams-webhook-url <value>...]
    [--username <value>] [--debug]

FLAGS
  --after-script                            Run the after-deployment notification logic.
  --alias=<value>                           The target Salesforce org alias to authenticate and query for the previously
                                            installed package version.
  --before-script                           Run the before-deployment setup logic (resolves and records package
                                            versions).
  --ci-commit-ref-name=<value>              The git branch or tag ref for this pipeline run.
  --ci-environment-name=<value>             The name of the target CI environment.
  --ci-job-name=<value>                     The name of the current CI job.
  --ci-job-stage=<value>                    The stage of the current CI job (e.g. pre-destructive, post-destructive).
  --ci-job-status=<value>                   The status of the current CI job (e.g. success, failed, canceled).
  --ci-pipeline-id=<value>                  The ID of the current CI pipeline.
  --ci-pipeline-url=<value>                 The URL of the current CI pipeline.
  --ci-project-title=<value>                The project title shown in the notification card's heading.
  --client-id=<value>                       Connected app client ID for JWT authentication to the target org.
  --debug                                   Enable verbose debug logging.
  --devhub-tooling-client-id=<value>        Connected app client ID for JWT authentication to the tooling DevHub.
  --devhub-tooling-instance-url=<value>     Login instance URL for the tooling DevHub.
  --devhub-tooling-username=<value>         Username for JWT authentication to the tooling DevHub.
  --enabled                                 Whether the notification is actually sent. Defaults to false so pipelines
                                            can gate this behind their own condition.
  --instance-url=<value>                    Login instance URL for the target org.
  --jira-base-url=<value>                   Base URL for linking a Jira issue key, e.g. https://jira.example.com/browse.
                                            Story keys are shown without links if not provided.
  --jira-project-key=<value>                Fallback Jira project key(s) used to search commit messages for story
                                            references, if none are configured in .sfdevrc.json.
  --jwt-key-file=<value>                    Path to the JWT private key file, used for both the target org and tooling
                                            DevHub authentication.
  --prev-installed-package-version=<value>  The previously installed package version. Only needed if re-running
                                            --after-script without having run --before-script first in the same job.
  --subscriber-package-version-id=<value>   The subscriber package version ID (04t...) being deployed, used to resolve
                                            the target package version from the tooling DevHub.
  --target-package-version=<value>          The target package version. Only needed if re-running --after-script without
                                            having run --before-script first in the same job.
  --teams-webhook-url=<value>...            One or more Teams webhook URLs to send the notification to.
  --username=<value>                        Username for JWT authentication to the target org.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a project deployment notification to Microsoft Teams, with Jira story integration.

  Run once with `--before-script` at the start of a deployment pipeline (to record the previously installed and target
  package versions), and once with `--after-script` at the end (to post a success or failure card to Teams, including
  the Jira stories that shipped between those two versions).

EXAMPLES
  $ sf simply cicd notify project --before-script --ci-job-stage pre-destructive --alias my-org --username user@example.com --jwt-key-file server.key --client-id abc123 --instance-url https://login.salesforce.com --enabled

  $ sf simply cicd notify project --after-script --ci-job-stage post-destructive --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/project.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/notify/project.js)_

## `sf simply cicd notify teams`

Send a serialized JSON payload to a Microsoft Teams webhook.

```
USAGE
  $ sf simply cicd notify teams --payload <value> --webhook-url <value> [--json] [--flags-dir <value>] [--enabled]
  [--debug]

FLAGS
  --debug                Enable verbose debug logging.
  --enabled              Whether the notification is actually sent. Defaults to false so pipelines can gate this behind
                         their own condition.
  --payload=<value>      (required) The JSON payload to send to Teams, as a serialized string.
  --webhook-url=<value>  (required) The Teams webhook URL to send the payload to.

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

_See code: [lib/commands/simply/cicd/notify/teams.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/notify/teams.js)_
