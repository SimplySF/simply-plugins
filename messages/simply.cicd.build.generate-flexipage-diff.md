# summary

Generate a FlexiPage delta between two commits and post the results to the merge request.

# description

Runs the upstream `flexipage-delta` binary to diff `**/*.flexipage-meta.xml` files between `--from` and `--to`, then `flexipage-delta-gitlab` to post the results back to the GitLab merge request. Both binaries are GitLab-specific, so this command isn't routed through the VCS provider abstraction. Failures are logged, not thrown — a diff-posting step shouldn't fail the build.

# examples

- <%= config.bin %> <%= command.id %> --ci-project-id 123 --ci-merge-request-iid 45 --from abc123 --to def456 --project-access-token glpat-...
