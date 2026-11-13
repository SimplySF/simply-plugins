# summary

Merge each release branch into the next higher one, keeping version tags in the target's history.

# description

Run this from a local clone. Release branches are read from the remote and sorted numerically, and each is merged into the next higher one with a real merge commit, so a tag like `v1.1.0.13` stays reachable from `release/v1.2.0` and `git tag --merged` shows when that version arrived. With no flags, the whole chain is rolled, starting from the lowest branch with work to roll.

The target keeps its own `versionNumber`, `versionName`, `ancestorVersion`, and `ancestorId` in `sfdx-project.json`, and `packageAliases` becomes the union of both sides. Any other conflict stops the command with the merge in progress on a `roll-forward/<source>-to-<target>` branch. Resolve it and run `git commit`, then run this command again, or run `git merge --abort` to give up on it. Later branches are left alone until then.

Your repository's commit hooks always run. The default commit message is git's own merge wording, which commitlint's default rules ignore; use `--message` if your rules need something else, such as a ticket number. If a hook rejects the commit, the merge stays in progress: run `git commit` with an accepted message, then run this command again.

The command never force-pushes or pushes tags. Each branch it pushes triggers a normal release-branch build, which can create a package version. If a push is rejected because the target moved, run the command again.

A release that was abandoned without being merged looks like work to roll, so delete or rename its branch first.

# flags.source.summary

Oldest release branch to roll from. Defaults to the lowest branch with work to roll.

# flags.target.summary

Newest release branch to roll into. Defaults to the highest release branch.

# flags.package-release-branch-prefix.summary

Prefix identifying release branches. Branch names must then be `[v]MAJOR.MINOR[.PATCH]`; other branches are ignored.

# flags.remote.summary

Remote holding the release branches.

# flags.message.summary

Commit message template, with optional {SOURCE} and {TARGET} placeholders. Defaults to "Merge branch '{SOURCE}' into {TARGET}".

# flags.dry-run.summary

Print the planned merges and the tags each would bring in, without changing anything.

# flags.no-push.summary

Stop after the first merge, leaving it on the roll-forward branch for a merge request. Merge that request with a merge commit, because a squash or rebase loses the tag history.

# flags.no-prompt.summary

Don't ask for confirmation before pushing.

# confirm

This rolls:
%s

Up to %s release branches will be pushed, and each push can create a package version. Continue?

# tableTitle

Release roll-forward

# examples

- Roll every release branch forward:

  <%= config.bin %> <%= command.id %>

- See what would be rolled, without changing anything:

  <%= config.bin %> <%= command.id %> --dry-run

- Roll a single release into the next one:

  <%= config.bin %> <%= command.id %> --source release/v1.1.0 --target release/v1.2.0

- Use a commit message your repository's rules accept:

  <%= config.bin %> <%= command.id %> --message "chore: PROJ-123 roll {SOURCE} into {TARGET}"

- Prepare the merge for a merge request instead of pushing it:

  <%= config.bin %> <%= command.id %> --no-push

# spinner.working

Rolling release branches forward

# spinner.done

Roll-forward finished: %s hop(s)

# spinner.declined

Roll-forward declined; nothing was changed
