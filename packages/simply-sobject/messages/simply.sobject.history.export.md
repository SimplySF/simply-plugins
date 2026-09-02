# summary

Export field history for an SObject within a date range to a CSV file.

# description

Queries the field history object for the given SObject (e.g. `AccountHistory`, `Custom_Object__History`, or `OpportunityFieldHistory`) for changes created within the given date range, and writes the results to a timestamped CSV file.

# flags.sobject.summary

SObject API name

# flags.sobject.description

The API name of the SObject to export field history for (e.g. Account or Custom_Object__c).

# flags.start-date.summary

Start date (YYYY-MM-DD)

# flags.start-date.description

The start of the date range to export history for, inclusive.

# flags.end-date.summary

End date (YYYY-MM-DD)

# flags.end-date.description

The end of the date range to export history for, inclusive.

# flags.output-dir.summary

Output directory

# flags.output-dir.description

The directory to save the exported CSV file to. Defaults to the current directory.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --start-date 2026-01-01 --end-date 2026-01-31

- <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Custom_Object__c --start-date 2026-01-01 --end-date 2026-01-31 --output-dir exports

# error.invalidDate

Invalid value for --%s: "%s". Expected a date in YYYY-MM-DD format.

# info.exportingHistory

Exporting history for %s...

# info.complete

Exported %s history records to: %s
