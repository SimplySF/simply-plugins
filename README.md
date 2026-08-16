# @simplysf/simply-document

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-document?label=@simplysf/simply-document)](https://npmjs.com/@simplysf/simply-document) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-document.svg)](https://npmjs.com/@simplysf/simply-document) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-document
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-node) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-node/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply document diff`](#sf-simply-document-diff)
- [`sf simply document generate`](#sf-simply-document-generate)

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
<!-- commandsstop -->

## Custom Templates

Both commands render a built-in [Handlebars](https://handlebarsjs.com/) template by default. Pass `--template-file` to render your own template instead — it's compiled against the exact same Handlebars instance as the built-in template, so it can use any partial or helper the built-in template uses, and receives the exact same data.

A template file is just Handlebars source (typically saved with an `.hbs` extension, though the extension itself doesn't matter — the file is read as plain text). Nothing is auto-escaped as Confluence storage format or any other target; you control the entire output, so a custom template can produce plain HTML, Markdown, or anything else Handlebars can produce as text.

### `sf simply document diff --template-file`

The data passed to the template is a plain object keyed by **component type**, where each value is an array of changed-component records. A key is present only if at least one changed file mapped to that component type — check for a key's existence with `{{#if someKey}}` before iterating it, the same way the built-in template does.

Each entry in a component type's array has this shape:

| Field               | Type   | Description                                                                        |
| ------------------- | ------ | ---------------------------------------------------------------------------------- |
| `componentName`     | string | The component's name (e.g. `MyClass`, `MyObject__c`).                              |
| `componentType`     | string | The component type key this entry is grouped under (same as its parent key).       |
| `changeType`        | string | One of `Added`, `Modified`, `Renamed`, `Deleted`, `Copied`.                        |
| `changeDescription` | string | `Renamed from <oldPath>` / `Copied from <oldPath>` for renames/copies, else empty. |
| `path`              | string | The changed file's path, as reported by `git diff`.                                |

The possible top-level keys are:

```
standardObjects, customObjects, customSettings, customMetadataTypes, customMetadata, platformEvents,
apexClasses, apexTriggers, visualforcePages, lightningComponents, auraComponents, flows, flexipages,
approvalProcesses, customApplications, customLabels, staticResources, dashboards, reports, emailTemplates,
digitalExperienceBundles, experienceBundles, groups, queues, permissionSets, permissionSetGroups, sharingRules
```

A `changeTable` partial is pre-registered and available to your template — pass it any one of the arrays above to render the same table the built-in template uses:

```handlebars
<h1>My Custom Change Report</h1>

<h2>Apex Classes</h2>
{{#if apexClasses}}
  {{> changeTable apexClasses}}
{{else}}
  <p>No Apex class changes.</p>
{{/if}}
```

### `sf simply document generate --template-file`

The data passed to the template is a single object with one array-valued field per metadata category (every field is always present, though it may be empty). Every array item at minimum has a `name` field (or, for a few types noted below, an equivalent identifying field); most other fields are optional and only populated when the underlying metadata has a value.

| Field                      | Item type                                                            |
| -------------------------- | -------------------------------------------------------------------- |
| `standardObjects`          | [Object](#object-item)                                               |
| `customObjects`            | [Object](#object-item)                                               |
| `customSettings`           | [Object](#object-item)                                               |
| `customMetadataTypes`      | [Object](#object-item)                                               |
| `platformEvents`           | [Object](#object-item)                                               |
| `customMetadata`           | `{ name, label? }`                                                   |
| `apexClasses`              | `{ name, status?, apiVersion? }`                                     |
| `apexTriggers`             | `{ name, status?, apiVersion? }`                                     |
| `visualforcePages`         | `{ name, label?, description?, apiVersion? }`                        |
| `lightningComponents`      | `{ name, description?, apiVersion? }`                                |
| `auraComponents`           | `{ name, description?, apiVersion? }`                                |
| `flows`                    | `{ name, label?, processType?, description? }`                       |
| `flexipages`               | `{ name, masterLabel?, type? }`                                      |
| `approvalProcesses`        | `{ name, label?, active?, description? }`                            |
| `customApplications`       | `{ name, label?, description? }`                                     |
| `customLabels`             | `{ fullName?, shortDescription? }`                                   |
| `staticResources`          | `{ name, contentType?, cacheControl?, description? }`                |
| `dashboards`               | `{ name, folderName?, description? }`                                |
| `reports`                  | `{ name, folderName?, description? }`                                |
| `emailTemplates`           | `{ apiName, label?, type?, description? }`                           |
| `digitalExperienceBundles` | `{ name }`                                                           |
| `experienceBundles`        | `{ name }`                                                           |
| `groups`                   | `{ apiName?, label?, doesIncludeBosses? }`                           |
| `queues`                   | `{ name, label?, doesSendEmailToMembers?, queueObjects?: string[] }` |
| `permissionSets`           | `{ name, label?, description? }`                                     |
| `permissionSetGroups`      | `{ name, label?, description? }`                                     |
| `sharingRules`             | `{ label?, fullName?, object?, type?, accessLevel?, description? }`  |

#### Object item

`standardObjects`, `customObjects`, `customSettings`, `customMetadataTypes`, and `platformEvents` all share this shape (they're all backed by `CustomObject`-family metadata):

| Field                  | Type                    | Description                                                                                                                                                                                     |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | string                  | API name.                                                                                                                                                                                       |
| `label`                | string?                 | Label.                                                                                                                                                                                          |
| `miniDescription`      | string?                 | The object's description, with the org's `description: ... usage notes: ...` convention stripped down to just the description portion (or the raw description, if that convention wasn't used). |
| `sharingModel`         | string?                 | Internal sharing model (custom objects only).                                                                                                                                                   |
| `externalSharingModel` | string?                 | External sharing model (custom objects only).                                                                                                                                                   |
| `customSettingsType`   | string?                 | Set only for custom settings (`List` or `Hierarchy`).                                                                                                                                           |
| `eventType`            | string?                 | Set only for platform events.                                                                                                                                                                   |
| `publishBehavior`      | string?                 | Set only for platform events.                                                                                                                                                                   |
| `recordTypes`          | `RecordTypeItem[]?`     | `{ fullName, label?, active?, description? }`                                                                                                                                                   |
| `layouts`              | `LayoutItem[]?`         | `{ nameOnly? }`                                                                                                                                                                                 |
| `customFields`         | `CustomFieldItem[]?`    | See below.                                                                                                                                                                                      |
| `fieldSets`            | `FieldSetItem[]?`       | `{ fullName, label?, description?, displayedFields?: Array<{ field? }> }`                                                                                                                       |
| `validationRules`      | `ValidationRuleItem[]?` | `{ fullName, active?, description? }`                                                                                                                                                           |

A field in `customFields` has this shape:

| Field             | Type    | Description                                                                                                                                                                  |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fullName`        | string  | API name.                                                                                                                                                                    |
| `label`           | string? | Label.                                                                                                                                                                       |
| `type`            | string? | Display type — for `LongTextArea`/`Lookup`/`MasterDetail`/`Number`/`Text` fields this is already formatted as e.g. `Lookup(Account)`, `Number(18,0)`, ready to render as-is. |
| `required`        | string? | `"true"`/`"false"` (a string, not a boolean, matching the underlying metadata).                                                                                              |
| `externalId`      | string? | `"true"`/`"false"`.                                                                                                                                                          |
| `unique`          | string? | `"true"`/`"false"`.                                                                                                                                                          |
| `miniDescription` | string? | Same convention as the object's `miniDescription`.                                                                                                                           |

A `loud` helper is pre-registered and available to your template — it upper-cases a string, handy for rendering the `"true"`/`"false"` string fields above the way the built-in template does (`{{#if this.required}}{{loud this.required}}{{else}}FALSE{{/if}}`):

```handlebars
<h1>My Custom Technical Design Document</h1>

<h2>Apex Classes</h2>
<ul>
  {{#each apexClasses}}
    <li>{{this.name}} ({{loud this.status}})</li>
  {{/each}}
</ul>

<h2>Custom Objects</h2>
{{#each customObjects}}
  <h3>{{this.label}}</h3>
  {{#each this.customFields}}
    <p>{{this.label}} — {{this.type}}</p>
  {{/each}}
{{/each}}
```
