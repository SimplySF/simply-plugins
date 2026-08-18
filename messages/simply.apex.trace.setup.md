# summary

Configure a debug log trace flag for the current user, or another user.

# description

Creates or updates a 24-hour DEVELOPER_LOG trace flag for the user running the command, using a FINEST/FINER debug level suitable for the Apex Replay Debugger. Use --on-behalf-of to configure the trace flag for a different user instead.

# flags.on-behalf-of.summary

Configure the trace flag for another user, identified by a "Field:Value" pair.

# flags.on-behalf-of.description

Any unique User field can be used, for example "Username:someuser@example.com" or "FederationIdentifier:123456".

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

- <%= config.bin %> <%= command.id %> --target-org myOrg --on-behalf-of Username:someuser@example.com

- <%= config.bin %> <%= command.id %> --target-org myOrg --on-behalf-of FederationIdentifier:123456

# error.invalidOnBehalfOf

Invalid --on-behalf-of value: %s. Expected a "Field:Value" pair, for example "Username:someuser@example.com".

# error.userNotFound

User not found for %s

# error.ambiguousOnBehalfOf

Multiple users found for %s. Use a field/value pair that uniquely identifies one user.

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
