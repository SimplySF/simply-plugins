# summary

Back up SObject data to a CSV file.

# description

Describes the given SObject, queries every field via the Bulk API, and writes the results to a timestamped CSV file.

# flags.sobject.summary

SObject API name

# flags.sobject.description

The API name of the SObject to back up.

# flags.output-dir.summary

Output directory

# flags.output-dir.description

The directory to save the backup CSV file to. Defaults to the current directory.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account

- <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Custom_Object__c --output-dir backups

# error.targetOrgConnectionFailed

Unable to establish connection to the org.

# info.describingSobject

Describing SObject: %s...

# info.exportingData

Exporting data for %s...

# info.complete

Backed up %s records to: %s
