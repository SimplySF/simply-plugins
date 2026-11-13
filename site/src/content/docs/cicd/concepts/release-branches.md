---
title: 'Release branches'
description: 'The branching strategy simply-cicd expects for packaged projects, and how to cut releases and roll them forward.'
---

A packaged project is one repository holding one unlocked package. Each release branch is tied to one package version, such as `release/v1.2.0`, and the primary branch is itself one of these release branches rather than a literal `main`.

## What a release branch does

A branch counts as a release branch when its name contains the `--package-release-branch-prefix` value. Pushing to one runs [`build create-package-version`](/cicd/reference/build/), which creates a package version and tags the commit with an annotated tag holding its `04t` ID, such as `v1.2.0.5`. The tag's shape can be changed with the [version tag format](/cicd/concepts/sfdx-project-fields/).

Because the prefix check is a "contains" check, a working branch shouldn't have the prefix anywhere in its name, or its builds will create package versions too.

## Cutting a release

A new release branch needs its version in two places: its name, and `versionNumber` in `sfdx-project.json`. Run [`project release create`](/plugins/simply-project/#sf-simply-project-release-create) on the release branch you're closing out to do both:

```bash
sf simply project release create --type minor --dry-run
sf simply project release create --type minor
```

From `release/v1.2.0`, this creates `release/v1.3.0` from the remote's copy of the branch, so unpushed local commits stay out. It commits one change, `versionNumber` becoming `1.3.0.NEXT`, with the version in `versionName` updated to match, and pushes the branch. That push starts the build for the new release's first package version. Use `--type patch --source release/v1.2.0` to cut a hotfix line while newer releases exist.

### Stepping by more than one

By default the chosen part of the version moves by one. If your project numbers releases in larger steps, such as minors in tens, declare that in `sfdx-project.json`:

```json
{
  "plugins": {
    "simply": {
      "release": { "increments": { "minor": 10 } }
    }
  }
}
```

Now `--type minor` from `release/v1.20.0` creates `release/v1.30.0`. Major and patch releases still move by one, and the parts below the bumped one still reset to 0. The setting is read from the remote's copy of the source branch, so each new branch inherits it. To override it for one run, pass `--major-increment`, `--minor-increment`, or `--patch-increment`, or set `SIMPLY_PROJECT_RELEASE_MAJOR_INCREMENT`, `SIMPLY_PROJECT_RELEASE_MINOR_INCREMENT`, or `SIMPLY_PROJECT_RELEASE_PATCH_INCREMENT`. Only the increment for the chosen `--type` is used.

Two GitLab or GitHub steps are optional:

```bash
export SIMPLY_VCS_TOKEN=<api token>
sf simply project release create --type minor --create-release --set-default
```

`--create-release` publishes a release for `v1.2.0` from its latest `v1.2.0.<build>` tag on the remote, skipping fallback tags. `--set-default` makes `release/v1.3.0` the project's default branch. The project ID comes from `--vcs-project-id`, `SIMPLY_VCS_PROJECT_ID`, or `vcs.projectId` in `.sfdevrc.json`.

As with rolling forward, commit hooks always run, and `--message` takes a template, here with a `{VERSION}` placeholder. If a hook rejects the commit, nothing is pushed: commit by hand on the new branch, then run the command again from there.

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
