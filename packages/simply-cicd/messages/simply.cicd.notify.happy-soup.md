# summary

Send a happy-soup deployment stage notification to Microsoft Teams, with ALM story integration for upgraded packages.

# description

Run with `--before-script` at the start of a stage to post a "starting" card, and with `--after-script` at the end to post a success or failure card. With `--notify-on-completion`, intermediate stage notifications are suppressed and only the final job (`--is-final-job` combined with `--after-script`) posts a card.

On a successful `--after-script`, reads the packages upgraded by `deploy happy-soup install-packaged` from the deploy progress file, looks up the commit history between each package's previous and target version in its own origin repository, and includes any matched issue references per package in the notification.

# flags.after-script.summary

Run the after-stage notification logic.

# flags.before-script.summary

Run the before-stage (starting) notification logic.

# flags.ci-commit-ref-name.summary

The git branch or tag ref for this pipeline run.

# flags.ci-environment-name.summary

The name of the target CI environment.

# flags.ci-job-name.summary

The name of the current CI job.

# flags.ci-job-stage.summary

The stage of the current CI job.

# flags.ci-job-status.summary

The status of the current CI job (e.g. success, failed).

# flags.ci-job-token.summary

The CI job token to try first when looking up an upgraded package's origin commit history. Falls back to --project-access-token if the job token can't read that repository.

# flags.ci-pipeline-id.summary

The ID of the current CI pipeline.

# flags.ci-pipeline-url.summary

The URL of the current CI pipeline.

# flags.deploy-progress-file.summary

Path to the deployment progress file to read upgraded package information from.

# flags.enabled.summary

Whether the notification is actually sent. Defaults to false so pipelines can gate this behind their own condition.

# flags.alm-base-url.summary

Base URL that an issue reference is appended to, e.g. https://jira.example.com/browse for Jira or https://gitlab.com/group/project/-/issues for GitLab Issues. References are shown without links if not provided.

# flags.alm-project-key.summary

Fallback project key(s) used to search commit messages for issue references, if none are configured in .sfdevrc.json. Only used by prefix-keyed trackers such as Jira.

# flags.alm-provider.summary

The issue tracker whose reference format to look for in commit messages.

# flags.project-access-token.summary

A personal or project access token, used to look up an upgraded package's origin commit history when --ci-job-token isn't provided or can't read that repository.

# flags.teams-webhook-url.summary

One or more Teams webhook URLs to send the notification to.

# flags.notify-on-completion.summary

Only send a notification on the final job of the pipeline, suppressing per-stage notifications.

# flags.is-final-job.summary

Marks this job as the final job in the pipeline. Combined with --after-script and --notify-on-completion, this is what actually triggers the final notification.

# flags.debug.summary

Enable verbose debug logging.

# examples

- <%= config.bin %> <%= command.id %> --before-script --ci-job-stage pre-destructive --teams-webhook-url https://outlook.office.com/webhook/... --enabled

- <%= config.bin %> <%= command.id %> --after-script --is-final-job --notify-on-completion --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled

# error.missingScriptFlag

Either --before-script or --after-script must be specified.
