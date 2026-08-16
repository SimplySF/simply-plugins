# summary

Run the pre-destructive stage of a happy-soup deployment.

# description

Runs the `bin/preDestructive.sh` script (if present) for each configured deployment that participates in this stage, cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

# flags.deploy-config-file.summary

Path to the deployment configuration file. If not provided, derived from --source-branch-name.

# flags.source-branch-name.summary

The source branch name for the deployment, used to derive the deployment config file path if --deploy-config-file is not provided.

# examples

- <%= config.bin %> <%= command.id %> --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
