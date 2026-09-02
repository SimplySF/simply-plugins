# summary

Push source to the scratch org created by `build create-scratch`.

# description

Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`), authenticates as that scratch org, strips metadata types the scratch org push doesn't support (Einstein Conversation Agent file types), and runs `sf project deploy start`. When `--scratch-org-source-dir` is given, also deploys the default package directory's `seedMetadata.path`, if declared in `sfdx-project.json`.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# flags.ignore-warnings.summary

Append --ignore-warnings to the underlying sf project deploy start call.

# flags.scratch-org-source-dir.summary

Source directory to push to the scratch org, in addition to the default package directory.

# examples

- <%= config.bin %> <%= command.id %> --jwt-key-file ./server.key
