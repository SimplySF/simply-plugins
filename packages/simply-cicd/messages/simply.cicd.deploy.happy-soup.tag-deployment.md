# summary

Tag the current commit with details about a happy-soup deployment.

# description

Authenticates to the target org, derives an org domain prefix from its instance URL, and creates an annotated git tag (`deployed--<org-domain-prefix>-<timestamp>`) recording the deployment time (America/New_York) and, if provided, the associated pipeline and merge request links. The tag is pushed to the source repository.

# flags.ci-merge-request-iid.summary

The merge request's internal ID (IID), used to build the merge request link in the tag message.

# flags.ci-merge-request-project-url.summary

The project's URL, used to build the merge request link in the tag message.

# flags.ci-pipeline-id.summary

The CI pipeline ID.

# flags.ci-pipeline-url.summary

The CI pipeline URL, included in the tag message if provided.

# flags.ci-project-path.summary

The project path (e.g. group/project), used to build the authenticated push remote.

# flags.project-access-token.summary

A project access token with write access, used to push the tag.

# examples

- <%= config.bin %> <%= command.id %> --alias my-org --ci-pipeline-id 123 --ci-pipeline-url https://gitlab.example.com/group/project/-/pipelines/123 --ci-project-path group/project --ci-merge-request-iid 45 --ci-merge-request-project-url https://gitlab.example.com/group/project --project-access-token $PROJECT_ACCESS_TOKEN
