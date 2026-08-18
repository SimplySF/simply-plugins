# summary

Configure a debug log trace flag for the current user, or another user.

# description

Creates or updates a DEVELOPER_LOG trace flag for the target user, using the FINEST/FINER "ReplayDebuggerLevels" debug level suitable for the Apex Replay Debugger and running for 24 hours starting now, by default. Use --on-behalf-of to configure the trace flag for a different user instead; --log-level, --start-date, and --end-date override the other defaults.

# flags.on-behalf-of.summary

Configure the trace flag for another user, identified by a "Field:Value" pair.

# flags.on-behalf-of.description

Any unique User field can be used, for example "Username:someuser@example.com" or "FederationIdentifier:123456".

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

- <%= config.bin %> <%= command.id %> --target-org myOrg --on-behalf-of Username:someuser@example.com

- <%= config.bin %> <%= command.id %> --target-org myOrg --on-behalf-of FederationIdentifier:123456

- <%= config.bin %> <%= command.id %> --target-org myOrg --log-level MyCustomDebugLevel --start-date 2026-08-18T09:00:00Z --end-date 2026-08-19T09:00:00Z

# error.invalidOnBehalfOf

Invalid --on-behalf-of value: %s. Expected a "Field:Value" pair, for example "Username:someuser@example.com".

# error.userNotFound

User not found for %s

# error.ambiguousOnBehalfOf

Multiple users found for %s. Use a field/value pair that uniquely identifies one user.

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
