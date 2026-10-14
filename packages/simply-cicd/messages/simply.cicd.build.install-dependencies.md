# summary

Install packaged dependencies into the scratch org created by `build create-scratch`.

# description

Reads `SCRATCH_ORG_INFO.json` (written by `build create-scratch`), authenticates as that scratch org, and installs its packaged dependencies.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# flags.install-type.summary

The type of dependency installation to perform.

# flags.upgrade-type.summary

Upgrade type for the dependency installs; available only for unlocked packages.

# flags.upgrade-type.description

For package upgrades, specifies whether to mark all removed components as deprecated (DeprecateOnly), to delete removed components that can be safely deleted and deprecate the others (Mixed), or to delete all removed components, except for custom objects and custom fields, that don't have dependencies (Delete). The default is Mixed. DeprecateOnly and Delete only apply to unlocked package upgrades. Delete is not confirmed first: like every other prompt in a pipeline, it is auto-approved.

# examples

- <%= config.bin %> <%= command.id %> --jwt-key-file ./server.key
