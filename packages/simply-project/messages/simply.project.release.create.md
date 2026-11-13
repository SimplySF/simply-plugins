# summary

Cut the next release branch, with its version bumped in sfdx-project.json.

# description

Run this from a local clone, on the release branch to cut from, or pass `--source`. The new branch, such as `release/v1.3.0` from `release/v1.2.0`, starts from the remote's copy of the source, never from local commits, and gets one commit that bumps `sfdx-project.json`: `versionNumber` becomes `1.3.0.NEXT` in every package directory on the source's version, and the version inside `versionName` is replaced in place. Then the branch is pushed. A version that already has a branch is refused. A patch on an older line is allowed while newer releases exist, for hotfixes.

By default the chosen part of the version moves by one. To step by more, such as minors in tens (`release/v1.20.0` to `release/v1.30.0`), set `plugins.simply.release.increments` in `sfdx-project.json`, for example `{ "plugins": { "simply": { "release": { "increments": { "minor": 10 } } } } }`. It is read from the remote's copy of the source branch, so each new branch carries it forward. `--major-increment`, `--minor-increment`, and `--patch-increment`, or their `SIMPLY_PROJECT_RELEASE_*_INCREMENT` environment variables, override it for one run. Only the increment for the chosen `--type` is used, and the parts below it still reset to 0.

With `--create-release`, a GitLab or GitHub release for the version being closed out is published first, from the highest `v<version>.<build>` tag that is reachable from the source and on the remote. Fallback tags are skipped. A release that already exists is reported, not recreated. With `--set-default`, the new branch becomes the project's default after the push. Both need a token, from `--vcs-token` or `SIMPLY_VCS_TOKEN`, and a project ID, from `--vcs-project-id`, `SIMPLY_VCS_PROJECT_ID`, or `vcs.projectId` in `.sfdevrc.json`. These are checked before anything changes.

Your repository's commit hooks always run. The default commit message is `chore: bump version to {VERSION}`; use `--message` if your rules need something else, such as a ticket number. If a hook rejects the commit, nothing is pushed, and the bump stays staged on the new local branch. Run `git commit` with an accepted message, then run this command again from that branch.

The command never force-pushes or pushes tags. Pushing the new branch triggers a normal release-branch build, which creates the new release's first package version.

# flags.type.summary

Version to bump: major, minor, or patch. Asked for when omitted in a terminal.

# flags.major-increment.summary

How far a major release moves the major version. Defaults to plugins.simply.release.increments.major in sfdx-project.json, then 1.

# flags.minor-increment.summary

How far a minor release moves the minor version. Defaults to plugins.simply.release.increments.minor in sfdx-project.json, then 1.

# flags.patch-increment.summary

How far a patch release moves the patch version. Defaults to plugins.simply.release.increments.patch in sfdx-project.json, then 1.

# flags.source.summary

Release branch to cut from. Defaults to the current branch.

# flags.package-release-branch-prefix.summary

Prefix identifying release branches. Branch names must then be `[v]MAJOR.MINOR[.PATCH]`.

# flags.remote.summary

Remote holding the release branches.

# flags.message.summary

Commit message template, with an optional {VERSION} placeholder. Defaults to "chore: bump version to {VERSION}".

# flags.create-release.summary

Publish a GitLab or GitHub release for the source's version before cutting.

# flags.release-tag.summary

Tag to publish the release from, instead of the latest build tag. Implies --create-release.

# flags.set-default.summary

Make the new branch the project's default branch after pushing.

# flags.vcs-provider.summary

VCS platform. Defaults to SIMPLY_VCS_PROVIDER, then vcs.provider in .sfdevrc.json, then gitlab.

# flags.vcs-host.summary

VCS hostname, for a self-hosted instance. Defaults to SIMPLY_VCS_HOST, then vcs.host in .sfdevrc.json.

# flags.vcs-project-id.summary

GitLab project ID or GitHub owner/repo. Defaults to SIMPLY_VCS_PROJECT_ID, then vcs.projectId in .sfdevrc.json.

# flags.vcs-token.summary

VCS API token, needed only with --create-release, --release-tag, or --set-default.

# flags.dry-run.summary

Print the plan, including the tag a release would use, without changing anything.

# flags.no-prompt.summary

Don't ask for confirmation, or for --type.

# error.typeRequired

Pass --type with major, minor, or patch.

# prompt.type

Which version do you want to bump?

# type.major

Breaking changes

# type.minor

New features

# type.patch

Fixes for the current release

# confirm.release

Publish release %s from tag %s.

# confirm.branch

Create %s from %s, with version %s, and push it. The push starts a build that creates a package version.

# confirm.default

Make %s the project's default branch.

# confirm

This will:
%s

Continue?

# tableTitle

Release branch

# examples

- Cut the next minor release from the current release branch:

  <%= config.bin %> <%= command.id %> --type minor

- See what would happen, without changing anything:

  <%= config.bin %> <%= command.id %> --type minor --dry-run

- Cut a hotfix from an older release:

  <%= config.bin %> <%= command.id %> --type patch --source release/v1.2.0

- Also publish a release for the current version and make the new branch the default:

  <%= config.bin %> <%= command.id %> --type minor --create-release --set-default

- Cut a minor release ten minor versions on, such as release/v1.30.0 from release/v1.20.0:

  <%= config.bin %> <%= command.id %> --type minor --minor-increment 10

- Use a commit message your repository's rules accept:

  <%= config.bin %> <%= command.id %> --type minor --message "chore: PROJ-123 bump version to {VERSION}"

# spinner.working

Creating the release branch

# spinner.done

Release branch %s: %s
