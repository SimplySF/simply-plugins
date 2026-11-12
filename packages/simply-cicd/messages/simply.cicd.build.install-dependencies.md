# summary

Install packaged dependencies into the scratch org created by `build create-scratch`.

# description

Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`), authenticates as that scratch org, and installs its packaged dependencies.

Skipped automatically when `SIMPLY_CICD_PACKAGE_CHANGED=FALSE` (or the deprecated `PACKAGE_CHANGED=FALSE`) is set in the environment (see `build determine-package-changes`).

# flags.install-type.summary

The type of dependency installation to perform.

# flags.upgrade-type.summary

Upgrade type for the dependency installs; available only for unlocked packages.

# flags.upgrade-type.description

For package upgrades, specifies whether to mark all removed components as deprecated (DeprecateOnly), to delete removed components that can be safely deleted and deprecate the others (Mixed), or to delete all removed components, except for custom objects and custom fields, that don't have dependencies (Delete). The default is Mixed. DeprecateOnly and Delete only apply to unlocked package upgrades. Delete is not confirmed first: like every other prompt in a pipeline, it is auto-approved.

# flags.retry-attempts.summary

Number of additional attempts to make if a package install fails, before giving up on that package. Defaults to 0 (no retries). Does not apply when the install is still In-Progress when polling times out, since retrying could race or duplicate an install that may still complete server-side. Overridden per-package by --package-retry-attempts.

# flags.retry-backoff.summary

Factor the delay between install retries grows by after each failed attempt (e.g. 2 doubles the delay each time). Only relevant when a package has retries enabled via --retry-attempts or --package-retry-attempts. Applies to every package's retries; there is no per-package override.

# flags.package-retry-attempts.summary

Number of retry attempts for a specific package, overriding --retry-attempts for that package only.

# flags.package-retry-attempts.description

Retry attempts for a specific package in the key:value format of SubscriberPackageVersionId:RetryAttempts. You can use an alias in place of the SubscriberPackageVersionId. Repeat this flag to set overrides for multiple packages. Packages not listed here use --retry-attempts.

# examples

- <%= config.bin %> <%= command.id %> --jwt-key-file ./server.key
