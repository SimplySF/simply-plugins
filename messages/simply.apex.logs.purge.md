# summary

Purge Apex debug logs.

# description

Deletes ApexLog records from the target org. By default all logs are purged; use --where to scope the deletion to a subset of logs.

# flags.where.summary

SOQL WHERE clause

# flags.where.description

A WHERE clause used to filter which ApexLog records are purged (e.g. "Status = 'Success'").

# flags.use-bulk-api.summary

Use Bulk API v2 to query and delete the logs.

# flags.use-bulk-api.description

Runs the whole purge as two Bulk API v2 jobs instead of a Tooling API query followed by chunked REST deletes. Bulk API processes the deletion asynchronously and does not consume the org's REST API request limit, which suits purges of tens of thousands of logs. For small purges the default REST path is faster, since it avoids the overhead of creating, uploading, and polling a job.

# flags.wait.summary

Number of minutes to wait for the Bulk API jobs to finish.

# flags.wait.description

Only applies with --use-bulk-api. The command polls the query and delete jobs until they complete or this timeout elapses, then throws.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

- <%= config.bin %> <%= command.id %> --target-org myOrg --where "Status = 'Success'"

- <%= config.bin %> <%= command.id %> --target-org myOrg --use-bulk-api

- <%= config.bin %> <%= command.id %> --target-org myOrg --use-bulk-api --wait 60

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
