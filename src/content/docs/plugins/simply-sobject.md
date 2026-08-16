---
title: '@simplysf/simply-sobject'
description: 'Utilities for working with SObjects'
---

Utilities for working with SObjects

```sh
sf plugins install @simplysf/simply-sobject
```

## Commands

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
