# summary

Analyze permission sets and permission set groups in an org.

# description

Generates an HTML report of every permission set and permission set group in the target org, grouped by installed package, including their object and field permissions.

# flags.output.summary

Output HTML file path

# flags.output.description

The path to write the generated HTML report to.

# flags.filter.summary

Permission set or group names to include

# flags.filter.description

One or more PermissionSet (Name) or PermissionSetGroup (DeveloperName) API names to restrict the report to. If omitted, all permission sets and groups are included.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

- <%= config.bin %> <%= command.id %> --target-org myOrg --output reports/permissions.html --filter My_Permission_Set --filter Another_Set

# error.targetOrgConnectionFailed

Unable to establish connection to the org.

# info.fetchingPermissionSets

Fetching permission sets and groups...

# info.resolvingPackages

Resolving package names...

# info.fetchingPermissions

Fetching object and field permissions...

# info.mappingGroups

Mapping permission sets to groups...

# info.generatingReport

Generating HTML report...

# info.reportGenerated

Report successfully generated at: %s
