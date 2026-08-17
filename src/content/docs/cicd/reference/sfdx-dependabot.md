---
title: 'sfdx-dependabot'
description: 'Command reference for the cross-repo dependency-bump command.'
---

## `sf simply cicd sfdx-dependabot`

Automatically update downstream projects with a newly released Salesforce 2GP package version.

```
USAGE
  $ sf simply cicd sfdx-dependabot [--json] [--flags-dir <value>] [--gitlab-api-url <value>] [--gitlab-token <value>]
    [--root-group-id <value>] [--subscriber-package-version-id <value>] [--devhub-username <value>] [--dry-run]
    [--project-allowlist <value>] [--project-denylist <value>] [--skip-archived] [--skip-forks] [--branch-prefix
    <value>] [--mr-labels <value>] [--fail-on-error] [--max-projects <value>] [--vcs-provider gitlab]

FLAGS
  --branch-prefix=<value>                  [env: SIMPLY_CICD_BRANCH_PREFIX] Prefix used for generated branch names.
  --devhub-username=<value>                [env: SIMPLY_CICD_DEVHUB_USERNAME] Salesforce DevHub username or alias used
                                           to resolve the package's name and version.
  --dry-run                                [env: SIMPLY_CICD_DRY_RUN] Run discovery and parsing, but perform zero write,
                                           commit, or merge request operations.
  --fail-on-error                          [env: SIMPLY_CICD_FAIL_ON_ERROR] Return a non-zero exit code if one or more
                                           per-project operations fail.
  --gitlab-api-url=<value>                 [env: SIMPLY_CICD_GITLAB_API_URL] GitLab API v4 base URL.
  --gitlab-token=<value>                   [env: SIMPLY_CICD_GITLAB_TOKEN] GitLab access token with file-writing and
                                           merge request privileges.
  --max-projects=<value>                   [env: SIMPLY_CICD_MAX_PROJECTS] Optional safety limit restricting the maximum
                                           number of eligible projects to scan.
  --mr-labels=<value>                      [env: SIMPLY_CICD_MR_LABELS] Comma-separated labels to apply to created or
                                           updated merge requests.
  --project-allowlist=<value>              [env: SIMPLY_CICD_PROJECT_ALLOWLIST] Comma-separated list of GitLab project
                                           paths to include in the scan. If specified, only matching projects are
                                           scanned.
  --project-denylist=<value>               [env: SIMPLY_CICD_PROJECT_DENYLIST] Comma-separated list of GitLab project
                                           paths to exclude from scanning.
  --root-group-id=<value>                  [env: SIMPLY_CICD_ROOT_GROUP_ID] GitLab group ID or URL-encoded path to scan
                                           for downstream projects.
  --[no-]skip-archived                     [env: SIMPLY_CICD_SKIP_ARCHIVED] Skip archived GitLab repositories.
  --[no-]skip-forks                        [env: SIMPLY_CICD_SKIP_FORKS] Skip forked GitLab repositories.
  --subscriber-package-version-id=<value>  The newly released Salesforce subscriber package version ID (04t...).
  --vcs-provider=<option>                  [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting
                                           platform to talk to.
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

_See code: [lib/commands/simply/cicd/sfdx-dependabot.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.2.3/packages/simply-cicd/lib/commands/simply/cicd/sfdx-dependabot.js)_
