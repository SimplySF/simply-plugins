# @simplysf/simply-cicd

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-cicd?label=@simplysf/simply-cicd)](https://npmjs.com/@simplysf/simply-cicd) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-cicd.svg)](https://npmjs.com/@simplysf/simply-cicd) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-cicd
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-node) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-node/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply cicd notify happy-soup`](#sf-simply-cicd-notify-happy-soup)
- [`sf simply cicd notify project`](#sf-simply-cicd-notify-project)
- [`sf simply cicd notify teams`](#sf-simply-cicd-notify-teams)
- [`sf simply cicd sfdx-dependabot`](#sf-simply-cicd-sfdx-dependabot)

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

## `sf simply cicd sfdx-dependabot`

Automatically update downstream projects with a newly released Salesforce 2GP package version.

```
USAGE
  $ sf simply cicd sfdx-dependabot [--json] [--flags-dir <value>] [--gitlab-api-url <value>] [--gitlab-token <value>]
    [--root-group-id <value>] [--subscriber-package-version-id <value>] [--devhub-username <value>] [--dry-run]
    [--project-allowlist <value>] [--project-denylist <value>] [--skip-archived] [--skip-forks] [--branch-prefix
    <value>] [--mr-labels <value>] [--fail-on-error] [--max-projects <value>] [--vcs-provider gitlab]

FLAGS
  --branch-prefix=<value>                  Prefix used for generated branch names.
  --devhub-username=<value>                Salesforce DevHub username or alias used to resolve the package's name and
                                           version.
  --dry-run                                Run discovery and parsing, but perform zero write, commit, or merge request
                                           operations.
  --fail-on-error                          Return a non-zero exit code if one or more per-project operations fail.
  --gitlab-api-url=<value>                 GitLab API v4 base URL.
  --gitlab-token=<value>                   GitLab access token with file-writing and merge request privileges.
  --max-projects=<value>                   Optional safety limit restricting the maximum number of eligible projects to
                                           scan.
  --mr-labels=<value>                      Comma-separated labels to apply to created or updated merge requests.
  --project-allowlist=<value>              Comma-separated list of GitLab project paths to include in the scan. If
                                           specified, only matching projects are scanned.
  --project-denylist=<value>               Comma-separated list of GitLab project paths to exclude from scanning.
  --root-group-id=<value>                  GitLab group ID or URL-encoded path to scan for downstream projects.
  --[no-]skip-archived                     Skip archived GitLab repositories.
  --[no-]skip-forks                        Skip forked GitLab repositories.
  --subscriber-package-version-id=<value>  The newly released Salesforce subscriber package version ID (04t...).
  --vcs-provider=<option>                  [default: gitlab] The source-control-hosting platform to talk to.
                                           <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Automatically update downstream projects with a newly released Salesforce 2GP package version.

  Discovers repositories under a GitLab group, reads each one's `sfdx-project.json`, and for any repository that both
  depends on the released package and has opted in via the `SFDX_DEPENDABOT_ENABLED=TRUE` project-level CI/CD variable,
  opens (or updates) a merge request bumping the dependency to the newly released version.

  Each eligible repository must explicitly opt in — this command never touches a downstream repository's dependencies
  without that variable set.

EXAMPLES
  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --dry-run

  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --branch-prefix devops/dependabot --mr-labels dependencies

FLAG DESCRIPTIONS
  --gitlab-api-url=<value>  GitLab API v4 base URL.

    Falls back to the SFDX_DEPENDABOT_GITLAB_API_URL or CI_API_V4_URL environment variables if not provided.
```

_See code: [lib/commands/simply/cicd/sfdx-dependabot.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/sfdx-dependabot.js)_
<!-- commandsstop -->
