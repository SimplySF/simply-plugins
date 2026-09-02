# summary

Validate deployment configuration files for a project deployment.

# description

Validates `config/deploy.json` (or the path given by --deploy-config-file) and, if --deploy-rules-file is given, the deployment rules file. A missing file is skipped with a warning; a malformed or schema-invalid file fails the command.

# flags.deploy-config-file.summary

Path to the deployment configuration file.

# flags.deploy-progress-file.summary

Path to the deployment progress file. Accepted for consistency with the other project deployment commands; not used by validation.

# flags.deploy-rules-file.summary

Path to the deployment rules file.

# examples

- <%= config.bin %> <%= command.id %>

- <%= config.bin %> <%= command.id %> --deploy-config-file config/deploy.json --deploy-rules-file config/deploy-rules.json
