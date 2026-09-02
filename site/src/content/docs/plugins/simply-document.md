---
title: '@simplysf/simply-document'
description: 'Utilities for generating project documentation'
---

Utilities for generating project documentation

```sh
sf plugins install @simplysf/simply-document
```

## Commands

## `sf simply document diff`

Generate a change report between two git refs.

```
USAGE
  $ sf simply document diff --from-tag <value> --to-tag <value> [--json] [--flags-dir <value>] [--output-file <value>]
    [--template-file <value>] [--output-format html]

FLAGS
  --from-tag=<value>        (required) The starting git ref for the diff report.
  --output-file=<value>     Path to write the generated report to.
  --output-format=<option>  [default: html] Output format to render the report in.
                            <options: html>
  --template-file=<value>   Path to a custom Handlebars template to render instead of the built-in one.
  --to-tag=<value>          (required) The ending git ref for the diff report.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a change report between two git refs.

  Runs `git diff --name-status` between two git refs (tags, branches, or commits) in the current working directory,
  groups the changed files by Salesforce metadata component type, and renders a Confluence-storage-format change report
  suitable for pasting into a release or change-management page.

EXAMPLES
  $ sf simply document diff --from-tag v1.0.0 --to-tag v1.1.0

  $ sf simply document diff --from-tag v1.0.0 --to-tag v1.1.0 --output-file change-report.html

  $ sf simply document diff --from-tag v1.0.0 --to-tag v1.1.0 --template-file my-change-report.hbs

FLAG DESCRIPTIONS
  --output-file=<value>  Path to write the generated report to.

    When specified, the generated report is written to this path instead of being printed to the terminal.

  --output-format=html  Output format to render the report in.

    Currently only `html` is supported. Reserved for future formats (e.g. Markdown).

  --template-file=<value>  Path to a custom Handlebars template to render instead of the built-in one.

    When specified, this template is rendered with the same data the built-in report template receives, and can reuse
    the built-in `changeTable` partial. See this package's README "Custom Templates" section for the data shape and
    available partials.
```

_See code: [lib/commands/simply/document/diff.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-document@0.3.1/packages/simply-document/lib/commands/simply/document/diff.js)_

## `sf simply document generate`

Generate a technical design document for a Salesforce project.

```
USAGE
  $ sf simply document generate -d <value> --output-file <value> [--json] [--flags-dir <value>] [--template-file <value>]
    [--output-format html]

FLAGS
  -d, --directory=<value>       (required) Salesforce project source directory to scan.
      --output-file=<value>     (required) Path to write the generated document to.
      --output-format=<option>  [default: html] Output format to render the document in.
                                <options: html>
      --template-file=<value>   Path to a custom Handlebars template to render instead of the built-in one.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a technical design document for a Salesforce project.

  Scans a Salesforce DX project's source directory for metadata (objects, fields, Apex, Lightning components, flows,
  permissions, and more) and renders a Confluence-storage-format technical design document covering the data model,
  security model, groups/queues/permissions, solution inventory, and custom code inventory.

EXAMPLES
  $ sf simply document generate --directory force-app --output-file technical-design-document.html

  $ sf simply document generate --directory force-app --output-file technical-design-document.html --template-file my-tdd-template.hbs

FLAG DESCRIPTIONS
  --output-format=html  Output format to render the document in.

    Currently only `html` is supported. Reserved for future formats (e.g. Markdown).

  --template-file=<value>  Path to a custom Handlebars template to render instead of the built-in one.

    When specified, this template is rendered with the same scanned project data the built-in technical design document
    template receives, and can reuse the built-in `loud` helper. See this package's README "Custom Templates" section
    for the data shape.
```

_See code: [lib/commands/simply/document/generate.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-document@0.3.1/packages/simply-document/lib/commands/simply/document/generate.js)_
