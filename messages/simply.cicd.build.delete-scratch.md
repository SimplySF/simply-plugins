# summary

Delete the scratch org created by `build create-scratch`.

# description

Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`) to confirm `--dev-hub` is the Dev Hub that owns the scratch org, re-authenticates to it and the scratch org as needed, and deletes it. Deletion failures are logged rather than thrown, since a scratch org left behind after a failed deletion just needs manual cleanup and shouldn't fail an otherwise-successful pipeline run.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# examples

- <%= config.bin %> <%= command.id %> --dev-hub my-devhub
