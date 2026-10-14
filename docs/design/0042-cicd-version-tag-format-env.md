# 0042 — `SIMPLY_CICD_VERSION_TAG_FORMAT` override for the version tag format

**Status:** Implemented ([#63](https://github.com/SimplySF/simply-plugins/pull/63))
**Package:** `packages/simply-cicd`
**Date:** 2026-10-14

## Problem

[0040](0040-cicd-version-tag-format.md) made the version tag format configurable, but only through
`plugins.simply.versionTagFormat` in `sfdx-project.json`. Changing it means a commit to every
project repository. A team that runs many repositories from one shared pipeline template, or that
wants to try a format out in one pipeline before committing to it, has no way to set it from the
pipeline. 0040 left exactly this as an open question.

## Decision

Read an optional `SIMPLY_CICD_VERSION_TAG_FORMAT` environment variable in
`VersionTagFormat.fromProject`. When it's set to a non-empty value it wins over the project setting,
which still wins over the default. Every command that writes or reads a version tag already
resolves its format through `fromProject`, so all of them pick it up from that one spot.

## Behavior

| `SIMPLY_CICD_VERSION_TAG_FORMAT` | `plugins.simply.versionTagFormat` | Format used                        |
| -------------------------------- | --------------------------------- | ---------------------------------- |
| unset or `''`                    | unset                             | `v{MAJOR}.{MINOR}.{PATCH}.{BUILD}` |
| unset or `''`                    | `X`                               | `X`                                |
| `Y`                              | anything                          | `Y`                                |

- It applies to `create-package-version`, `determine-package-changes`, `create-fallback-tag`,
  `publish-utam-page-objects`, and `cloneRepo` (dependency clones in the deploy commands). That
  includes `create-fallback-tag` when `sfdx-project.json` can't be read, which used to fall straight
  back to the default.
- The value goes through the same validation as the project setting. An invalid value fails the
  command, and the error names `SIMPLY_CICD_VERSION_TAG_FORMAT` rather than
  `plugins.simply.versionTagFormat`, so it's clear which one to fix. `determine-package-changes`
  keeps its usual contract: it logs the error and defaults to `PACKAGE_CHANGED=TRUE`.
- An empty string counts as unset, matching how the project setting treats `''`. CI systems often
  define a variable as empty instead of leaving it out.

## Alternatives considered

- **A `--version-tag-format` flag with `env: 'SIMPLY_CICD_VERSION_TAG_FORMAT'` on each command.**
  This is the usual `SIMPLY_CICD_*` shape, but 0040 already rejected a per-command flag: the four
  commands run as separate jobs and have to agree on the format. A flag also wouldn't reach
  `cloneRepo`, which runs inside the deploy commands. It would need a fifth flag or plumbing through
  `deployProject`/happy-soup. Reading the env var in one place covers every reader, and a pipeline
  can't set it differently for two commands in the same job.
- **The project setting overriding the env var.** That's the wrong direction for the use case. The
  point is to change the format without editing the repository.

## Implementation plan

1. `versionTagFormat.ts`: add `VERSION_TAG_FORMAT_ENV_VAR`. `fromProject` checks it first.
   `VersionTagFormatError` takes an optional `source` (defaulting to the config path) so the message
   names where the bad format came from.
2. `createFallbackTag.ts`: the unreadable-project fallback calls `fromProject(undefined)` instead of
   parsing the default directly.
3. `messages/simply.cicd.build.{create-package-version,determine-package-changes,create-fallback-tag}.md`,
   the site's `environment-variables.md` and `sfdx-project-fields.md`, and README regeneration. No
   flags change, so `command-snapshot.json` doesn't move.

## Testing

- `versionTagFormat.test.ts`: the env var overrides both the project setting and the default; an
  empty value is ignored; an invalid value's error names the variable.
- `createFallbackTag.test.ts`: the env var overrides the project's format for both the glob and the
  next tag, and still applies when `sfdx-project.json` can't be read.

## Open questions

None.
