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

# flags.include-relationship-fields.summary

Include parent relationship fields

# flags.include-relationship-fields.description

For every lookup/master-detail field, describe its parent SObject and include its identifying fields (e.g. RecordTypeId includes RecordType.Name and RecordType.DeveloperName). Polymorphic relationship fields, such as OwnerId, are skipped.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account

- <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Custom_Object__c --output-dir backups

- <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --include-relationship-fields

# info.describingSobject

Describing SObject: %s...

# info.discoveringRelationshipFields

Discovering relationship fields...

# info.exportingData

Exporting data for %s...

# info.complete

Backed up %s records to: %s
