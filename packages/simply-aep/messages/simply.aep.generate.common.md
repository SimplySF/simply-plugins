# flags.sobject.summary

API name of the SObject to generate for. The generators describe it in --target-org.

# flags.optional-target-org.summary

Org whose API version the generated metadata declares, when --api-version isn't given. Nothing is read from it.

# flags.flavor.summary

Framework to generate for: at4dx or fflib.

# flags.flavor.description

Sets the templates for every file: the interface and implementation shape, base classes, and whether Application Factory binding records are written. fflib writes none; at4dx writes one per layer.

# flags.prefix.summary

Class-name prefix, upper-cased and joined with an underscore (--prefix acme gives ACME_Accounts).

# flags.output-dir.summary

Directory to write into, relative to the project root unless absolute.

# flags.output-dir.description

Files go under main/classes, main/schema, and test/classes inside it. Defaults to generated-files, as apx's --output-path did, so generated paths don't move.

# flags.dry-run.summary

Show the files that would be written, and any validation issues, without writing anything.

# flags.overwrite.summary

Replace files that already exist at a planned path. Without it, the command refuses before writing anything.

# flags.force.summary

Write even if validation finds an error-severity issue the generated binding records would introduce. The issues are still printed and returned.

# error.sobjectNotFound

SObject %s wasn't found in the target org.

# error.nothingSelected

Select at least one artifact group: --selector, --domain, or --unit-of-work.

# error.filesExist

These files already exist, so nothing was written:
%s

# error.filesExist.actions

- Pass --overwrite to replace them.
- Use --output-dir to generate somewhere else.

# error.validationFailed

The generated binding records would introduce the error-severity issues above, so nothing was written.

# error.validationFailed.actions

- Fix the conflicting records, or
- Pass --force to write anyway.

# error.invalidOptions

%s

# warning.dryRunWouldRefuse

A real run would refuse to write: the generated binding records introduce error-severity issues. Pass --force to write anyway.

# warning.dryRunWouldOverwrite

A real run would refuse to write: %s planned file(s) already exist. Pass --overwrite to replace them.
