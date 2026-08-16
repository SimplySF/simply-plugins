# summary

Send a happy-soup deployment stage notification to Microsoft Teams, without Jira story integration.

# description

Run with `--before-script` at the start of a stage to post a "starting" card, and with `--after-script` at the end to post a success or failure card. With `--notify-on-completion`, intermediate stage notifications are suppressed and only the final job (`--is-final-job` combined with `--after-script`) posts a card.

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

# flags.ci-pipeline-id.summary

The ID of the current CI pipeline.

# flags.ci-pipeline-url.summary

The URL of the current CI pipeline.

# flags.enabled.summary

Whether the notification is actually sent. Defaults to false so pipelines can gate this behind their own condition.

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
