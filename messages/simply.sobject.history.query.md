# summary

Query the field history of an SObject, with optional filtering.

# description

Queries the field history object for the given SObject (e.g. `AccountHistory`, `Custom_Object__History`, or `OpportunityFieldHistory`) and writes the results to a timestamped CSV file. An optional filter tree can be supplied to narrow the results: conditions on Field, CreatedById, CreatedDate, or the parent lookup field are pushed into the SOQL WHERE clause; conditions on any other field (e.g. OldValue or NewValue) are applied client-side after the query runs.

# flags.object.summary

SObject API name

# flags.object.description

The API name of the SObject to query field history for (e.g. Account or Custom_Object__c).

# flags.filters.summary

Path to a filter configuration file, or a raw JSON filter string

# flags.filters.description

A JSON object describing a tree of filter conditions: `{ "logic": "AND", "filters": [ { "field": "Field", "operator": "=", "value": "Status__c" } ] }`. Each entry in `filters` is either a condition (`field`, `operator`, `value`) or another nested group with its own `logic`/`filters`. Supported operators are =, !=, >, <, >=, <=, IN, NOT IN, and LIKE (using `%` as a wildcard).

# flags.output-dir.summary

Output directory

# flags.output-dir.description

The directory to save the query results CSV file to. Defaults to the current directory.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg --object Account

- <%= config.bin %> <%= command.id %> --target-org myOrg --object Custom_Object__c --filters config/history-filters.json

- <%= config.bin %> <%= command.id %> --target-org myOrg --object Account --filters '{"logic":"AND","filters":[{"field":"Field","operator":"=","value":"Name"}]}'

# error.targetOrgConnectionFailed

Unable to establish connection to the org.

# error.invalidFiltersJson

Invalid filter configuration: %s

# error.invalidFilters

Filter configuration failed validation: %s

# info.generatedSoql

Generated SOQL: %s

# info.queryingHistory

Querying %s records...

# info.complete

Queried %s records; wrote %s records to %s after filtering
