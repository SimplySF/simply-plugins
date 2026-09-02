# summary

Validate deployment configuration files for a happy-soup deployment.

# description

Validates the deployment config file (explicit, or derived from --source-branch-name) and, if --deploy-rules-file is given, the deployment rules file. A missing file is skipped with a warning; a malformed or schema-invalid file fails the command.

# flags.deploy-config-file.summary

Path to the deployment configuration file. If not provided, derived from --source-branch-name.

# flags.deploy-progress-file.summary

Path to the deployment progress file. Accepted for consistency with the other happy-soup deployment commands; not used by validation.

# flags.source-branch-name.summary

The source branch name for the deployment, used to derive the deployment config file path if --deploy-config-file is not provided.

# examples

- <%= config.bin %> <%= command.id %> --source-branch-name release/uat

- <%= config.bin %> <%= command.id %> --deploy-config-file deployment-configs/uat.json --deploy-rules-file config/deploy-rules.json
