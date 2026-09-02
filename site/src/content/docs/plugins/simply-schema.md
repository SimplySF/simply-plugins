---
title: '@simplysf/simply-schema'
description: 'Utilities for visualizing Salesforce schema'
---

Utilities for visualizing Salesforce schema

```sh
sf plugins install @simplysf/simply-schema
```

## Commands

## `sf simply schema generate`

Generate Salesforce CustomObject/CustomField/RecordType metadata from a CSV or Excel schema definition file.

```
USAGE
  $ sf simply schema generate -f <value> -d <value> [--json] [--flags-dir <value>]

FLAGS
  -d, --output-dir=<value>  (required) The output directory to write the generated metadata into.
  -f, --file=<value>        (required) Path to the CSV or Excel (.xlsx/.xls) schema definition file.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate Salesforce CustomObject/CustomField/RecordType metadata from a CSV or Excel schema definition file.

  Reads a flat CSV or an Excel workbook describing one or more custom objects, their fields, and (CSV only) their record
  types, and writes Salesforce DX source-format metadata (`.object-meta.xml`, `.field-meta.xml`, `.recordType-meta.xml`)
  into `--output-dir`.

  For CSV input, each row's `Type` column (`CustomObject`, `CustomField`, or `RecordType`) and `ObjectName` column group
  the rows by object. For Excel input (`.xlsx`/`.xls`), the workbook must contain an `object` worksheet (a two-column
  key/value sheet describing the sObject) and a `fields` worksheet (one row per field); picklist fields may reference an
  additional values worksheet by name.

EXAMPLES
  $ sf simply schema generate --file schema.csv --output-dir force-app/main/default/objects

  $ sf simply schema generate --file MyObject__c.xlsx --output-dir force-app/main/default/objects

FLAG DESCRIPTIONS
  -f, --file=<value>  Path to the CSV or Excel (.xlsx/.xls) schema definition file.

    A `.csv` file processed as the flat CSV flow, or a `.xlsx`/`.xls` file processed as the Excel flow.
```

_See code: [lib/commands/simply/schema/generate.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-schema@0.3.0/packages/simply-schema/lib/commands/simply/schema/generate.js)_

## `sf simply schema visualize`

Generate visualizations of Salesforce schema from a live org or local source files.

```
USAGE
  $ sf simply schema visualize [--json] [--flags-dir <value>] [-o <value>] [--api-version <value>] [-d <value>...]
    [--source-objects <value>] [--related-objects <value>] [--object-type custom|standard|all] [--field-type
    custom|standard|all] [--output-type html|md|csv...] [--output-dir <value>]

FLAGS
  -d, --source-dir=<value>...    One or more paths to directories containing Salesforce DX source. Use this for
                                 local-source generation.
  -o, --target-org=<value>       Username or alias of the org to visualize. Use this for live-org generation.
      --api-version=<value>      Override the api version used for api requests made by this command
      --field-type=<option>      [default: custom] Scope of relationship fields to include: custom, standard, or all.
                                 <options: custom|standard|all>
      --object-type=<option>     [default: custom] Scope of objects to include: custom, standard, or all.
                                 <options: custom|standard|all>
      --output-dir=<value>       The output directory for the generated files.
      --output-type=<option>...  [default: html,md] Output format(s) to generate.
                                 <options: html|md|csv>
      --related-objects=<value>  Comma-separated list of related objects to filter the visualization to, or `all`.
      --source-objects=<value>   Comma-separated list of source objects to start from, or `all`.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate visualizations of Salesforce schema from a live org or local source files.

  Builds an object-relationship diagram (interactive HTML), a Mermaid entity-relationship diagram (Markdown), and/or a
  relationship CSV, either from a live org's Tooling API or from local Salesforce DX source directories. Exactly one of
  `--target-org` or `--source-dir` must be specified.

EXAMPLES
  $ sf simply schema visualize --target-org myTargetOrg

  $ sf simply schema visualize --target-org myTargetOrg --source-objects Account,Contact --related-objects all

  $ sf simply schema visualize --source-dir force-app --output-type html,md

FLAG DESCRIPTIONS
  --output-type=html|md|csv...  Output format(s) to generate.

    One or more of `html` (interactive diagram), `md` (Mermaid entity-relationship diagram), or `csv` (relationship
    data).

  --related-objects=<value>  Comma-separated list of related objects to filter the visualization to, or `all`.

    Comma-separated API names of related objects to include in the visualization. If `all` is specified, every related
    object is included regardless of `--object-type`. If not specified, related objects aren't filtered.

  --source-objects=<value>  Comma-separated list of source objects to start from, or `all`.

    Comma-separated API names of the objects to start the visualization from (e.g. `Account,MyObject__c`). If `all` is
    specified, every discovered object is included. If not specified, every object matching `--object-type` is included.
```

_See code: [lib/commands/simply/schema/visualize.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-schema@0.3.0/packages/simply-schema/lib/commands/simply/schema/visualize.js)_
