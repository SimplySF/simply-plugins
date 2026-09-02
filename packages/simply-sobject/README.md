# @simplysf/simply-sobject

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-sobject?label=@simplysf/simply-sobject)](https://npmjs.com/@simplysf/simply-sobject) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-sobject.svg)](https://npmjs.com/@simplysf/simply-sobject) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-node/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-sobject
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-node) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-node/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply sobject backup`](#sf-simply-sobject-backup)
- [`sf simply sobject deduplicate`](#sf-simply-sobject-deduplicate)
- [`sf simply sobject history export`](#sf-simply-sobject-history-export)
- [`sf simply sobject history query`](#sf-simply-sobject-history-query)
- [`sf simply sobject history schema`](#sf-simply-sobject-history-schema)

## `sf simply sobject backup`

Back up SObject data to a CSV file.

```
USAGE
  $ sf simply sobject backup -s <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -s, --sobject=<value>      (required) SObject API name
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Back up SObject data to a CSV file.

  Describes the given SObject, queries every field via the Bulk API, and writes the results to a timestamped CSV file.

EXAMPLES
  $ sf simply sobject backup --target-org myOrg --sobject Account

  $ sf simply sobject backup --target-org myOrg --sobject Custom_Object__c --output-dir backups

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the backup CSV file to. Defaults to the current directory.

  -s, --sobject=<value>  SObject API name

    The API name of the SObject to back up.
```

_See code: [lib/commands/simply/sobject/backup.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/backup.js)_

## `sf simply sobject deduplicate`

Identify and prepare deduplication of an SObject's records.

```
USAGE
  $ sf simply sobject deduplicate -c <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [--dry-run]
    [--output-dir <value>]

FLAGS
  -c, --config=<value>       (required) Path to a deduplication configuration file
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --dry-run              Skip calculating associated object lookup replacements
      --output-dir=<value>   Output directory

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Identify and prepare deduplication of an SObject's records.

  Queries an SObject, groups records by a composite key built from configured fields, and writes CSV files listing which
  records are unique and which are duplicates that should be deleted. For each associated object with lookups to the
  primary object, also writes a CSV of the lookup field updates needed to re-point duplicate references at the surviving
  unique record. This command does not perform any deletes or updates in the org; it only prepares the CSV files for a
  subsequent data load.

EXAMPLES
  $ sf simply sobject deduplicate --target-org myOrg --config config/deduplicate-account.json

  $ sf simply sobject deduplicate --target-org myOrg --config config/deduplicate-account.json --dry-run

FLAG DESCRIPTIONS
  -c, --config=<value>  Path to a deduplication configuration file

    The path to a JSON file describing the primary object, its composite key fields, and any associated objects with
    lookups to it.

  --dry-run  Skip calculating associated object lookup replacements

    When set, only the primary object's unique/duplicate CSV files are generated; associated object lookup replacement
    files are not calculated.

  --output-dir=<value>  Output directory

    The directory to write the generated CSV files to. Defaults to ./temp/<primaryObjectApiName>.
```

_See code: [lib/commands/simply/sobject/deduplicate.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/deduplicate.js)_

## `sf simply sobject history export`

Export field history for an SObject within a date range to a CSV file.

```
USAGE
  $ sf simply sobject history export -s <value> --start-date <value> --end-date <value> -o <value> [--json] [--flags-dir <value>]
    [--api-version <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -s, --sobject=<value>      (required) SObject API name
      --api-version=<value>  Override the api version used for api requests made by this command
      --end-date=<value>     (required) End date (YYYY-MM-DD)
      --start-date=<value>   (required) Start date (YYYY-MM-DD)

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Export field history for an SObject within a date range to a CSV file.

  Queries the field history object for the given SObject (e.g. `AccountHistory`, `Custom_Object__History`, or
  `OpportunityFieldHistory`) for changes created within the given date range, and writes the results to a timestamped
  CSV file.

EXAMPLES
  $ sf simply sobject history export --target-org myOrg --sobject Account --start-date 2026-01-01 --end-date 2026-01-31

  $ sf simply sobject history export --target-org myOrg --sobject Custom_Object__c --start-date 2026-01-01 --end-date 2026-01-31 --output-dir exports

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the exported CSV file to. Defaults to the current directory.

  -s, --sobject=<value>  SObject API name

    The API name of the SObject to export field history for (e.g. Account or Custom_Object__c).

  --end-date=<value>  End date (YYYY-MM-DD)

    The end of the date range to export history for, inclusive.

  --start-date=<value>  Start date (YYYY-MM-DD)

    The start of the date range to export history for, inclusive.
```

_See code: [lib/commands/simply/sobject/history/export.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/history/export.js)_

## `sf simply sobject history query`

Query the field history of an SObject, with optional filtering.

```
USAGE
  $ sf simply sobject history query --object <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [--filters
    <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --filters=<value>      Path to a filter configuration file, or a raw JSON filter string
      --object=<value>       (required) SObject API name

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Query the field history of an SObject, with optional filtering.

  Queries the field history object for the given SObject (e.g. `AccountHistory`, `Custom_Object__History`, or
  `OpportunityFieldHistory`) and writes the results to a timestamped CSV file. An optional filter tree can be supplied
  to narrow the results: conditions on Field, CreatedById, CreatedDate, or the parent lookup field are pushed into the
  SOQL WHERE clause; conditions on any other field (e.g. OldValue or NewValue) are applied client-side after the query
  runs.

EXAMPLES
  $ sf simply sobject history query --target-org myOrg --object Account

  $ sf simply sobject history query --target-org myOrg --object Custom_Object__c --filters config/history-filters.json

  $ sf simply sobject history query --target-org myOrg --object Account --filters '{"logic":"AND","filters":[{"field":"Field","operator":"=","value":"Name"}]}'

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the query results CSV file to. Defaults to the current directory.

  --filters=<value>  Path to a filter configuration file, or a raw JSON filter string

    A JSON object describing a tree of filter conditions: `{ "logic": "AND", "filters": [ { "field": "Field",
    "operator": "=", "value": "Status__c" } ] }`. Each entry in `filters` is either a condition (`field`, `operator`,
    `value`) or another nested group with its own `logic`/`filters`. Supported operators are =, !=, >, <, >=, <=, IN,
    NOT IN, and LIKE (using `%` as a wildcard).

  --object=<value>  SObject API name

    The API name of the SObject to query field history for (e.g. Account or Custom_Object__c).
```

_See code: [lib/commands/simply/sobject/history/query.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/history/query.js)_

## `sf simply sobject history schema`

Report on which objects and fields have field history tracking enabled.

```
USAGE
  $ sf simply sobject history schema -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Report on which objects and fields have field history tracking enabled.

  Identifies every object with field history tracking enabled, and every tracked field on each, resolving the
  managed/unlocked package each field belongs to, and writes the results to a timestamped CSV file and a browsable HTML
  report.

EXAMPLES
  $ sf simply sobject history schema --target-org myOrg

  $ sf simply sobject history schema --target-org myOrg --output-dir reports

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the generated CSV and HTML report files to. Defaults to the current directory.
```

_See code: [lib/commands/simply/sobject/history/schema.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/history/schema.js)_
<!-- commandsstop -->

## Configuration Files

### `sf simply sobject deduplicate --config`

The `--config` flag on `sf simply sobject deduplicate` takes the path to a JSON file describing the primary object, its composite key, and any associated objects with lookups to it:

```json
{
  "primaryObjectApiName": "Account",
  "primaryObjectFilter": "CreatedDate = LAST_N_DAYS:365",
  "primaryObjectCompositeKeyField": "Duplicate_Key__c",
  "primaryObjectFields": ["Id", "Name", "BillingPostalCode"],
  "primaryObjectCompositeKeyFields": ["Name", "BillingPostalCode"],
  "associatedObjects": {
    "Contact": ["AccountId"],
    "Opportunity": ["AccountId"]
  }
}
```

| Field                             | Type                       | Required | Description                                                                                                                                                                        |
| --------------------------------- | -------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primaryObjectApiName`            | `string`                   | Yes      | The API name of the object to deduplicate.                                                                                                                                         |
| `primaryObjectFilter`             | `string`                   | No       | A SOQL WHERE clause used to scope which records of the primary object are considered.                                                                                              |
| `primaryObjectCompositeKeyField`  | `string`                   | Yes      | The column name written to the output CSVs for the computed composite key.                                                                                                         |
| `primaryObjectFields`             | `string[]`                 | Yes      | Fields to query from the primary object (should include any fields referenced elsewhere in the config).                                                                            |
| `primaryObjectCompositeKeyFields` | `string[]`                 | Yes      | Fields whose combined values form each record's composite key. Records sharing a key are treated as duplicates. Must have at least one entry.                                      |
| `associatedObjects`               | `Record<string, string[]>` | Yes      | Other objects with lookups to the primary object. Keyed by the associated object's API name; each value is the list of that object's lookup field API names to the primary object. |

### `sf simply sobject history query --filters`

The `--filters` flag on `sf simply sobject history query` takes either the path to a JSON file or a raw JSON string describing a tree of filter conditions:

```json
{
  "logic": "AND",
  "filters": [
    { "field": "Field", "operator": "=", "value": "Status__c" },
    {
      "logic": "OR",
      "filters": [
        { "field": "OldValue", "operator": "=", "value": "Open" },
        { "field": "NewValue", "operator": "=", "value": "Closed" }
      ]
    }
  ]
}
```

A filter tree is either a **condition** or a **group**:

| Condition field | Type     | Description                                                                                                              |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `field`         | `string` | The field to filter on (e.g. `Field`, `OldValue`, `NewValue`, `CreatedById`, `CreatedDate`, or the parent lookup field). |
| `operator`      | `string` | One of `=`, `!=`, `>`, `<`, `>=`, `<=`, `IN`, `NOT IN`, `LIKE` (`%` is the wildcard for `LIKE`).                         |
| `value`         | any      | The value to compare against. An array when `operator` is `IN`/`NOT IN`.                                                 |

| Group field | Type                        | Description                                                    |
| ----------- | --------------------------- | -------------------------------------------------------------- |
| `logic`     | `"AND"` \| `"OR"`           | How `filters` are combined.                                    |
| `filters`   | `Array<Condition \| Group>` | One or more conditions or nested groups, combined per `logic`. |

Conditions on `Field`, `CreatedById`, `CreatedDate`, or the parent lookup field are pushed into the underlying SOQL query; conditions on any other field (e.g. `OldValue`/`NewValue`) are applied client-side after the query runs.

## License

Licensed under the [Apache-2.0](https://raw.githubusercontent.com/SimplySF/simply-node/main/LICENSE.txt) license.
