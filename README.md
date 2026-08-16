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

- [`sf simply cicd sfdx-dependabot`](#sf-simply-cicd-sfdx-dependabot)

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
