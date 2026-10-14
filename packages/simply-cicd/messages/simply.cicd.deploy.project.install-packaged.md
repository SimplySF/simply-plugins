# summary

Install packaged dependencies and the project's own package into the target org.

# description

Installs the packaged dependencies declared in `sfdx-project.json`, then installs the project's own main package — prioritizing --subscriber-package-version-id if given, otherwise looking for a `04t...` package ID annotated on the git tag pointing at HEAD.

# flags.deploy-config-file.summary

Path to the deployment configuration file.

# flags.subscriber-package-version-id.summary

The subscriber package version ID (04t...) to install. If not provided, the ID is looked up from the git tag annotation at HEAD.

# flags.install-type.summary

The type of dependency installation to perform.

# flags.upgrade-type.summary

Upgrade type for the dependency installs and the project's own package install; available only for unlocked packages.

# flags.upgrade-type.description

For package upgrades, specifies whether to mark all removed components as deprecated (DeprecateOnly), to delete removed components that can be safely deleted and deprecate the others (Mixed), or to delete all removed components, except for custom objects and custom fields, that don't have dependencies (Delete). The default is Mixed. DeprecateOnly and Delete only apply to unlocked package upgrades. Delete is not confirmed first: like every other prompt in a pipeline, it is auto-approved.

# examples

- <%= config.bin %> <%= command.id %> --ci-job-token $CI_JOB_TOKEN --alias my-org
