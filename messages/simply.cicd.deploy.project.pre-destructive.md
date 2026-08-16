# summary

Run the pre-destructive stage of a project deployment.

# description

Runs the `bin/preDestructive.sh` script (if present) against the local project directory, resuming from the deployment progress file unless --start-from is given.

# flags.deploy-config-file.summary

Path to the deployment configuration file.

# examples

- <%= config.bin %> <%= command.id %> --ci-job-token $CI_JOB_TOKEN --alias my-org
