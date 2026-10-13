# summary

Create a new package version, verify minimum code coverage, and create/push a version-tracking git tag.

# description

Skips entirely (without error) when the pipeline was triggered by a merge request, or when this isn't a release-branch build and `--always-create-package` wasn't passed. Otherwise, creates a new version of the default package directory's package, polls until creation finishes, verifies the resulting version's Apex code coverage meets `--code-coverage-minimum` (or the project's own `plugins.simply.coverageRequirement.minimumCoverageRequired`, if declared in `sfdx-project.json`), and creates/pushes a git tag annotated with the new package version's `04t` ID.

The tag is `v<major>.<minor>.<patch>.<build>` by default. A project can choose its own shape with a `plugins.simply.versionTagFormat` template in `sfdx-project.json` — e.g. `{MAJOR}.{MINOR}.{PATCH}+{BUILD}` tags `1.2.3.4` as `1.2.3+4`. Each of `{MAJOR}`, `{MINOR}`, `{PATCH}`, and `{BUILD}` must appear exactly once, and the format is validated before any package version is created. Unless this is a release-branch build, the package directory's `branch` attribute or the CI ref is appended as `-<suffix>` after the formatted version.

Skipped automatically when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`).

# flags.ci-commit-sha.summary

Commit SHA to tag as the package version's source.

# flags.ci-pipeline-source.summary

Source trigger of the CI pipeline (e.g. merge_request_event). When set to merge_request_event, package creation is skipped.

# flags.ci-pipeline-url.summary

URL of the CI pipeline, used as the package version's description.

# flags.packaging-devhub.summary

Alias of the Dev Hub used for packaging operations like package version creation. Must already be authenticated.

# flags.always-create-package.summary

Create a package version even when this isn't a release-branch build.

# flags.code-coverage-minimum.summary

Minimum Apex code coverage percentage required for the new package version.

# flags.package-release-branch-prefix.summary

Prefix identifying release branches. Determines whether this build creates a package version and how the resulting git tag is named.

# examples

- <%= config.bin %> <%= command.id %> --ci-commit-ref-name main --ci-commit-sha a1b2c3d --ci-pipeline-id 123 --ci-pipeline-url https://gitlab.example.com/pipelines/123 --ci-project-path group/project --project-access-token glpat-... --packaging-devhub my-packaging-devhub
