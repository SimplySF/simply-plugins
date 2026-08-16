# summary

Create a new package version, verify minimum code coverage, and create/push a version-tracking git tag.

# description

Skips entirely (without error) when the pipeline was triggered by a merge request, or when this isn't a release-branch build and `--always-create-package` wasn't passed. Otherwise, creates a new version of the default package directory's package, polls until creation finishes, verifies the resulting version's Apex code coverage meets `--code-coverage-minimum` (or the project's own `plugins.simply.coverageRequirement.minimumCoverageRequired`, if declared in `sfdx-project.json`), and creates/pushes a git tag annotated with the new package version's `04t` ID.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# flags.ci-commit-sha.summary

Commit SHA to tag as the package version's source.

# flags.ci-pipeline-source.summary

Source trigger of the CI pipeline (e.g. merge_request_event). When set to merge_request_event, package creation is skipped.

# flags.ci-pipeline-url.summary

URL of the CI pipeline, used as the package version's description.

# flags.devhub-tooling-username.summary

Username of the Dev Hub used for tooling operations like package version creation.

# flags.devhub-tooling-client-id.summary

Connected app client ID for the tooling Dev Hub.

# flags.devhub-tooling-instance-url.summary

Login instance URL for the tooling Dev Hub.

# flags.always-create-package.summary

Create a package version even when this isn't a release-branch build.

# flags.code-coverage-minimum.summary

Minimum Apex code coverage percentage required for the new package version.

# flags.package-release-branch-prefix.summary

Prefix identifying release branches. Determines whether this build creates a package version and how the resulting git tag is named.

# examples

- <%= config.bin %> <%= command.id %> --ci-commit-ref-name main --ci-commit-sha a1b2c3d --ci-pipeline-id 123 --ci-pipeline-url https://gitlab.example.com/pipelines/123 --ci-project-path group/project --project-access-token glpat-... --devhub-tooling-username devhub-tooling@example.com --devhub-tooling-client-id 3MVG9... --devhub-tooling-instance-url https://login.salesforce.com --jwt-key-file ./server.key
