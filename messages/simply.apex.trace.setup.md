# summary

Configure a debug log trace flag for a user.

# description

Creates or updates a 24-hour DEVELOPER_LOG trace flag for the specified user, or the user running the command if --user-id isn't provided, using a FINEST/FINER debug level suitable for the Apex Replay Debugger.

# flags.user-id.summary

ID of the user to configure the trace flag for.

# flags.user-id.description

Defaults to the user running the command.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

- <%= config.bin %> <%= command.id %> --target-org myOrg --user-id 005XXXXXXXXXXXXXXX

# error.userNotFound

User not found for username: %s

# error.userIdNotFound

User not found for user ID: %s

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
