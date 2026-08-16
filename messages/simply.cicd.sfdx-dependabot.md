# summary

Automatically update downstream projects with a newly released Salesforce 2GP package version.

# description

Discovers repositories under a GitLab group, reads each one's `sfdx-project.json`, and for any repository that both depends on the released package and has opted in via the `SFDX_DEPENDABOT_ENABLED=TRUE` project-level CI/CD variable, opens (or updates) a merge request bumping the dependency to the newly released version.

Each eligible repository must explicitly opt in — this command never touches a downstream repository's dependencies without that variable set.

# flags.gitlab-api-url.summary

GitLab API v4 base URL.

# flags.gitlab-api-url.description

Falls back to the SFDX_DEPENDABOT_GITLAB_API_URL or CI_API_V4_URL environment variables if not provided.

# flags.gitlab-token.summary

GitLab access token with file-writing and merge request privileges.

# flags.root-group-id.summary

GitLab group ID or URL-encoded path to scan for downstream projects.

# flags.subscriber-package-version-id.summary

The newly released Salesforce subscriber package version ID (04t...).

# flags.devhub-username.summary

Salesforce DevHub username or alias used to resolve the package's name and version.

# flags.dry-run.summary

Run discovery and parsing, but perform zero write, commit, or merge request operations.

# flags.project-allowlist.summary

Comma-separated list of GitLab project paths to include in the scan. If specified, only matching projects are scanned.

# flags.project-denylist.summary

Comma-separated list of GitLab project paths to exclude from scanning.

# flags.skip-archived.summary

Skip archived GitLab repositories.

# flags.skip-forks.summary

Skip forked GitLab repositories.

# flags.branch-prefix.summary

Prefix used for generated branch names.

# flags.mr-labels.summary

Comma-separated labels to apply to created or updated merge requests.

# flags.fail-on-error.summary

Return a non-zero exit code if one or more per-project operations fail.

# flags.max-projects.summary

Optional safety limit restricting the maximum number of eligible projects to scan.

# flags.vcs-provider.summary

The source-control-hosting platform to talk to.

# examples

- <%= config.bin %> <%= command.id %> --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --dry-run

- <%= config.bin %> <%= command.id %> --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --branch-prefix devops/dependabot --mr-labels dependencies

# error.missingGitlabApiUrl

Missing GitLab API URL. Provide --gitlab-api-url or set SFDX_DEPENDABOT_GITLAB_API_URL / CI_API_V4_URL.

# info.starting

Starting SFDX Project Dependabot execution...

# info.dryRun

Executing in DRY-RUN mode. No changes will be written or committed.
