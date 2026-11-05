---
title: 'Release branches'
description: 'The branching strategy simply-cicd expects for packaged projects, and how to roll releases forward.'
---

A packaged project is one repository holding one unlocked package. Each release branch is tied to one package version, such as `release/v1.2.0`, and the primary branch is itself one of these release branches rather than a literal `main`.

## What a release branch does

A branch counts as a release branch when its name contains the `--package-release-branch-prefix` value. Pushing to one runs [`build create-package-version`](/cicd/reference/build/), which creates a package version and tags the commit with an annotated tag holding its `04t` ID, such as `v1.2.0.5`. The tag's shape can be changed with the [version tag format](/cicd/concepts/sfdx-project-fields/).

Because the prefix check is a "contains" check, a working branch shouldn't have the prefix anywhere in its name, or its builds will create package versions too.

## Versions in flight

Several releases can be in progress at once, such as `release/v1.1.0` and `release/v1.2.0`. A fix on the lower one has to reach the higher one, or it regresses when the higher version ships. Merging it across is called rolling forward.

The merge has to be a real merge commit. That keeps each source tag reachable from the target, so you can see when a version entered a branch's history:

```bash
git tag --merged release/v1.2.0
```

A squash or rebase breaks this, because the tagged commits are no longer part of the target's history.

## Rolling forward

Run [`project release roll-forward`](/plugins/simply-project/#sf-simply-project-release-roll-forward), from the `@simplysf/simply-project` plugin, in a local clone:

```bash
sf simply project release roll-forward --dry-run
sf simply project release roll-forward
```

With no flags, it merges each release branch into the next higher one, stopping at the first conflict it can't resolve. It keeps the target's own `versionNumber`, `versionName`, `ancestorVersion`, and `ancestorId`, so a v1.2.0 branch keeps building v1.2.0 packages.

Your repository's commit hooks always run. The default commit message is git's own merge wording, `Merge branch 'release/v1.1.0' into release/v1.2.0`, which commitlint's default rules ignore. If your rules need something else, pass a template:

```bash
sf simply project release roll-forward --message "chore: PROJ-123 roll {SOURCE} into {TARGET}"
```

If a hook rejects the commit, the merge stays in progress. Run `git commit` with an accepted message, then run the command again. A pre-commit hook that rewrites files can add those changes to the merge commit.

Each branch it pushes triggers a normal release-branch build, which can create a package version.

If release branches are protected, use `--no-push` and open a merge request from the `roll-forward/...` branch it leaves behind. Merge that request with a merge commit.

A release abandoned without being merged looks like work to roll, so delete or rename its branch first.
