# summary

Configure a debug log trace flag for the current user.

# description

Creates or updates a 24-hour DEVELOPER_LOG trace flag for the user running the command, using a FINEST/FINER debug level suitable for the Apex Replay Debugger.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

# error.targetOrgConnectionFailed

Unable to establish connection to the org.

# error.userNotFound

User not found for username: %s

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
