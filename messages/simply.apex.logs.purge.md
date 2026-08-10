# summary

Purge Apex debug logs.

# description

Deletes ApexLog records from the target org. By default all logs are purged; use --where to scope the deletion to a subset of logs.

# flags.where.summary

SOQL WHERE clause

# flags.where.description

A WHERE clause used to filter which ApexLog records are purged (e.g. "Status = 'Success'").

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

- <%= config.bin %> <%= command.id %> --target-org myOrg --where "Status = 'Success'"

# error.targetOrgConnectionFailed

Unable to establish connection to the org.

# info.queryingLogs

Querying Apex logs...

# info.noLogsToPurge

No logs to purge.

# info.purgingLogs

Purging %s Apex logs...

# info.allPurged

Successfully purged %s Apex logs.

# warning.someFailed

Successfully purged %s logs, but failed to delete %s logs. See the Error column for details.
