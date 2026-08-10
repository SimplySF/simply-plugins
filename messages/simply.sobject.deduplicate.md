# summary

Identify and prepare deduplication of an SObject's records.

# description

Queries an SObject, groups records by a composite key built from configured fields, and writes CSV files listing which records are unique and which are duplicates that should be deleted. For each associated object with lookups to the primary object, also writes a CSV of the lookup field updates needed to re-point duplicate references at the surviving unique record. This command does not perform any deletes or updates in the org; it only prepares the CSV files for a subsequent data load.

# flags.config.summary

Path to a deduplication configuration file

# flags.config.description

The path to a JSON file describing the primary object, its composite key fields, and any associated objects with lookups to it.

# flags.dry-run.summary

Skip calculating associated object lookup replacements

# flags.dry-run.description

When set, only the primary object's unique/duplicate CSV files are generated; associated object lookup replacement files are not calculated.

# flags.output-dir.summary

Output directory

# flags.output-dir.description

The directory to write the generated CSV files to. Defaults to ./temp/<primaryObjectApiName>.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg --config config/deduplicate-account.json

- <%= config.bin %> <%= command.id %> --target-org myOrg --config config/deduplicate-account.json --dry-run

# error.targetOrgConnectionFailed

Unable to establish connection to the org.

# error.invalidConfig

The deduplication configuration file is invalid: %s

# info.readingConfig

Reading and validating configuration file...

# info.queryingPrimary

Querying %s via the Bulk API...

# info.duplicatesFound

%s records identified as duplicates.

# info.calculatingReplacements

Calculating lookup replacements for associated objects...

# warning.blankCompositeKey

Record %s (%s) has the following blank composite key fields: %s

# warning.associatedObjectFailed

Failed to calculate lookup replacements for %s: %s
