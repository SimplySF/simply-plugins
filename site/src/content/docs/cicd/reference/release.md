---
title: 'Release'
description: 'Command reference for maintaining release branches.'
---

## `sf simply cicd release roll-forward`

Merge each release branch into the next higher one, keeping version tags in the target's history.

```
USAGE
  $ sf simply cicd release roll-forward [--json] [--flags-dir <value>] [--source <value>] [--target <value>]
    [--package-release-branch-prefix <value>] [--remote <value>] [--message <value>] [--dry-run] [--no-push]
    [--no-prompt]

FLAGS
  --dry-run                                Print the planned merges and the tags each would bring in, without changing
                                           anything.
  --message=<value>                        Commit message template, with optional {SOURCE} and {TARGET} placeholders.
                                           Defaults to "Merge branch '{SOURCE}' into {TARGET}".
  --no-prompt                              Don't ask for confirmation before pushing.
  --no-push                                Stop after the first merge, leaving it on the roll-forward branch for a merge
                                           request. Merge that request with a merge commit, because a squash or rebase
                                           loses the tag history.
  --package-release-branch-prefix=<value>  [default: release/] Prefix identifying release branches. Branch names must
                                           then be `[v]MAJOR.MINOR[.PATCH]`; other branches are ignored.
  --remote=<value>                         [default: origin] Remote holding the release branches.
  --source=<value>                         Oldest release branch to roll from. Defaults to the lowest branch with work
                                           to roll.
  --target=<value>                         Newest release branch to roll into. Defaults to the highest release branch.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Merge each release branch into the next higher one, keeping version tags in the target's history.

  Run this from a local clone. Release branches are read from the remote and sorted numerically, and each is merged into
  the next higher one with a real merge commit, so a tag like `v1.1.0.13` stays reachable from `release/v1.2.0` and `git
  tag --merged` shows when that version arrived. With no flags, the whole chain is rolled, starting from the lowest
  branch with work to roll.

  The target keeps its own `versionNumber`, `versionName`, `ancestorVersion`, and `ancestorId` in `sfdx-project.json`,
  and `packageAliases` becomes the union of both sides. Any other conflict stops the command with the merge in progress
  on a `roll-forward/<source>-to-<target>` branch. Resolve it and run `git commit`, then run this command again, or run
  `git merge --abort` to give up on it. Later branches are left alone until then.

  Your repository's commit hooks always run. The default commit message is git's own merge wording, which commitlint's
  default rules ignore; use `--message` if your rules need something else, such as a ticket number. If a hook rejects
  the commit, the merge stays in progress: run `git commit` with an accepted message, then run this command again.

  The command never force-pushes or pushes tags. Each branch it pushes triggers a normal release-branch build, which can
  create a package version. If a push is rejected because the target moved, run the command again.

  A release that was abandoned without being merged looks like work to roll, so delete or rename its branch first.

EXAMPLES
  Roll every release branch forward:

    $ sf simply cicd release roll-forward

  See what would be rolled, without changing anything:

    $ sf simply cicd release roll-forward --dry-run

  Roll a single release into the next one:

    $ sf simply cicd release roll-forward --source release/v1.1.0 --target release/v1.2.0

  Use a commit message your repository's rules accept:

    $ sf simply cicd release roll-forward --message "chore: PROJ-123 roll {SOURCE} into {TARGET}"

  Prepare the merge for a merge request instead of pushing it:

    $ sf simply cicd release roll-forward --no-push
```

_See code: [lib/commands/simply/cicd/release/roll-forward.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.24.3/packages/simply-cicd/lib/commands/simply/cicd/release/roll-forward.js)_
