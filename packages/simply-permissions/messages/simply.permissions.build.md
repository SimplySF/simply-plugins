# summary

Generate permission sets from Salesforce source metadata.

# description

Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally) record types, then generates a permission set XML file with a baseline of permissions determined by --type. An optional JSON --config file can override individual object, field, tab, record type, and user permission settings, as well as whether the permission set requires activation.

To regenerate every permission set in a project with one command, declare them all in a JSON file and pass it with --file instead of the other flags. Each entry in the file's "permissionSets" array takes the same settings as one run of this command; a top-level "defaults" object supplies the "directory", "output", and "includeRecordTypes" values shared by every entry, and any entry can override them. An entry's "config" is either a path to a --config file or the same overrides inline. Relative paths are resolved against the current directory, as they are for flags. The whole file, including referenced override files and source directories, is validated before anything is written, and each source directory is scanned only once. Name the file with the .psbuild.json suffix (for example config/app.psbuild.json): that's how `sf simply cicd build check-permission-sets` finds permission sets files, and this command warns about a file without it.

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

To check in CI that the committed permission sets still match their source metadata, add --check. It builds each permission set as usual but writes nothing: it compares each one with the file already at its output path and reports it as "up-to-date", "drifted", or "missing". If any permission set has drifted or is missing, the command exits with code 1. Formatting differences, such as indentation, line endings, or comments, don't count as drift, so files reformatted by Prettier still pass. Any other difference does, including hand edits and reordered entries.

# flags.file.summary

Path to a permission sets file declaring every permission set to generate

# flags.file.description

The path to a JSON file with a "permissionSets" array, each entry describing one permission set to generate ("name", "type", and optionally "label", "description", "directory", "output", "includeRecordTypes", "config"), and an optional "defaults" object. Name it with the .psbuild.json suffix; any other name works but prints a warning. Can't be combined with the flags that describe a single permission set.

# flags.type.summary

Baseline permission type

# flags.type.description

The baseline permission level to generate: 'read-only' grants read access to all discovered objects and fields, 'view-all' additionally grants view-all-records, and 'modify-all' grants full CRUD and modify-all-records access. Required unless --file is used.

# flags.name.summary

API name for the permission set

# flags.name.description

The API name for the generated permission set; also used to derive the output filename. Required unless --file is used.

# flags.directory.summary

Path to the Salesforce project directory

# flags.directory.description

The path to the Salesforce source directory to scan for custom objects, fields, tabs, and record types. Required unless --file is used.

# flags.config.summary

Path to a permission set configuration file

# flags.config.description

The path to a JSON file that overrides individual object, field, tab, record type, and user permission settings, as well as whether the permission set requires activation, on top of the --type baseline.

# flags.output.summary

Output directory

# flags.output.description

The directory to write the generated permission set XML file to. Required unless --file is used.

# flags.include-record-types.summary

Include record type visibilities

# flags.include-record-types.description

Automatically include record type visibilities discovered from the source metadata, marked as visible by default.

# flags.label.summary

Label for the permission set

# flags.description.summary

Description for the permission set

# flags.check.summary

Check that the generated permission sets are up to date, without writing them

# flags.check.description

Instead of writing each permission set, compare what would be generated with the file already at its output path. Exits with code 1 if any permission set has drifted or is missing. Works with --file and with the single-permission-set flags.

# examples

- <%= config.bin %> <%= command.id %> --type read-only --name My_Read_Only_Access --directory force-app --output force-app/main/default/permissionsets

- <%= config.bin %> <%= command.id %> --type modify-all --name My_Admin_Access --directory force-app --config config/permission-overrides.json --output force-app/main/default/permissionsets --include-record-types

- Regenerate every permission set declared in a permission sets file:

  <%= config.bin %> <%= command.id %> --file config/app.psbuild.json

- In CI, fail if any permission set declared in a permission sets file needs to be regenerated:

  <%= config.bin %> <%= command.id %> --file config/app.psbuild.json --check

# error.missingRequiredFlags

Missing required flag(s): %s. Provide them, or use --file to build every permission set declared in a permission sets file.

# error.invalidConfig

The configuration file %s is invalid: %s

# error.configNotFound

The configuration file %s does not exist.

# error.directoryNotFound

The source directory %s for permission set %s does not exist.

# error.scanFailed

Failed to scan the Salesforce project directory: %s

# info.readingConfig

Reading and validating configuration file...

# info.buildingPermissionSet

Building permission set %s...

# info.fileGenerated

Permission set successfully generated at %s

# info.filesGenerated

Successfully generated %s permission set(s).

# info.checkingPermissionSet

Checking permission set %s...

# info.upToDate

All %s permission set(s) are up to date.

# warning.drifted

%s of %s permission set(s) have drifted from their source metadata or are missing. Run this command without --check to regenerate them.

# warning.unsuffixedFile

%s doesn't end in .psbuild.json, so `sf simply cicd build check-permission-sets` won't find it. Rename it to %s.
