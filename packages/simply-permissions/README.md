# @simplysf/simply-permissions

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-permissions?label=@simplysf/simply-permissions)](https://npmjs.com/@simplysf/simply-permissions) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-permissions.svg)](https://npmjs.com/@simplysf/simply-permissions) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-permissions
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-plugins/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-plugins) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-plugins/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-plugins/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply permissions analyze`](#sf-simply-permissions-analyze)
- [`sf simply permissions assignment delete`](#sf-simply-permissions-assignment-delete)
- [`sf simply permissions build`](#sf-simply-permissions-build)

## `sf simply permissions analyze`

Analyze permission sets and permission set groups in an org.

```
USAGE
  $ sf simply permissions analyze -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-f <value>...] [--output
    <value>]

FLAGS
  -f, --filter=<value>...    Permission set or group names to include
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --output=<value>       [default: permissions_report.html] Output HTML file path

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Analyze permission sets and permission set groups in an org.

  Generates an HTML report of every permission set and permission set group in the target org, grouped by installed
  package, including their object and field permissions.

EXAMPLES
  $ sf simply permissions analyze --target-org myOrg

  $ sf simply permissions analyze --target-org myOrg --output reports/permissions.html --filter My_Permission_Set --filter Another_Set

FLAG DESCRIPTIONS
  -f, --filter=<value>...  Permission set or group names to include

    One or more PermissionSet (Name) or PermissionSetGroup (DeveloperName) API names to restrict the report to. If
    omitted, all permission sets and groups are included.

  --output=<value>  Output HTML file path

    The path to write the generated HTML report to.
```

_See code: [lib/commands/simply/permissions/analyze.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-permissions@3.0.0/packages/simply-permissions/lib/commands/simply/permissions/analyze.js)_

## `sf simply permissions assignment delete`

Delete PermissionSetAssignments for one or more PermissionSets/PermissionSetGroups.

```
USAGE
  $ sf simply permissions assignment delete -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-f <value>]
    [--permission-set-name <value>...] [--permission-set-group-name <value>...]

FLAGS
  -f, --file=<value>                          Path to a destructiveChanges.xml/package.xml-shaped file
  -o, --target-org=<value>                    (required) Username or alias of the target org. Not required if the
                                              `target-org` configuration variable is already set.
      --api-version=<value>                   Override the api version used for api requests made by this command
      --permission-set-group-name=<value>...  PermissionSetGroup DeveloperName(s) to delete assignments for
      --permission-set-name=<value>...        PermissionSet Name(s) to delete assignments for

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Delete PermissionSetAssignments for one or more PermissionSets/PermissionSetGroups.

  Deletes every `PermissionSetAssignment` against the named `PermissionSet`s and/or `PermissionSetGroup`s — the pre-step
  a destructive metadata deploy of the permission set/group itself needs, so it doesn't fail or leave orphaned
  assignments behind.

  Targets can be named either via `--file`, pointing at a `destructiveChanges.xml`/`package.xml`-shaped file whose
  `PermissionSet`/`PermissionSetGroup` type members are the targets, or via
  `--permission-set-name`/`--permission-set-group-name` flags (which may be combined with each other) for scripted or
  one-off use. `--file` is mutually exclusive with the two explicit-name flags.

EXAMPLES
  $ sf simply permissions assignment delete --file destructive/pre/destructiveChanges.xml --target-org myOrg

  $ sf simply permissions assignment delete --permission-set-name My_Permission_Set --target-org myOrg

  $ sf simply permissions assignment delete --permission-set-group-name My_Permission_Set_Group --target-org myOrg
```

_See code: [lib/commands/simply/permissions/assignment/delete.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-permissions@3.0.0/packages/simply-permissions/lib/commands/simply/permissions/assignment/delete.js)_

## `sf simply permissions build`

Generate permission sets from Salesforce source metadata.

```
USAGE
  $ sf simply permissions build [--json] [--flags-dir <value>] [--type read-only|view-all|modify-all] [-n <value>] [-d
    <value>] [-c <value>] [--output <value>] [--include-record-types] [--label <value>] [--description <value>]
    [--check]

FLAGS
  -c, --config=<value>        Path to a permission set configuration file
  -d, --directory=<value>     Path to the Salesforce project directory
  -n, --name=<value>          API name for the permission set
      --check                 Check that the generated permission sets are up to date, without writing them
      --description=<value>   Description for the permission set
      --include-record-types  Include record type visibilities
      --label=<value>         Label for the permission set
      --output=<value>        Output directory
      --type=<option>         Baseline permission type
                              <options: read-only|view-all|modify-all>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate permission sets from Salesforce source metadata.

  Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally) record types, then generates a
  permission set XML file with a baseline of permissions determined by --type. An optional JSON --config file can
  override individual object, field, tab, record type, and user permission settings, as well as whether the permission
  set requires activation.

  To regenerate every permission set in a project with one command, define each one in its own permission set build
  file: a JSON file whose name ends in .psbuild.json (for example config/app-admin.psbuild.json), with the same settings
  as one run of this command. "name", "type", "directory", and "output" are required; "label", "description",
  "includeRecordTypes", and "config" are optional. "config" is either a path to a --config file or the same overrides
  inline. Relative paths are resolved against the current directory, as they are for flags.

  {
  "name": "App_Admin",
  "type": "modify-all",
  "label": "App Admin",
  "directory": "force-app",
  "output": "force-app/main/default/permissionsets",
  "includeRecordTypes": true,
  "config": "config/app-admin-overrides.json"
  }

  Then run the command with none of the flags that describe a single permission set. It builds the permission set
  defined by every .psbuild.json file under the current directory, skipping node_modules, .git, .sf, and .sfdx. Every
  file, including referenced override files and source directories, is validated before anything is written, no two
  files can define the same permission set name, and each source directory is scanned only once. The results table shows
  which file defined each permission set. If no .psbuild.json files are found, the command prints a warning and exits
  successfully. `sf simply cicd build check-permission-sets` finds the same files.

  To check in CI that the committed permission sets still match their source metadata, add --check. It builds each
  permission set as usual but writes nothing: it compares each one with the file already at its output path and reports
  it as "up-to-date", "drifted", or "missing". If any permission set has drifted or is missing, the command exits with
  code 1. Formatting differences, such as indentation, line endings, or comments, don't count as drift, so files
  reformatted by Prettier still pass. Any other difference does, including hand edits and reordered entries.

EXAMPLES
  $ sf simply permissions build --type read-only --name My_Read_Only_Access --directory force-app --output force-app/main/default/permissionsets

  $ sf simply permissions build --type modify-all --name My_Admin_Access --directory force-app --config config/permission-overrides.json --output force-app/main/default/permissionsets --include-record-types

  Regenerate the permission set defined by every .psbuild.json file under the current directory:

    $ sf simply permissions build

  In CI, fail if any permission set defined by a .psbuild.json file needs to be regenerated, without writing anything:

    $ sf simply permissions build --check

FLAG DESCRIPTIONS
  -c, --config=<value>  Path to a permission set configuration file

    The path to a JSON file that overrides individual object, field, tab, record type, and user permission settings, as
    well as whether the permission set requires activation, on top of the --type baseline.

  -d, --directory=<value>  Path to the Salesforce project directory

    The path to the Salesforce source directory to scan for custom objects, fields, tabs, and record types. Required to
    build a single permission set.

  -n, --name=<value>  API name for the permission set

    The API name for the generated permission set; also used to derive the output filename. Required to build a single
    permission set.

  --check  Check that the generated permission sets are up to date, without writing them

    Instead of writing each permission set, compare what would be generated with the file already at its output path.
    Exits with code 1 if any permission set has drifted or is missing. Works with the single-permission-set flags, and
    without them, which checks the permission set defined by every .psbuild.json file under the current directory.

  --include-record-types  Include record type visibilities

    Automatically include record type visibilities discovered from the source metadata, marked as visible by default.

  --output=<value>  Output directory

    The directory to write the generated permission set XML file to. Required to build a single permission set.

  --type=read-only|view-all|modify-all  Baseline permission type

    The baseline permission level to generate: 'read-only' grants read access to all discovered objects and fields,
    'view-all' additionally grants view-all-records, and 'modify-all' grants full CRUD and modify-all-records access.
    Required to build a single permission set.
```

_See code: [lib/commands/simply/permissions/build.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-permissions@3.0.0/packages/simply-permissions/lib/commands/simply/permissions/build.js)_
<!-- commandsstop -->

## Configuration Files

### `sf simply permissions build --config`

The `--config` flag on `sf simply permissions build` takes the path to a JSON file that overrides the `--type` baseline permissions. Every top-level key is optional — only the settings you include are applied:

```json
{
  "objectPermissions": {
    "Account": { "allowRead": true, "allowCreate": true, "allowEdit": true, "viewAllRecords": true }
  },
  "fieldPermissions": {
    "Account.AnnualRevenue": { "readable": true, "editable": false }
  },
  "tabSettings": {
    "Account": { "visibility": "Visible" }
  },
  "recordTypeVisibilities": {
    "Account.Enterprise": { "visible": true }
  },
  "userPermissions": {
    "ApiEnabled": true
  },
  "hasActivationRequired": false
}
```

| Field                    | Type                                   | Keyed by                     | Description                                                                                                                                                                                |
| ------------------------ | -------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `objectPermissions`      | `Record<string, ObjectPerm>`           | Object API name              | Overrides object-level access. `ObjectPerm` fields: `allowRead`, `allowCreate`, `allowEdit`, `allowDelete`, `modifyAllRecords`, `viewAllRecords`, `viewAllFields` (all optional booleans). |
| `fieldPermissions`       | `Record<string, FieldPerm>`            | `Object.Field` API name      | Overrides field-level access. `FieldPerm` fields: `readable`, `editable` (optional booleans).                                                                                              |
| `tabSettings`            | `Record<string, TabSetting>`           | Tab API name                 | Overrides tab visibility. `TabSetting` fields: `visibility`: `Visible`, `Available`, or `None` (optional). A tab only the config names defaults to `None`.                                 |
| `recordTypeVisibilities` | `Record<string, RecordTypeVisibility>` | `Object.RecordType` API name | Overrides record type visibility. Fields: `visible` (optional boolean). Only applied when `--include-record-types` is also passed.                                                         |
| `userPermissions`        | `Record<string, boolean>`              | User permission API name     | Enables (`true`) or disables (`false`) individual user permissions.                                                                                                                        |
| `hasActivationRequired`  | `boolean`                              | —                            | Whether the generated permission set requires activation before it grants access. Defaults to `false`.                                                                                     |

## License

Licensed under the [Apache-2.0](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt) license.
