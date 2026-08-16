# summary

Validate deployment configuration files against their JSON schemas.

# description

Validates the deployment config file (`deploy.json`) and deployment rules file independently against their schemas. A missing file is skipped with a warning; a malformed or schema-invalid file fails the command.

This is the generic form of the command, with no namespace-specific default file paths — see `deploy project validate` and `deploy happy-soup validate` for versions with sensible defaults for those deployment styles.

# flags.deploy-config-file.summary

Path to the deployment configuration file.

# flags.deploy-rules-file.summary

Path to the deployment rules file.

# flags.source-branch-name.summary

The source branch name for the deployment, used to derive the deployment config file path if --deploy-config-file is not provided.

# examples

- <%= config.bin %> <%= command.id %> --deploy-config-file config/deploy.json --deploy-rules-file config/deploy-rules.json
