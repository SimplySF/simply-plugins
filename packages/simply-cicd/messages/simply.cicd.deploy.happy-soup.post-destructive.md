# summary

Run the post-destructive stage of a happy-soup deployment.

# description

Runs the `bin/postDestructive.sh` script (if present) for each configured deployment that participates in this stage, cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

# examples

- <%= config.bin %> <%= command.id %> --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
