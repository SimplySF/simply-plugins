# summary

Run Apex tests against the target org for a project deployment.

# description

Authenticates to the target org and runs its Apex tests, if any exist in the project's package directories.

# flags.deploy-config-file.summary

Path to the deployment configuration file.

# examples

- <%= config.bin %> <%= command.id %> --ci-job-token $CI_JOB_TOKEN --alias my-org
