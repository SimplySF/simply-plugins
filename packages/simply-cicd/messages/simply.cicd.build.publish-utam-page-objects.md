# summary

Compile the project's UTAM page objects for a package version and publish them to an npm registry.

# description

Gives every Salesforce Unlocked Package version a matching npm package of compiled UTAM page objects, so a UI-test suite can install exactly the page objects that describe the package version it is testing against.

Runs after `build create-package-version`, whose `04t` it takes as input — from `--subscriber-package-version-id`, from `SUBSCRIBER_PACKAGE_VERSION_ID` in the environment (how a separate job receives that command's dotenv report), or from the dotenv file itself (how a later step in the same job sees it). It compiles every `**/__utam__/**/*.utam.json` under the default package directory with the UTAM compiler, in a staging directory outside the repo, and publishes the result.

The npm version is derived from the Salesforce version number the same way `sfdx-project.json` writes a dependency pin: `1.2.3.4` becomes `1.2.3-4`, with the git tag's suffix carried as a second prerelease identifier and as the dist-tag, so `1.2.3.4` built from a `beta` package branch is `1.2.3-4.beta` at `beta`, and a release build is `1.2.3-4` at `latest`.

The compiler is installed at run time rather than shipped with this plugin, so nothing is downloaded unless the command actually runs.

Skips (without failing) when `PACKAGE_CHANGED=FALSE` is set in the environment (see `build determine-package-changes`), when `--disabled` is passed, when no package version ID can be found, when the project authors no page objects, or when this exact version is already on the registry — which is what makes retrying a job that died after publishing succeed rather than fail on a version conflict. Any other failure fails the job: a missing page-object package would silently break every UI test pinned to that version.

On success, appends `UTAM_PAGE_OBJECTS_PACKAGE` and `UTAM_PAGE_OBJECTS_VERSION` to `--out`, so a downstream job can install the package without knowing the mapping rule.

Configure the package name, the compiler's type aliases, extra peer dependencies, and a project-owned compiler config under `plugins.simply.utam` in `sfdx-project.json`.

# flags.packaging-devhub.summary

Alias of the Dev Hub that owns the package version. Must already be authenticated.

# flags.subscriber-package-version-id.summary

Subscriber package version ID (04t) to publish page objects for. Falls back to SUBSCRIBER_PACKAGE_VERSION_ID in the environment, then to the same key in --env-file.

# flags.npm-package-name.summary

npm package name to publish the page objects under. Required unless `plugins.simply.utam.packageName` is set in sfdx-project.json; the flag wins when both are present.

# flags.npm-registry.summary

Registry to publish to. Defaults to whatever npm itself is configured to use.

# flags.npm-token.summary

Auth token for the registry. Written to an .npmrc inside the staging directory only — the repo's own .npmrc is never touched.

# flags.npm-access.summary

Passed through to npm publish --access. Needed on npmjs.com to publish a scoped package publicly.

# flags.npm-dist-tag.summary

Dist-tag to publish under, overriding the one derived from the git tag's suffix.

# flags.ci-commit-ref-name.summary

Git branch or ref name being built. With --package-release-branch-prefix, reproduces the suffix `create-package-version` put on the git tag, so the npm version mirrors it.

# flags.package-release-branch-prefix.summary

Prefix identifying release branches. Determines whether the npm version and dist-tag carry a branch suffix.

# flags.utam-version.summary

npm version spec of the UTAM compiler to install and compile with.

# flags.dry-run.summary

Compile and pack the package without publishing it, copying the tarball into the project directory.

# flags.out.summary

Dotenv file to append the published package name and version to.

# flags.env-file.summary

Dotenv file to read SUBSCRIBER_PACKAGE_VERSION_ID from when it isn't passed as a flag or set in the environment.

# examples

- Publish page objects for the version this pipeline just created, reading its ID from the dotenv file:

  <%= config.bin %> <%= command.id %> --packaging-devhub my-packaging-devhub

- Publish to a GitLab project registry on a release-branch build:

  <%= config.bin %> <%= command.id %> --packaging-devhub my-packaging-devhub --ci-commit-ref-name release/1.2 --package-release-branch-prefix release/ --npm-registry https://gitlab.example.com/api/v4/projects/42/packages/npm/ --npm-token $CI_JOB_TOKEN

- Compile and pack without publishing, to inspect what would be produced:

  <%= config.bin %> <%= command.id %> --packaging-devhub my-packaging-devhub --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --dry-run
