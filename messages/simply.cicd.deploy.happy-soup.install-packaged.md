# summary

Install packaged dependencies into the target org for a happy-soup deployment.

# description

Authenticates to the target org and installs the packaged dependencies declared in `sfdx-project.json`. For every dependency that upgrades an already-installed package, records the previous/target version and origin commit information to the deploy progress file, for `notify happy-soup` to look up related stories from later.

# flags.install-type.summary

The type of dependency installation to perform.

# flags.devhub-tooling-client-id.summary

Connected app client ID for JWT authentication to the tooling DevHub.

# flags.devhub-tooling-instance-url.summary

Login instance URL for the tooling DevHub.

# flags.devhub-tooling-username.summary

Username for JWT authentication to the tooling DevHub. Required (along with the other `--devhub-tooling-*` flags) to look up the previous/target version's origin commit information for upgraded packages; omitted entirely (with a warning) when not provided.

# examples

- <%= config.bin %> <%= command.id %> --alias my-org
