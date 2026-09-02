# summary

Run the post-deploy stage of a project deployment.

# description

Runs the `bin/postDeploy.sh` script (if present) against the local project directory, resuming from the deployment progress file unless --start-from is given.

# examples

- <%= config.bin %> <%= command.id %> --ci-job-token $CI_JOB_TOKEN --alias my-org
