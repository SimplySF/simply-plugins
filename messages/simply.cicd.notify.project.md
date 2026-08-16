# summary

Send a project deployment notification to Microsoft Teams, with Jira story integration.

# description

Run once with `--before-script` at the start of a deployment pipeline (to record the previously installed and target package versions), and once with `--after-script` at the end (to post a success or failure card to Teams, including the Jira stories that shipped between those two versions).

# flags.after-script.summary

Run the after-deployment notification logic.

# flags.before-script.summary

Run the before-deployment setup logic (resolves and records package versions).

# flags.alias.summary

The target Salesforce org alias to authenticate and query for the previously installed package version.

# flags.ci-commit-ref-name.summary

The git branch or tag ref for this pipeline run.

# flags.ci-environment-name.summary

The name of the target CI environment.

# flags.ci-job-name.summary

The name of the current CI job.

# flags.ci-job-stage.summary

The stage of the current CI job (e.g. pre-destructive, post-destructive).

# flags.ci-job-status.summary

The status of the current CI job (e.g. success, failed, canceled).

# flags.ci-pipeline-id.summary

The ID of the current CI pipeline.

# flags.ci-pipeline-url.summary

The URL of the current CI pipeline.

# flags.ci-project-title.summary

The project title shown in the notification card's heading.

# flags.client-id.summary

Connected app client ID for JWT authentication to the target org.

# flags.devhub-tooling-client-id.summary

Connected app client ID for JWT authentication to the tooling DevHub.

# flags.devhub-tooling-instance-url.summary

Login instance URL for the tooling DevHub.

# flags.devhub-tooling-username.summary

Username for JWT authentication to the tooling DevHub.

# flags.enabled.summary

Whether the notification is actually sent. Defaults to false so pipelines can gate this behind their own condition.

# flags.instance-url.summary

Login instance URL for the target org.

# flags.jira-base-url.summary

Base URL for linking a Jira issue key, e.g. https://jira.example.com/browse. Story keys are shown without links if not provided.

# flags.jira-project-key.summary

Fallback Jira project key(s) used to search commit messages for story references, if none are configured in .sfdevrc.json.

# flags.jwt-key-file.summary

Path to the JWT private key file, used for both the target org and tooling DevHub authentication.

# flags.prev-installed-package-version.summary

The previously installed package version. Only needed if re-running --after-script without having run --before-script first in the same job.

# flags.subscriber-package-version-id.summary

The subscriber package version ID (04t...) being deployed, used to resolve the target package version from the tooling DevHub.

# flags.target-package-version.summary

The target package version. Only needed if re-running --after-script without having run --before-script first in the same job.

# flags.teams-webhook-url.summary

One or more Teams webhook URLs to send the notification to.

# flags.username.summary

Username for JWT authentication to the target org.

# flags.debug.summary

Enable verbose debug logging.

# examples

- <%= config.bin %> <%= command.id %> --before-script --ci-job-stage pre-destructive --alias my-org --username user@example.com --jwt-key-file server.key --client-id abc123 --instance-url https://login.salesforce.com --enabled

- <%= config.bin %> <%= command.id %> --after-script --ci-job-stage post-destructive --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled

# error.missingTeamsWebhookUrl

--teams-webhook-url must be specified.

# error.missingScriptFlag

Either --before-script or --after-script must be specified.
