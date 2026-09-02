# summary

Send a project deployment notification to Microsoft Teams, with issue-tracker integration.

# description

Run once with `--before-script` at the start of a deployment pipeline (to record the previously installed and target package versions), and once with `--after-script` at the end (to post a success or failure card to Teams, including the tracked issues that shipped between those two versions).

# flags.after-script.summary

Run the after-deployment notification logic.

# flags.before-script.summary

Run the before-deployment setup logic (resolves and records package versions).

# flags.alias.summary

Alias of the target Salesforce org to query for the previously installed package version. Must already be authenticated.

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

# flags.packaging-devhub.summary

Alias of the Dev Hub used to look up target package version information. Must already be authenticated.

# flags.enabled.summary

Whether the notification is actually sent. Defaults to false so pipelines can gate this behind their own condition.

# flags.alm-base-url.summary

Base URL that an issue reference is appended to, e.g. https://jira.example.com/browse for Jira or https://gitlab.com/group/project/-/issues for GitLab Issues. References are shown without links if not provided.

# flags.alm-project-key.summary

Fallback project key(s) used to search commit messages for issue references, if none are configured in .sfdevrc.json. Only used by prefix-keyed trackers such as Jira.

# flags.alm-provider.summary

The issue tracker whose reference format to look for in commit messages.

# flags.prev-installed-package-version.summary

The previously installed package version. Only needed if re-running --after-script without having run --before-script first in the same job.

# flags.subscriber-package-version-id.summary

The subscriber package version ID (04t...) being deployed, used to resolve the target package version from the packaging DevHub.

# flags.target-package-version.summary

The target package version. Only needed if re-running --after-script without having run --before-script first in the same job.

# flags.teams-webhook-url.summary

One or more Teams webhook URLs to send the notification to.

# flags.debug.summary

Enable verbose debug logging.

# examples

- <%= config.bin %> <%= command.id %> --before-script --ci-job-stage pre-destructive --alias my-org --enabled

- <%= config.bin %> <%= command.id %> --after-script --ci-job-stage post-destructive --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled

# error.missingTeamsWebhookUrl

--teams-webhook-url must be specified.

# error.missingScriptFlag

Either --before-script or --after-script must be specified.
