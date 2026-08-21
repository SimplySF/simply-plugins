# @simplysf/simply-community

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-community?label=@simplysf/simply-community)](https://npmjs.com/@simplysf/simply-community) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-community.svg)](https://npmjs.com/@simplysf/simply-community) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-node/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-community
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-node) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-node/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply community publish`](#sf-simply-community-publish)

## `sf simply community publish`

Publish a Salesforce Community (Experience Cloud site), waiting until the publish completes.

```
USAGE
  $ sf simply community publish -o <value> --name <value> [--json] [--flags-dir <value>] [--api-version <value>] [--wait
    <value>] [--retry-attempts <value>] [--retry-backoff <value>] [--ignore-errors]

FLAGS
  -o, --target-org=<value>      (required) Username or alias of the target org. Not required if the `target-org`
                                configuration variable is already set.
      --api-version=<value>     Override the api version used for api requests made by this command
      --ignore-errors           Log a warning and exit successfully if the publish fails, instead of throwing an error.
      --name=<value>            (required) Name of the community (Experience Cloud site) to publish.
      --retry-attempts=<value>  Number of additional attempts to make if the initial publish request fails, before
                                giving up. Defaults to 0 (no retries). Does not apply to polling for the publish job's
                                completion, which already retries until --wait elapses.
      --retry-backoff=<value>   [default: 2] Factor the delay between publish request retries grows by after each failed
                                attempt (e.g. 2 doubles the delay each time). Only relevant when --retry-attempts is
                                greater than 0.
      --wait=<value>            [default: 15] Minutes to wait for the publish to complete before giving up. Salesforce's
                                own publish jobs time out after 15 minutes server-side, so waiting longer than that has
                                no effect.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Publish a Salesforce Community (Experience Cloud site), waiting until the publish completes.

  Looks up the community by `--name`, triggers a publish via the Connect REST API, then polls until the publish job
  reaches a terminal state — throwing an error if it fails, rather than returning as soon as the publish request is
  accepted. The Salesforce CLI's own `sf community publish` command does not wait for completion; this command exists to
  fill that gap for pipelines that need to know publishing actually succeeded before continuing.

EXAMPLES
  $ sf simply community publish --target-org my-org --name "My Community"

  $ sf simply community publish --target-org my-org --name "My Community" --wait 20

  $ sf simply community publish --target-org my-org --name "My Community" --retry-attempts 3 --retry-backoff 2

  $ sf simply community publish --target-org my-org --name "My Community" --ignore-errors
```

_See code: [lib/commands/simply/community/publish.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-community@0.1.0/packages/simply-community/lib/commands/simply/community/publish.js)_
<!-- commandsstop -->
