# @simplysf/simply-project

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-project?label=@simplysf/simply-project)](https://npmjs.com/@simplysf/simply-project) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-project.svg)](https://npmjs.com/@simplysf/simply-project) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-project
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-plugins/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-plugins) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-plugins/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-plugins/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply project release create`](#sf-simply-project-release-create)
- [`sf simply project release roll-forward`](#sf-simply-project-release-roll-forward)
- [`sf simply project update api-version`](#sf-simply-project-update-api-version)

## `sf simply project release create`

Cut the next release branch, with its version bumped in sfdx-project.json.

```
USAGE
  $ sf simply project release create [--json] [--flags-dir <value>] [-t major|minor|patch] [--major-increment <value>]
    [--minor-increment <value>] [--patch-increment <value>] [--source <value>] [--package-release-branch-prefix <value>]
    [--remote <value>] [--message <value>] [--create-release] [--release-tag <value>] [-s] [--vcs-provider
    gitlab|github] [--vcs-host <value>] [--vcs-project-id <value>] [--vcs-token <value>] [--dry-run] [--no-prompt]

FLAGS
  -s, --set-default                            Make the new branch the project's default branch after pushing.
  -t, --type=<option>                          Version to bump: major, minor, or patch. Asked for when omitted in a
                                               terminal.
                                               <options: major|minor|patch>
      --create-release                         Publish a GitLab or GitHub release for the source's version before
                                               cutting.
      --dry-run                                Print the plan, including the tag a release would use, without changing
                                               anything.
      --major-increment=<value>                [env: SIMPLY_PROJECT_RELEASE_MAJOR_INCREMENT] How far a major release
                                               moves the major version. Defaults to
                                               plugins.simply.release.increments.major in sfdx-project.json, then 1.
      --message=<value>                        Commit message template, with an optional {VERSION} placeholder. Defaults
                                               to "chore: bump version to {VERSION}".
      --minor-increment=<value>                [env: SIMPLY_PROJECT_RELEASE_MINOR_INCREMENT] How far a minor release
                                               moves the minor version. Defaults to
                                               plugins.simply.release.increments.minor in sfdx-project.json, then 1.
      --no-prompt                              Don't ask for confirmation, or for --type.
      --package-release-branch-prefix=<value>  [default: release/] Prefix identifying release branches. Branch names
                                               must then be `[v]MAJOR.MINOR[.PATCH]`.
      --patch-increment=<value>                [env: SIMPLY_PROJECT_RELEASE_PATCH_INCREMENT] How far a patch release
                                               moves the patch version. Defaults to
                                               plugins.simply.release.increments.patch in sfdx-project.json, then 1.
      --release-tag=<value>                    Tag to publish the release from, instead of the latest build tag. Implies
                                               --create-release.
      --remote=<value>                         [default: origin] Remote holding the release branches.
      --source=<value>                         Release branch to cut from. Defaults to the current branch.
      --vcs-host=<value>                       VCS hostname, for a self-hosted instance. Defaults to SIMPLY_VCS_HOST,
                                               then vcs.host in .sfdevrc.json.
      --vcs-project-id=<value>                 GitLab project ID or GitHub owner/repo. Defaults to
                                               SIMPLY_VCS_PROJECT_ID, then vcs.projectId in .sfdevrc.json.
      --vcs-provider=<option>                  VCS platform. Defaults to SIMPLY_VCS_PROVIDER, then vcs.provider in
                                               .sfdevrc.json, then gitlab.
                                               <options: gitlab|github>
      --vcs-token=<value>                      [env: SIMPLY_VCS_TOKEN] VCS API token, needed only with --create-release,
                                               --release-tag, or --set-default.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Cut the next release branch, with its version bumped in sfdx-project.json.

  Run this from a local clone, on the release branch to cut from, or pass `--source`. The new branch, such as
  `release/v1.3.0` from `release/v1.2.0`, starts from the remote's copy of the source, never from local commits, and
  gets one commit that bumps `sfdx-project.json`: `versionNumber` becomes `1.3.0.NEXT` in every package directory on the
  source's version, and the version inside `versionName` is replaced in place. Then the branch is pushed. A version that
  already has a branch is refused. A patch on an older line is allowed while newer releases exist, for hotfixes.

  By default the chosen part of the version moves by one. To step by more, such as minors in tens (`release/v1.20.0` to
  `release/v1.30.0`), set `plugins.simply.release.increments` in `sfdx-project.json`, for example `{ "plugins": {
  "simply": { "release": { "increments": { "minor": 10 } } } } }`. It is read from the remote's copy of the source
  branch, so each new branch carries it forward. `--major-increment`, `--minor-increment`, and `--patch-increment`, or
  their `SIMPLY_PROJECT_RELEASE_*_INCREMENT` environment variables, override it for one run. Only the increment for the
  chosen `--type` is used, and the parts below it still reset to 0.

  With `--create-release`, a GitLab or GitHub release for the version being closed out is published first, from the
  highest `v<version>.<build>` tag that is reachable from the source and on the remote. Fallback tags are skipped. A
  release that already exists is reported, not recreated. With `--set-default`, the new branch becomes the project's
  default after the push. Both need a token, from `--vcs-token` or `SIMPLY_VCS_TOKEN`, and a project ID, from
  `--vcs-project-id`, `SIMPLY_VCS_PROJECT_ID`, or `vcs.projectId` in `.sfdevrc.json`. These are checked before anything
  changes.

  Your repository's commit hooks always run. The default commit message is `chore: bump version to {VERSION}`; use
  `--message` if your rules need something else, such as a ticket number. If a hook rejects the commit, nothing is
  pushed, and the bump stays staged on the new local branch. Run `git commit` with an accepted message, then run this
  command again from that branch.

  The command never force-pushes or pushes tags. Pushing the new branch triggers a normal release-branch build, which
  creates the new release's first package version.

EXAMPLES
  Cut the next minor release from the current release branch:

    $ sf simply project release create --type minor

  See what would happen, without changing anything:

    $ sf simply project release create --type minor --dry-run

  Cut a hotfix from an older release:

    $ sf simply project release create --type patch --source release/v1.2.0

  Also publish a release for the current version and make the new branch the default:

    $ sf simply project release create --type minor --create-release --set-default

  Cut a minor release ten minor versions on, such as release/v1.30.0 from release/v1.20.0:

    $ sf simply project release create --type minor --minor-increment 10

  Use a commit message your repository's rules accept:

    $ sf simply project release create --type minor --message "chore: PROJ-123 bump version to {VERSION}"
```

_See code: [lib/commands/simply/project/release/create.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-project@1.6.0/packages/simply-project/lib/commands/simply/project/release/create.js)_

## `sf simply project release roll-forward`

Merge each release branch into the next higher one, keeping version tags in the target's history.

```
USAGE
  $ sf simply project release roll-forward [--json] [--flags-dir <value>] [--source <value>] [--target <value>]
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

    $ sf simply project release roll-forward

  See what would be rolled, without changing anything:

    $ sf simply project release roll-forward --dry-run

  Roll a single release into the next one:

    $ sf simply project release roll-forward --source release/v1.1.0 --target release/v1.2.0

  Use a commit message your repository's rules accept:

    $ sf simply project release roll-forward --message "chore: PROJ-123 roll {SOURCE} into {TARGET}"

  Prepare the merge for a merge request instead of pushing it:

    $ sf simply project release roll-forward --no-push
```

_See code: [lib/commands/simply/project/release/roll-forward.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-project@1.6.0/packages/simply-project/lib/commands/simply/project/release/roll-forward.js)_

## `sf simply project update api-version`

Update the Salesforce API version across a project's metadata.

```
USAGE
  $ sf simply project update api-version -d <value> -a <value> [--json] [--flags-dir <value>]

FLAGS
  -a, --api-version=<value>  (required) Target Salesforce API version
  -d, --directory=<value>    (required) Path to the Salesforce project directory

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Update the Salesforce API version across a project's metadata.

  Recursively scans a directory for `-meta.xml` files and updates every `<apiVersion>` tag to the target version. If the
  directory contains an `sfdx-project.json` file, its `sourceApiVersion` property is updated to match.

EXAMPLES
  $ sf simply project update api-version --directory force-app --api-version 62.0

  $ sf simply project update api-version --directory . --api-version 63.0

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target Salesforce API version

    The Salesforce API version to set on all metadata files and, if present, sfdx-project.json.

  -d, --directory=<value>  Path to the Salesforce project directory

    The path to the Salesforce project directory to scan for metadata files.
```

_See code: [lib/commands/simply/project/update/api-version.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-project@1.6.0/packages/simply-project/lib/commands/simply/project/update/api-version.js)_
<!-- commandsstop -->

## License

Licensed under the [Apache-2.0](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt) license.
