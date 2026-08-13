# summary

Update the Salesforce API version across a project's metadata.

# description

Recursively scans a directory for `-meta.xml` files and updates every `<apiVersion>` tag to the target version. If the directory contains an `sfdx-project.json` file, its `sourceApiVersion` property is updated to match.

# flags.directory.summary

Path to the Salesforce project directory

# flags.directory.description

The path to the Salesforce project directory to scan for metadata files.

# flags.api-version.summary

Target Salesforce API version

# flags.api-version.description

The Salesforce API version to set on all metadata files and, if present, sfdx-project.json.

# examples

- <%= config.bin %> <%= command.id %> --directory force-app --api-version 62.0

- <%= config.bin %> <%= command.id %> --directory . --api-version 63.0

# info.scanningDirectory

Scanning project directory for metadata files...

# info.complete

Updated %s file(s) to apiVersion %s.

# warning.projectFileUpdateFailed

Unable to update sfdx-project.json at %s: %s
