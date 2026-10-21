# summary

Generate permission sets from Salesforce source metadata.

# description

Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally) record types, then generates a permission set XML file with a baseline of permissions determined by --type. An optional JSON --config file can override individual object, field, tab, record type, and user permission settings, as well as whether the permission set requires activation.

To regenerate every permission set in a project with one command, define each one in its own permission set build file: a JSON file whose name ends in .psbuild.json (for example config/app-admin.psbuild.json), with the same settings as one run of this command. "name", "type", "directory", and "output" are required; "label", "description", "includeRecordTypes", and "config" are optional. "config" is either a path to a --config file or the same overrides inline. Relative paths are resolved against the current directory, as they are for flags.

    {
      "name": "App_Admin",
      "type": "modify-all",
      "label": "App Admin",
      "directory": "force-app",
      "output": "force-app/main/default/permissionsets",
      "includeRecordTypes": true,
      "config": "config/app-admin-overrides.json"
    }

Then run the command with none of the flags that describe a single permission set. It builds the permission set defined by every .psbuild.json file under the current directory, skipping node_modules, .git, .sf, and .sfdx. Every file, including referenced override files and source directories, is validated before anything is written, no two files can define the same permission set name, and each source directory is scanned only once. The results table shows which file defined each permission set. If no .psbuild.json files are found, the command prints a warning and exits successfully. `sf simply cicd build check-permission-sets` finds the same files.

To check in CI that the committed permission sets still match their source metadata, add --check. It builds each permission set as usual but writes nothing: it compares each one with the file already at its output path and reports it as "up-to-date", "drifted", or "missing". If any permission set has drifted or is missing, the command exits with code 1. Formatting differences, such as indentation, line endings, or comments, don't count as drift, so files reformatted by Prettier still pass. Any other difference does, including hand edits and reordered entries.

# flags.type.summary

Baseline permission type

# flags.type.description

The baseline permission level to generate: 'read-only' grants read access to all discovered objects and fields, 'view-all' additionally grants view-all-records, and 'modify-all' grants full CRUD and modify-all-records access. Required to build a single permission set.

# flags.name.summary

API name for the permission set

# flags.name.description

The API name for the generated permission set; also used to derive the output filename. Required to build a single permission set.

# flags.directory.summary

Path to the Salesforce project directory

# flags.directory.description

The path to the Salesforce source directory to scan for custom objects, fields, tabs, and record types. Required to build a single permission set.

# flags.config.summary

Path to a permission set configuration file

# flags.config.description

The path to a JSON file that overrides individual object, field, tab, record type, and user permission settings, as well as whether the permission set requires activation, on top of the --type baseline.

# flags.output.summary

Output directory

# flags.output.description

The directory to write the generated permission set XML file to. Required to build a single permission set.

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

Instead of writing each permission set, compare what would be generated with the file already at its output path. Exits with code 1 if any permission set has drifted or is missing. Works with the single-permission-set flags, and without them, which checks the permission set defined by every .psbuild.json file under the current directory.

# examples

- <%= config.bin %> <%= command.id %> --type read-only --name My_Read_Only_Access --directory force-app --output force-app/main/default/permissionsets

- <%= config.bin %> <%= command.id %> --type modify-all --name My_Admin_Access --directory force-app --config config/permission-overrides.json --output force-app/main/default/permissionsets --include-record-types

- Regenerate the permission set defined by every .psbuild.json file under the current directory:

  <%= config.bin %> <%= command.id %>

- In CI, fail if any permission set defined by a .psbuild.json file needs to be regenerated, without writing anything:

  <%= config.bin %> <%= command.id %> --check

# error.missingRequiredFlags

Missing required flag(s): %s. Provide them, or omit all of the single permission set flags to build every .psbuild.json file under the current directory.

# error.invalidBuildFile

Permission set build file %s: %s

# error.legacyFormat

%s uses the old format, a "permissionSets" list, which is no longer supported. Split it into one .psbuild.json file per permission set, with each permission set's settings at the top level.

# error.duplicateName

Permission set %s is defined by both %s and %s. Each permission set must be defined by exactly one .psbuild.json file.

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

# info.filesFound

Found %s permission set build file(s).

# info.checkingPermissionSet

Checking permission set %s...

# info.upToDate

All %s permission set(s) are up to date.

# warning.drifted

%s of %s permission set(s) have drifted from their source metadata or are missing. Run this command without --check to regenerate them.

# warning.noFilesFound

No permission set build files (files ending in .psbuild.json) found under the current directory. Nothing to build.
