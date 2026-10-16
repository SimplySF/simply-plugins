# simply_apex_execute

Run anonymous Apex from a local `.apex` file against an org and return whether it compiled and ran, with the debug log it produced.

Use this to run a one-off script: inspect data, check what a class returns, or reproduce a bug. Write the script to a file in the project first (for example `scripts/apex/check.apex`) and pass its path in `file`. Put `System.debug(...)` calls in the script to see values; they come back in `logs`. Logs longer than 100,000 characters are cut to their last 100,000 (`logsTruncated` is then true).

Anonymous Apex can insert, update and delete records, so this tool needs an explicit `target_org`. When the script doesn't compile or throws, the result is an error giving the line, column and message.

For running Apex tests, deploying or SOQL queries, use the Salesforce DX MCP server (`@salesforce/mcp`) instead.

# simply_apex_trace_setup

Create or update a debug log trace flag (`DEVELOPER_LOG`) for a user so their activity in the org produces debug logs.

By default it traces the user `target_org` is logged in as, for 24 hours from now, with the FINEST/FINER `ReplayDebuggerLevels` debug level, which the Apex Replay Debugger needs. Use `on_behalf_of` (`Field:Value`, for example `Username:jane@example.com`) to trace someone else, `log_level` to use a different existing debug level by developer name, and `start_date`/`end_date` (ISO 8601) to change the window.

Run this before reproducing a bug in the org, then fetch the logs with the Salesforce CLI.

# simply_apex_trace_silence

Stop the given Apex classes from writing to debug logs by giving each one a 24-hour class-level trace flag with every log category set to NONE.

Use this when framework classes flood the logs and push out the lines you need. Pass class names in `classes`, a JSON file listing them in `classes_file`, and/or set `fflib`, `at4dx` or `force_di` to silence those frameworks' well-known classes. A class that already has a trace flag gets its expiry extended.

Classes that aren't found in the org come back in `missingClassNames`. Trace flags that couldn't be created or updated come back in `failures`.

# simply_apex_logs_purge

Delete `ApexLog` records (debug logs) from an org: all of them, or only the ones matching `where`.

`where` is a SOQL condition on `ApexLog` without the `WHERE` keyword, for example `LogUserId = '005...'` or `StartTime < LAST_N_DAYS:1`. Set `use_bulk_api` for many thousands of logs: it runs as a Bulk API job and doesn't spend REST API requests. `wait` is how many minutes to wait for that job.

The deletion can't be undone, so this tool is only registered when the server runs with `--allow destructive`.

# simply_apex_test_suite_generate

Write an `ApexTestSuite` metadata file listing every `@IsTest` class in the given source directories.

Pass one or more `source_dir` paths (for example `force-app`), the suite `name`, and the `output_dir` to write `<name>.testSuite-meta.xml` into. An existing file with that name is overwritten. This reads and writes local files only and never contacts an org. Deploy the file with the Salesforce CLI afterwards if the suite should exist in an org.

# error.compileFailed

Compilation failed at line %s, column %s with the error: %s

# error.executeFailed

Execution failed with the error: %s

# error.fileNotFound

file %s does not exist.

# error.invalidOnBehalfOf

Invalid on_behalf_of value: %s. Expected a "Field:Value" pair, for example "Username:someuser@example.com".

# error.userNotFound

User not found for %s

# error.ambiguousOnBehalfOf

Multiple users found for %s. Use a field/value pair that uniquely identifies one user.

# error.debugLevelNotFound

No debug level found with developer name: %s

# error.invalidDateRange

end_date (%s) must be after start_date (%s).

# error.debugLevelCreateFailed

Failed to create the debug level: %s

# error.traceFlagCreateFailed

Failed to create the trace flag: %s

# error.noClassesSpecified

No Apex classes specified to silence. Use classes, classes_file, fflib, at4dx, and/or force_di.

# error.invalidClassesFile

The classes file is invalid: %s

# error.noTestClassesFound

No @IsTest-annotated classes were found in the given source director(y/ies).

# error.scanFailed

Failed to scan the given source director(y/ies): %s
