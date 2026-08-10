# summary

Generate a permission set from Salesforce source metadata.

# description

Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally) record types, then generates a permission set XML file with a baseline of permissions determined by --type. An optional JSON --config file can override individual object, field, tab, record type, and user permission settings.

# flags.type.summary

Baseline permission type

# flags.type.description

The baseline permission level to generate: 'read-only' grants read access to all discovered objects and fields, 'view-all' additionally grants view-all-records, and 'modify-all' grants full CRUD and modify-all-records access.

# flags.name.summary

API name for the permission set

# flags.name.description

The API name for the generated permission set; also used to derive the output filename.

# flags.directory.summary

Path to the Salesforce project directory

# flags.directory.description

The path to the Salesforce source directory to scan for custom objects, fields, tabs, and record types.

# flags.config.summary

Path to a permission set configuration file

# flags.config.description

The path to a JSON file that overrides individual object, field, tab, record type, and user permission settings on top of the --type baseline.

# flags.output.summary

Output directory

# flags.output.description

The directory to write the generated permission set XML file to.

# flags.include-record-types.summary

Include record type visibilities

# flags.include-record-types.description

Automatically include record type visibilities discovered from the source metadata, marked as visible by default.

# flags.label.summary

Label for the permission set

# flags.description.summary

Description for the permission set

# examples

- <%= config.bin %> <%= command.id %> --type read-only --name My_Read_Only_Access --directory force-app --output force-app/main/default/permissionsets

- <%= config.bin %> <%= command.id %> --type modify-all --name My_Admin_Access --directory force-app --config config/permission-overrides.json --output force-app/main/default/permissionsets --include-record-types

# error.invalidConfig

The permission set configuration file is invalid: %s

# error.scanFailed

Failed to scan the Salesforce project directory: %s

# info.readingConfig

Reading and validating configuration file...

# info.scanningProject

Scanning Salesforce project directory...

# info.compilingPermissions

Compiling permissions baseline and configuration overrides...

# info.writingFile

Generating and writing permission set XML file...

# info.fileGenerated

Permission set successfully generated at %s
