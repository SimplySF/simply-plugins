# summary

Create a fallback git tag carrying forward the previous package version's ID, for builds that didn't produce a new package version.

# description

Resolves the last tag to increment (either `--last-tag`, or the closest reachable tag matching the project's version prefix), extracts its annotated `04t` package version ID, and creates/pushes a new tag with an incremented numeric suffix (e.g. `v1.1.0` -> `v1.1.0-1` -> `v1.1.0-2`) annotated with that same package ID. Soft no-ops (does not error) when no last tag, or no valid package ID within it, can be found — a build with nothing to fall back to just has nothing to do here.

Skipped automatically when `PACKAGE_CHANGED=TRUE` is set in the environment (see `build determine-package-changes`) — a real package version will be created instead.

# flags.last-tag.summary

Manually specify the last tag to increment, instead of resolving it from git.

# flags.out.summary

Output dotenv file path.

# examples

- <%= config.bin %> <%= command.id %> --ci-commit-ref-name main --ci-project-path group/project --project-access-token glpat-... --ci-pipeline-id 123
