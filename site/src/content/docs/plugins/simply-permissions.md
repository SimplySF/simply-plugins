---
title: '@simplysf/simply-permissions'
description: 'Utilities for working with permissions'
---

Utilities for working with permissions

```sh
sf plugins install @simplysf/simply-permissions
```

## Commands

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

_See code: [lib/commands/simply/permissions/analyze.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-permissions@1.3.13/packages/simply-permissions/lib/commands/simply/permissions/analyze.js)_

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

_See code: [lib/commands/simply/permissions/assignment/delete.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-permissions@1.3.13/packages/simply-permissions/lib/commands/simply/permissions/assignment/delete.js)_

## `sf simply permissions build`

Generate permission sets from Salesforce source metadata.

```
USAGE
  $ sf simply permissions build [--json] [--flags-dir <value>] [-f <value> | --type read-only|view-all|modify-all | -n <value>
    | -d <value> | --output <value> | -c <value> | --include-record-types | --label <value> | --description <value>]

FLAGS
  -c, --config=<value>        Path to a permission set configuration file
  -d, --directory=<value>     Path to the Salesforce project directory
  -f, --file=<value>          Path to a permission sets file declaring every permission set to generate
  -n, --name=<value>          API name for the permission set
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

  To regenerate every permission set in a project with one command, declare them all in a JSON file and pass it with
  --file instead of the other flags. Each entry in the file's "permissionSets" array takes the same settings as one run
  of this command; a top-level "defaults" object supplies the "directory", "output", and "includeRecordTypes" values
  shared by every entry, and any entry can override them. An entry's "config" is either a path to a --config file or the
  same overrides inline. Relative paths are resolved against the current directory, as they are for flags. The whole
  file, including referenced override files and source directories, is validated before anything is written, and each
  source directory is scanned only once.

  {
  "defaults": {
  "directory": "force-app",
  "output": "force-app/main/default/permissionsets"
  },
  "permissionSets": [
  { "name": "App_Read_Only", "type": "read-only" },
  {
  "name": "App_Admin",
  "type": "modify-all",
  "label": "App Admin",
  "includeRecordTypes": true,
  "config": "config/app-admin-overrides.json"
  },
  {
  "name": "App_Support",
  "type": "view-all",
  "config": { "userPermissions": { "ViewSetup": true } }
  }
  ]
  }

EXAMPLES
  $ sf simply permissions build --type read-only --name My_Read_Only_Access --directory force-app --output force-app/main/default/permissionsets

  $ sf simply permissions build --type modify-all --name My_Admin_Access --directory force-app --config config/permission-overrides.json --output force-app/main/default/permissionsets --include-record-types

  Regenerate every permission set declared in a permission sets file:

    $ sf simply permissions build --file config/permission-sets.json

FLAG DESCRIPTIONS
  -c, --config=<value>  Path to a permission set configuration file

    The path to a JSON file that overrides individual object, field, tab, record type, and user permission settings, as
    well as whether the permission set requires activation, on top of the --type baseline.

  -d, --directory=<value>  Path to the Salesforce project directory

    The path to the Salesforce source directory to scan for custom objects, fields, tabs, and record types. Required
    unless --file is used.

  -f, --file=<value>  Path to a permission sets file declaring every permission set to generate

    The path to a JSON file with a "permissionSets" array, each entry describing one permission set to generate ("name",
    "type", and optionally "label", "description", "directory", "output", "includeRecordTypes", "config"), and an
    optional "defaults" object. Can't be combined with the flags that describe a single permission set.

  -n, --name=<value>  API name for the permission set

    The API name for the generated permission set; also used to derive the output filename. Required unless --file is
    used.

  --include-record-types  Include record type visibilities

    Automatically include record type visibilities discovered from the source metadata, marked as visible by default.

  --output=<value>  Output directory

    The directory to write the generated permission set XML file to. Required unless --file is used.

  --type=read-only|view-all|modify-all  Baseline permission type

    The baseline permission level to generate: 'read-only' grants read access to all discovered objects and fields,
    'view-all' additionally grants view-all-records, and 'modify-all' grants full CRUD and modify-all-records access.
    Required unless --file is used.
```

_See code: [lib/commands/simply/permissions/build.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-permissions@1.3.13/packages/simply-permissions/lib/commands/simply/permissions/build.js)_
