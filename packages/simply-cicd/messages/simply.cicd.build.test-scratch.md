# summary

Run Apex tests against the scratch org created by `build create-scratch`.

# description

Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`), authenticates as that scratch org, and runs its Apex tests with `RunLocalTests`.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# flags.disable-apex-tests.summary

Skip running Apex tests, without skipping the rest of the job.

# examples

- <%= config.bin %> <%= command.id %> --jwt-key-file ./server.key
