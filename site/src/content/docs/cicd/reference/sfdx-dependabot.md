---
title: 'sfdx-dependabot'
description: 'Command reference for the cross-repo dependency-bump command.'
---

## `sf simply cicd sfdx-dependabot`

Automatically update downstream projects with a newly released Salesforce 2GP package version.

```
USAGE
  $ sf simply cicd sfdx-dependabot [--json] [--flags-dir <value>] [--vcs-host <value>] [--vcs-api-url <value>] [--vcs-token
    <value>] [--root-group-id <value>] [--subscriber-package-version-id <value>] [--devhub-username <value>] [--dry-run]
    [--project-allowlist <value>] [--project-denylist <value>] [--skip-archived] [--skip-forks] [--branch-prefix
    <value>] [--change-request-labels <value>] [--fail-on-error] [--max-projects <value>] [--vcs-provider github|gitlab]

FLAGS
  --branch-prefix=<value>                  [env: SIMPLY_CICD_BRANCH_PREFIX] Prefix used for generated branch names.
  --change-request-labels=<value>          [env: SIMPLY_CICD_CHANGE_REQUEST_LABELS] Comma-separated labels to apply to
                                           created or updated change requests (merge requests on GitLab, pull requests
                                           on GitHub).
  --devhub-username=<value>                [env: SIMPLY_CICD_DEVHUB_USERNAME] Salesforce DevHub username or alias used
                                           to resolve the package's name and version.
  --dry-run                                [env: SIMPLY_CICD_DRY_RUN] Run discovery and parsing, but perform zero write,
                                           commit, or change request operations.
  --fail-on-error                          [env: SIMPLY_CICD_FAIL_ON_ERROR] Return a non-zero exit code if one or more
                                           per-project operations fail.
  --max-projects=<value>                   [env: SIMPLY_CICD_MAX_PROJECTS] Optional safety limit restricting the maximum
                                           number of eligible projects to scan.
  --project-allowlist=<value>              [env: SIMPLY_CICD_PROJECT_ALLOWLIST] Comma-separated list of repository paths
                                           to include in the scan. If specified, only matching repositories are scanned.
  --project-denylist=<value>               [env: SIMPLY_CICD_PROJECT_DENYLIST] Comma-separated list of repository paths
                                           to exclude from scanning.
  --root-group-id=<value>                  [env: SIMPLY_CICD_ROOT_GROUP_ID] Group or organization ID, or URL-encoded
                                           path, to scan for downstream projects.
  --[no-]skip-archived                     [env: SIMPLY_CICD_SKIP_ARCHIVED] Skip archived repositories.
  --[no-]skip-forks                        [env: SIMPLY_CICD_SKIP_FORKS] Skip forked repositories.
  --subscriber-package-version-id=<value>  The newly released Salesforce subscriber package version ID (04t...).
  --vcs-api-url=<value>                    [env: SIMPLY_CICD_VCS_API_URL] Base URL of the VCS platform's API.
  --vcs-host=<value>                       [env: SIMPLY_CICD_VCS_HOST] Hostname of the VCS instance hosting the
                                           downstream projects.
  --vcs-provider=<option>                  [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting
                                           platform to talk to.
                                           <options: github|gitlab>
  --vcs-token=<value>                      [env: SIMPLY_CICD_VCS_TOKEN] VCS access token with file-writing and change
                                           request privileges.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Automatically update downstream projects with a newly released Salesforce 2GP package version.

  Discovers repositories under a group or organization, reads each one's `sfdx-project.json`, and for any repository
  that both depends on the released package and has opted in via the `SFDX_DEPENDABOT_ENABLED=TRUE` repository-level CI
  variable, opens (or updates) a change request bumping the dependency to the newly released version.

  Each eligible repository must explicitly opt in — this command never touches a downstream repository's dependencies
  without that variable set.

EXAMPLES
  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --dry-run

  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --branch-prefix devops/dependabot --change-request-labels dependencies

  $ sf simply cicd sfdx-dependabot --vcs-provider github --root-group-id my-org --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com

FLAG DESCRIPTIONS
  --vcs-api-url=<value>  Base URL of the VCS platform's API.

    Only needed for self-hosted instances whose API is not at the provider's usual location. Falls back to the
    SFDX_DEPENDABOT_VCS_API_URL or CI_API_V4_URL environment variables if not provided.

  --vcs-host=<value>  Hostname of the VCS instance hosting the downstream projects.

    Defaults to the selected provider's public instance if not provided.
```

_See code: [lib/commands/simply/cicd/sfdx-dependabot.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/sfdx-dependabot.js)_
