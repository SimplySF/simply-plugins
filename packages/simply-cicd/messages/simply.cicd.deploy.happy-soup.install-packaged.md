# summary

Install packaged dependencies into the target org for a happy-soup deployment.

# description

Installs the packaged dependencies declared in `sfdx-project.json` into the target org (`--alias`), which must already be authenticated. For every dependency that upgrades an already-installed package, records the previous/target version and origin commit information to the deploy progress file, for `notify happy-soup` to look up related stories from later.

# flags.install-type.summary

The type of dependency installation to perform.

# flags.upgrade-type.summary

Upgrade type for the dependency installs; available only for unlocked packages.

# flags.upgrade-type.description

For package upgrades, specifies whether to mark all removed components as deprecated (DeprecateOnly), to delete removed components that can be safely deleted and deprecate the others (Mixed), or to delete all removed components, except for custom objects and custom fields, that don't have dependencies (Delete). The default is Mixed. DeprecateOnly and Delete only apply to unlocked package upgrades. Delete is not confirmed first: like every other prompt in a pipeline, it is auto-approved.

# flags.packaging-devhub.summary

Alias of the Dev Hub used to look up package version information for upgraded packages. Must already be authenticated. Omitted entirely (with a warning) when not provided, skipping origin lookup for upgraded packages.

# examples

- <%= config.bin %> <%= command.id %> --alias my-org
