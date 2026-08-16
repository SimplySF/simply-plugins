# summary

Generate a Flow delta between two commits and post the results to the merge request.

# description

Runs the upstream `flow-delta` binary to diff `**/*.flow-meta.xml` files between `--from` and `--to`, then `flow-delta-gitlab` to post the results back to the GitLab merge request. Both binaries are GitLab-specific, so this command isn't routed through the VCS provider abstraction. Failures are logged, not thrown — a diff-posting step shouldn't fail the build.

# examples

- <%= config.bin %> <%= command.id %> --ci-project-id 123 --ci-merge-request-iid 45 --from abc123 --to def456 --project-access-token glpat-...
