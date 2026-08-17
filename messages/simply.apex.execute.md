# summary

Execute anonymous Apex code.

# description

Executes an anonymous block of Apex code from a local .apex file against a target org and reports the compile and execution results, including any debug logs produced.

# flags.file.summary

Path to Apex file

# flags.file.description

The path to the local .apex file containing the anonymous Apex code to execute.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg --file scripts/apex/data-fix.apex

# error.compileFailed

Compilation failed at line %s, column %s with the error: %s

# error.executeFailed

Execution failed with the error: %s

# info.failed

Failed
