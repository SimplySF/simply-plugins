# summary

Report on which objects and fields have field history tracking enabled.

# description

Identifies every object with field history tracking enabled, and every tracked field on each, resolving the managed/unlocked package each field belongs to, and writes the results to a timestamped CSV file and a browsable HTML report.

# flags.output-dir.summary

Output directory

# flags.output-dir.description

The directory to save the generated CSV and HTML report files to. Defaults to the current directory.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg

- <%= config.bin %> <%= command.id %> --target-org myOrg --output-dir reports

# info.identifyingObjects

Identifying objects with field history tracking enabled...

# info.objectsFound

Found %s object(s) with field history tracking enabled.

# info.retrievingFields

Retrieving tracked fields for each object (%s/%s)...

# info.resolvingPackages

Resolving package names for %s potential unlocked package field(s)...

# info.packagesResolved

Resolved names for %s package(s).

# info.writingCsv

Writing results to CSV...

# info.generatingHtml

Generating HTML report...

# info.complete

Found %s tracked object(s) and %s tracked field(s). CSV written to: %s. HTML report written to: %s
