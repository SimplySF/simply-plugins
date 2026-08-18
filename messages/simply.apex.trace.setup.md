# summary

Configure a debug log trace flag for a user.

# description

Creates or updates a DEVELOPER_LOG trace flag for the specified user, or the user running the command if --user-id isn't provided. By default the trace flag uses the FINEST/FINER "ReplayDebuggerLevels" debug level suitable for the Apex Replay Debugger and runs for 24 hours starting now; --log-level, --start-date, and --end-date override those defaults.

# flags.user-id.summary

ID of the user to configure the trace flag for.

# flags.user-id.description

Defaults to the user running the command.

# flags.log-level.summary

Developer name of an existing debug level to use for the trace flag.

# flags.log-level.description

Must already exist in the org; it's looked up but never created or modified. Defaults to the "ReplayDebuggerLevels" debug level, which is created automatically if it doesn't exist.

# flags.start-date.summary

Start date/time of the trace flag, as an ISO 8601 date-time.

# flags.start-date.description

Defaults to the current date/time.

# flags.end-date.summary

Expiration date/time of the trace flag, as an ISO 8601 date-time.

# flags.end-date.description

Defaults to 24 hours after the start date/time.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

- <%= config.bin %> <%= command.id %> --target-org myOrg --user-id 005XXXXXXXXXXXXXXX

- <%= config.bin %> <%= command.id %> --target-org myOrg --log-level MyCustomDebugLevel --start-date 2026-08-18T09:00:00Z --end-date 2026-08-19T09:00:00Z

# error.userNotFound

User not found for username: %s

# error.userIdNotFound

User not found for user ID: %s

# error.debugLevelNotFound

No debug level found with developer name: %s

# error.invalidDateTime

Invalid value for --%s: "%s". Expected an ISO 8601 date-time (e.g., 2026-08-18T14:30:00Z).

# error.invalidDateRange

--end-date (%s) must be after --start-date (%s).

# error.debugLevelCreateFailed

Failed to create the debug level: %s

# error.traceFlagCreateFailed

Failed to create the trace flag: %s

# info.findingUser

Finding current user...

# info.checkingDebugLevel

Checking debug level...

# info.configuringTraceFlag

Configuring trace flag...

# info.complete

Trace flag configured. Debug logs will be captured until %s.
