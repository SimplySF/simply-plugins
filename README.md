# @simplysf/simply-apex

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-apex?label=@simplysf/simply-apex)](https://npmjs.com/@simplysf/simply-apex) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-apex.svg)](https://npmjs.com/@simplysf/simply-apex) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-node/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-apex
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-node) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-node/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply apex execute`](#sf-simply-apex-execute)
- [`sf simply apex logs purge`](#sf-simply-apex-logs-purge)
- [`sf simply apex trace setup`](#sf-simply-apex-trace-setup)
- [`sf simply apex trace silence`](#sf-simply-apex-trace-silence)

## `sf simply apex execute`

Execute anonymous Apex code.

```
USAGE
  $ sf simply apex execute -f <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -f, --file=<value>         (required) Path to Apex file
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Execute anonymous Apex code.

  Executes an anonymous block of Apex code from a local .apex file against a target org and reports the compile and
  execution results, including any debug logs produced.

EXAMPLES
  $ sf simply apex execute --target-org myOrg --file scripts/apex/data-fix.apex

FLAG DESCRIPTIONS
  -f, --file=<value>  Path to Apex file

    The path to the local .apex file containing the anonymous Apex code to execute.
```

_See code: [lib/commands/simply/apex/execute.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/execute.js)_

## `sf simply apex logs purge`

Purge Apex debug logs.

```
USAGE
  $ sf simply apex logs purge -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-w <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -w, --where=<value>        SOQL WHERE clause
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Purge Apex debug logs.

  Deletes ApexLog records from the target org. By default all logs are purged; use --where to scope the deletion to a
  subset of logs.

EXAMPLES
  $ sf simply apex logs purge --target-org myOrg

  $ sf simply apex logs purge --target-org myOrg --where "Status = 'Success'"

FLAG DESCRIPTIONS
  -w, --where=<value>  SOQL WHERE clause

    A WHERE clause used to filter which ApexLog records are purged (e.g. "Status = 'Success'").
```

_See code: [lib/commands/simply/apex/logs/purge.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/logs/purge.js)_

## `sf simply apex trace setup`

Configure a debug log trace flag for the current user.

```
USAGE
  $ sf simply apex trace setup -o <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Configure a debug log trace flag for the current user.

  Creates or updates a 24-hour DEVELOPER_LOG trace flag for the user running the command, using a FINEST/FINER debug
  level suitable for the Apex Replay Debugger.

EXAMPLES
  $ sf simply apex trace setup --target-org myOrg
```

_See code: [lib/commands/simply/apex/trace/setup.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/trace/setup.js)_

## `sf simply apex trace silence`

Silence debug logs for specific Apex classes.

```
USAGE
  $ sf simply apex trace silence -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-c <value> | --classes-file
    <value>]

FLAGS
  -c, --classes=<value>       Comma-separated Apex class names
  -o, --target-org=<value>    (required) Username or alias of the target org. Not required if the `target-org`
                              configuration variable is already set.
      --api-version=<value>   Override the api version used for api requests made by this command
      --classes-file=<value>  Path to a JSON file listing classes to silence

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Silence debug logs for specific Apex classes.

  Creates a 24-hour CLASS_TRACING trace flag with a fully suppressed (NONE) debug level for each specified Apex class,
  preventing those classes from generating debug log output.

EXAMPLES
  $ sf simply apex trace silence --target-org myOrg --classes NoisyClass,ChattyTrigger

  $ sf simply apex trace silence --target-org myOrg --classes-file classesToSilence.json

FLAG DESCRIPTIONS
  -c, --classes=<value>  Comma-separated Apex class names

    A comma-separated list of Apex class names to silence.

  --classes-file=<value>  Path to a JSON file listing classes to silence

    The path to a JSON file with the shape { "classes": ["ClassOne", "ClassTwo"] } listing the Apex class names to
    silence.
```

_See code: [lib/commands/simply/apex/trace/silence.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/trace/silence.js)_
<!-- commandsstop -->

## Configuration Files

### `sf simply apex trace silence --classes-file`

The `--classes-file` flag on `sf simply apex trace silence` takes the path to a JSON file listing which Apex classes to silence:

```json
{
  "classes": ["AccountTriggerHandler", "NoisyBatchClass"]
}
```

| Field     | Type       | Required | Description                                                                |
| --------- | ---------- | -------- | -------------------------------------------------------------------------- |
| `classes` | `string[]` | Yes      | One or more Apex class API names to silence. Must have at least one entry. |
