# summary

Install packaged dependencies into the target org for a happy-soup deployment.

# description

Installs the packaged dependencies declared in `sfdx-project.json` into the target org (`--alias`), which must already be authenticated. For every dependency that upgrades an already-installed package, records the previous/target version and origin commit information to the deploy progress file, for `notify happy-soup` to look up related stories from later.

# flags.install-type.summary

The type of dependency installation to perform.

# flags.packaging-devhub.summary

Alias of the Dev Hub used to look up package version information for upgraded packages. Must already be authenticated. Omitted entirely (with a warning) when not provided, skipping origin lookup for upgraded packages.

# examples

- <%= config.bin %> <%= command.id %> --alias my-org
