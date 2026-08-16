# summary

Delete the scratch org created by `build create-scratch`.

# description

Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`) to find which Dev Hub owns the scratch org, authenticates to that Dev Hub and the scratch org, and deletes it. Deletion failures are logged rather than thrown, since a scratch org left behind after a failed deletion just needs manual cleanup and shouldn't fail an otherwise-successful pipeline run.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# examples

- <%= config.bin %> <%= command.id %> --dev-hub-name main --dev-hub-username devhub@example.com --dev-hub-client-id 3MVG9... --dev-hub-instance-url https://login.salesforce.com --jwt-key-file ./server.key
