# summary

Archive the deployment config file used for a happy-soup deployment.

# description

Fetches and switches to the commit ref, then copies the deployment config file that was used (either --deploy-release-date resolved to `deployment-configs/<date>.json`, or the explicit/derived deploy config file) to `config/deploy.json` and commits it. If no source file can be found, an existing obsolete `config/deploy.json` is removed instead. Both cases push the change with a `[skip ci]` commit message.

# flags.ci-commit-ref-name.summary

The commit ref (branch) to fetch and switch to before archiving.

# flags.ci-pipeline-id.summary

The CI pipeline ID, used to build the authenticated push remote.

# flags.ci-project-path.summary

The project path (e.g. group/project), used to build the authenticated push remote.

# flags.project-access-token.summary

A project access token with write access, used to push the archive commit.

# flags.deploy-release-date.summary

The release date (e.g. 2026-01-15) used to resolve the source file as `deployment-configs/<date>.json`, taking priority over --deploy-config-file.

# flags.deploy-config-file.summary

Path to the deployment configuration file to archive, if --deploy-release-date is not provided.

# flags.source-branch-name.summary

The source branch name for the deployment, used to derive the deployment config file path if --deploy-config-file is not provided.

# examples

- <%= config.bin %> <%= command.id %> --ci-commit-ref-name main --ci-pipeline-id 123 --ci-project-path group/project --project-access-token $PROJECT_ACCESS_TOKEN --deploy-release-date 2026-01-15
