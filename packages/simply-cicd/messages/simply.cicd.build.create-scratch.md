# summary

Create a scratch org, trying each configured Dev Hub in order.

# description

Reads the default package directory's `definitionFile` from `sfdx-project.json` (falling back to `--scratch-definition-file`), and attempts creation against each `--dev-hub` alias in order (each must already be authenticated). A Dev Hub is skipped in favor of the next one when it has no scratch org signups left today (`DailyScratchOrgs`) or is already at its limit of active scratch orgs (`ActiveScratchOrgs`); a Dev Hub that hits either limit during the signup is also skipped. Writes the resulting org's auth fields to `SCRATCH_ORG_INFO.json` for later build steps, best-effort sets a default `CountryCode`, and assigns any permission sets/licenses declared under the default package directory's `packageMetadataAccess`.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# flags.scratch-definition-file.summary

Definition file used to create the scratch org, if not specified in sfdx-project.json.

# flags.scratch-duration-days.summary

Duration of the scratch org in days.

# examples

- <%= config.bin %> <%= command.id %> --dev-hub my-devhub
