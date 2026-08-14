# @simplysf/simply-schema

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-schema?label=@simplysf/simply-schema)](https://npmjs.com/@simplysf/simply-schema) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-schema.svg)](https://npmjs.com/@simplysf/simply-schema) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-schema
```

## Issues

Please report any issues at https://github.com/SimplySF/simply/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply schema visualize`](#sf-simply-schema-visualize)

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

_See code: [lib/commands/simply/schema/visualize.js](https://github.com/SimplySF/simply/blob/@simplysf/simply-schema@0.1.0/packages/simply-schema/lib/commands/simply/schema/visualize.js)_
<!-- commandsstop -->

## Data Source: `--target-org` vs. `--source-dir`

`sf simply schema visualize` builds its object/relationship data from exactly one source — specifying both, or neither, is an error:

- **`--target-org`** — queries the org's Tooling API (`EntityDefinition`, `FieldDefinition`, `Package2Member`) for every object and relationship field. Package names come from `Publisher.Name`. Objects that aren't in your starting set but have a lookup/master-detail field pointing back into it (reverse lookups) are automatically discovered and included.
- **`--source-dir`** — scans one or more local Salesforce DX source directories for `CustomObject`/`CustomField` metadata. Package/project names come from the source directory name a given object's files live under (e.g. `force-app`, `unpackaged`). Only objects with metadata actually present on disk are discovered — relationships to an object that was never found locally (a standard object with no local customization, for example) are silently dropped, since there's no local file to describe it. Use `--target-org` instead if you need the full picture including unmodified standard objects.

## Object & Field Selection

- **`--object-type`** / **`--field-type`** (`custom` | `standard` | `all`, both default `custom`) filter which objects are included in the starting set, and which relationship field types (only `Lookup`/`Master-Detail`/`MetadataRelationship` fields are ever considered relationships) are followed, respectively.
- **`--source-objects`** overrides the `--object-type` filter with an explicit, comma-separated list of API names to start from (e.g. `Account,MyObject__c`), or the literal value `all` to start from every discovered/described object regardless of `--object-type`.
- **`--related-objects`** restricts which _other_ objects a relationship is allowed to connect a source object to. Leave it unset to allow any object reachable via a valid relationship; set it to a comma-separated list to restrict to just those; set it to `all` to explicitly allow every object (equivalent to leaving it unset, but also disables the `--object-type` scoping `--source-dir` mode would otherwise apply when discovering related objects to reverse-lookup against).

## Output Files

Each `--output-type` writes one file into `--output-dir` (default: a new timestamped directory under `./temp/simply-schema-visualize/`):

| `--output-type` | File                 | Contents                                                                                                                                                                                        |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `html`          | `schema_report.html` | A self-contained, interactive page: a `vis-network` object-relationship diagram (drag/zoom/search/click-to-highlight) plus a searchable relationship data table. Open it directly in a browser. |
| `md`            | `schema_erd.md`      | A Markdown file containing a [Mermaid](https://mermaid.js.org/) `erDiagram` block, for embedding in a wiki page or `git`-reviewable design doc.                                                 |
| `csv`           | `schema.csv`         | One row per relationship: `SOURCE_OBJECT`, `SOURCE_PACKAGE`, `TARGET_OBJECT`, `TARGET_PACKAGE`, `FIELD_API_NAME`, `LABEL`, `IS_MASTER_DETAIL`.                                                  |

`--output-type` accepts a comma-separated list (e.g. `--output-type html,md,csv`); it defaults to `html,md`.
