# summary

Send a build job's failure, or the package version it created, to Microsoft Teams, with issue-tracker integration.

# description

Run in every build job's `after_script`. Which card it posts depends on `--ci-job-status`:

- `failed`: a failure card with the job, stage, branch, and pipeline, whichever build job failed.
- `success`: a package version card, but only when the job created a package version. The card shows the new version tag, its `04t` ID, and the issue references in the commits since the previous version tag. Every other successful job sends nothing.
- Anything else (e.g. `canceled`): nothing.

The `04t` ID comes from `--subscriber-package-version-id`, or else from the `subscriberPackageVersionId.env` file that `build create-package-version` writes to the working directory. The new version's tag is the tag at `HEAD` annotated with that ID. The previous version's tag is the nearest earlier tag in the project's version tag format (`plugins.simply.versionTagFormat` or `SIMPLY_CICD_VERSION_TAG_FORMAT`). The command fetches tags, and the full history when the clone is shallow. If a tag or the history can't be found, the card shows `N/A` instead of failing the job.

# flags.ci-commit-ref-name.summary

The git branch or tag ref for this pipeline run.

# flags.ci-job-name.summary

The name of the current CI job.

# flags.ci-job-stage.summary

The stage of the current CI job.

# flags.ci-job-status.summary

The status of the current CI job (e.g. success, failed, canceled).

# flags.ci-pipeline-id.summary

The ID of the current CI pipeline.

# flags.ci-pipeline-url.summary

The URL of the current CI pipeline.

# flags.ci-project-title.summary

The project title shown in the notification card's heading.

# flags.subscriber-package-version-id.summary

The subscriber package version ID (04t...) created by this job. Defaults to the one in subscriberPackageVersionId.env, written by build create-package-version.

# flags.enabled.summary

Whether the notification is actually sent. Defaults to false so pipelines can gate this behind their own condition.

# flags.alm-base-url.summary

Base URL that an issue reference is appended to, e.g. https://jira.example.com/browse for Jira or https://gitlab.com/group/project/-/issues for GitLab Issues. References are shown without links if not provided.

# flags.alm-project-key.summary

Fallback project key(s) used to search commit messages for issue references, if none are configured in .sfdevrc.json. Only used by prefix-keyed trackers such as Jira.

# flags.alm-provider.summary

The issue tracker whose reference format to look for in commit messages.

# flags.teams-webhook-url.summary

One or more Teams webhook URLs to send the notification to.

# flags.debug.summary

Enable verbose debug logging.

# examples

- Post a card from a build job's after_script; it only sends one when the job failed or created a package version:

  <%= config.bin %> <%= command.id %> --ci-job-name push-scratch --ci-job-status "$CI_JOB_STATUS" --teams-webhook-url https://outlook.office.com/webhook/... --enabled

- Announce a package version with linked Jira stories:

  <%= config.bin %> <%= command.id %> --ci-job-status success --alm-base-url https://jira.example.com/browse --teams-webhook-url https://outlook.office.com/webhook/... --enabled

# error.missingTeamsWebhookUrl

--teams-webhook-url must be specified.
