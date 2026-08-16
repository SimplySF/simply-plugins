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

# examples

- <%= config.bin %> <%= command.id %> --ci-job-token $CI_JOB_TOKEN --alias my-org
