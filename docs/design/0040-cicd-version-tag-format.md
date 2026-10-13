# 0040 — Configurable version tag format for `simply cicd build`

**Status:** Implemented (PR pending)
**Package:** `packages/simply-cicd`
**Date:** 2026-10-13

## Problem

`simply cicd build create-package-version` records every package version it creates as an
annotated git tag, and the shape of that tag is hard-coded:

```
v<major>.<minor>.<patch>.<build>[-<branch or ref>]
```

`v1.2.3.4` is not a semantic version: semver has three numeric parts, so tooling that reads tags as
versions (release-notes generators, changelog tools, Renovate/Dependabot, GitLab/GitHub release
pages, a team's own scripts) either rejects it or misreads it. Teams that already have a tag
convention — `1.2.3+4` (build as semver build metadata), `1.2.3-4` (the form `sfdx-project.json`
itself uses for a dependency pin), `release/1.2.3.4` — can't adopt the pipeline without abandoning
it.

The tag isn't write-only, either. Four other places read it back, each assuming the `v` prefix and
the dotted four-part shape:

| Reader                                       | What it assumes                                                                    |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `build determine-package-changes`            | `git describe --match 'v<major>.<minor>.<patch>*'` finds the last release tag      |
| `build create-fallback-tag`                  | same match pattern; next tag = `^(v.*)-(\d+)$` with the counter incremented        |
| `build publish-utam-page-objects`            | the branch suffix is whatever follows `v<version>-` in the tag                     |
| `cloneRepo` (happy-soup / dependency clones) | a dependency pinned at `Pkg@1.2.3-4` lives at tag `v1.2.3.4` in its own repository |

So "let the user pick the format" is really "let the user pick the format **once**, and have every
command that writes or reads a version tag agree on it".

## Decision

Add an optional **version tag format** — a template string with `{MAJOR}`, `{MINOR}`, `{PATCH}`,
and `{BUILD}` placeholders — read from `plugins.simply.versionTagFormat` in `sfdx-project.json`. The
default, `v{MAJOR}.{MINOR}.{PATCH}.{BUILD}`, reproduces today's tags exactly.

A new module, `src/common/build/versionTagFormat.ts`, owns the format: parsing and validating the
template, rendering a version into a tag, building the `git describe --match` glob, and parsing a
tag back into its version and suffix. Every writer and reader listed above goes through it instead
of building or slicing `v${version}` strings itself.

`sfdx-project.json` rather than a flag, because the format has to be identical across four commands
that run as separate CI jobs; a per-command flag makes a mismatch (and a silently-always-full
package build) one forgotten variable away. It's also where the project's other packaging policy
already lives (`plugins.simply.coverageRequirement`, `plugins.simply.utam`).

## Behavior

### Configuration

```jsonc
{
  "plugins": {
    "simply": {
      "versionTagFormat": "{MAJOR}.{MINOR}.{PATCH}+{BUILD}",
    },
  },
}
```

| Format (example)                               | `1.2.3.4`, release branch | `1.2.3.4`, built from `feature/x` |
| ---------------------------------------------- | ------------------------- | --------------------------------- |
| _(unset)_ = `v{MAJOR}.{MINOR}.{PATCH}.{BUILD}` | `v1.2.3.4`                | `v1.2.3.4-feature/x`              |
| `{MAJOR}.{MINOR}.{PATCH}+{BUILD}`              | `1.2.3+4`                 | `1.2.3+4-feature/x`               |
| `v{MAJOR}.{MINOR}.{PATCH}-{BUILD}`             | `v1.2.3-4`                | `v1.2.3-4-feature/x`              |
| `release/{MAJOR}.{MINOR}.{PATCH}.{BUILD}`      | `release/1.2.3.4`         | `release/1.2.3.4-feature/x`       |

The branch/ref suffix rule is unchanged: `-<branch attribute>` if the default package directory
declares `branch`, nothing on a release-branch build, `-<ci ref name>` otherwise. It is always
appended **after** the rendered version — the format controls the version part, not the suffix.
`create-fallback-tag`'s `-<n>` counter is appended after that, as today.

### Validation

The format is validated before any side effect — in particular before `create-package-version`
spends a package version on a build whose tag it then can't write. Invalid formats fail the command
with an error naming the problem and the offending format:

| Rule                                                                    | Why                                                                          |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Each of `{MAJOR}`, `{MINOR}`, `{PATCH}`, `{BUILD}` appears exactly once | Every version must map to a distinct tag, and a tag must parse back          |
| No other `{...}` placeholder                                            | A typo (`{BUIDL}`) would otherwise become literal tag text                   |
| Adjacent placeholders are separated by at least one non-digit character | `{MINOR}{PATCH}` can't be parsed back (`1.23` vs `12.3`)                     |
| Literal text is legal in a git tag name and contains no glob characters | `git check-ref-format` rules (no space, `~^:?*[\`, `..`, `@{`, leading `-`…) |

Placeholders are case-sensitive and uppercase. Order is free (`{BUILD}-{MAJOR}.{MINOR}.{PATCH}` is
legal, if odd).

### Effect on each command

- **`create-package-version`** — tags with the rendered format. Validation happens up front.
- **`determine-package-changes`** / **`create-fallback-tag`** — the `git describe --match` glob is
  the format rendered with the project's `major.minor.patch` and `*` for `{BUILD}`, plus a trailing
  `*` for any suffix unless the glob already ends in one (default: `v1.2.3.*`). Without a usable
  `versionNumber`, it's the format's literal prefix plus `*` — `v*` by default, exactly as today.
- **`create-fallback-tag`** — the next tag is computed by parsing the last tag against the format:
  the rendered version is kept verbatim and only a trailing `-<n>` **after** it counts as the
  fallback counter. Today's `^(v.*)-(\d+)$` would read the build number of `v{…}-{BUILD}` tags
  (`v1.2.3-4`) as a counter and emit `v1.2.3-5` — the tag of a different, possibly real, version.
  A last tag that doesn't parse against the format (an older three-part `v1.1.0`, an explicit
  `--last-tag` in some other shape) keeps the original rule, so existing repositories behave as
  before.
- **`publish-utam-page-objects`** — the suffix comes straight from the suffix rule, not from slicing
  the tag; the recorded `versionTag` uses the format. npm versions are unaffected (they derive from
  the Salesforce version, not the tag).
- **`cloneRepo`** — a dependency pinned as `Pkg@1.2.3-4` or `Pkg@1.2.3.4` is cloned at the format
  rendered with that version. Anything else (e.g. `1.2.3-LATEST`) keeps today's `v<pin>` fallback.
  This uses the **current** project's format for the dependency's repository; a dependency whose
  repo uses a different convention needs an explicit `ref` on its deployment entry, as it would
  today for any non-standard tag. An invalid format fails the clone rather than being swallowed by
  the "couldn't deduce a ref" warning, which would otherwise quietly clone the default branch.
- `deployProject` and `projectNotification` read whatever tag points at HEAD and are unaffected.

An invalid format throws in every command above except `determine-package-changes`, which keeps its
existing contract: any detection failure is logged as an error and defaults to
`PACKAGE_CHANGED=TRUE`. The `create-package-version` that follows in the same pipeline then fails
on the format before creating anything.

### A behavior change in the default

`determine-package-changes` and `create-fallback-tag` match `v1.2.3*` today, which also matches
`v1.2.30.0` and `v1.2.31.7`. The rendered default, `v1.2.3.*`, doesn't. That's a fix — the
current glob can pick a tag from an unrelated patch line as "the last release" — but it is
observable in a repository that has both, so it's called out in the changelog.

## Alternatives considered

- **A `--version-tag-format` flag on `create-package-version` only.** What the request literally
  asks for, but `determine-package-changes` would keep looking for `v1.2.3*`, never find a tag, and
  report a change on every build; `create-fallback-tag` would never find a last tag to fall back
  to. Both fail soft, so the breakage is a pipeline that quietly always builds.
- **The same flag/env var on all four commands.** Workable, but it relies on every job in the
  pipeline being given the same value, and a pipeline template that sets it per job will drift.
  Can be added later as an override on top of the project setting if someone needs per-pipeline
  formats — see open questions.
- **Bare tokens (`MAJOR.MINOR.PATCH+BUILD`).** Closest to how the request was phrased, but literal
  text collides with token names (a `PATCHES/` prefix contains `PATCH`), and there's no way to
  spot a typo. Braces cost two characters and make both problems go away.
- **A `{BRANCH}` placeholder** so the suffix can go anywhere. Every reader would then have to deal
  with a suffix in the middle of the tag, and `create-fallback-tag`'s counter would need its own
  placement rule. Nobody has asked for it; leaving the suffix at the end keeps the parse trivial.
- **A preset enum (`salesforce`, `semver-build-metadata`, `semver-prerelease`).** Simpler to
  validate, but every team with a slightly different prefix would need a new preset.
- **Putting the module in `simply-cicd-core`.** Every consumer lives in `simply-cicd`, so it stays
  here; it can move with the rest of the build logic if that's extracted later.

## Implementation plan

1. `src/common/build/versionTagFormat.ts` — `DEFAULT_VERSION_TAG_FORMAT`, `VersionTagFormatError`,
   and a `VersionTagFormat` class: `VersionTagFormat.parse(template)` (validate and compile),
   `VersionTagFormat.fromProject(project)` (read `plugins.simply.versionTagFormat`, defaulting when
   unset, rejecting a non-string), and on an instance `render(version, suffix?)`,
   `matchPattern(versionNumber?)`, and `parseTag(tag)` → `{ versionTag, version, rest }`.
2. `createPackageVersion.ts` — split `determineVersionTag` into `determineTagSuffix` (moved from
   `utamPageObjects.ts`, now computed directly) and rendering; read and validate the format right
   after reading `sfdx-project.json`, before `sf package version create`.
3. `determinePackageChanges.ts` / `createFallbackTag.ts` — `buildTagMatchPattern` is replaced by the
   format's `matchPattern`; `createFallbackTag` reads the project once for both the glob and the
   format, and `computeNextTag` parses against it.
4. `utamPageObjects.ts` / `publishUtamPageObjects.ts` — use the moved `determineTagSuffix` (which
   drops its now-unused `salesforceVersion` parameter); `toVersionTag` takes the format.
5. `git.ts` — `toDependencyRef(pin, format)`, used by `cloneRepo`.
6. `messages/simply.cicd.build.{create-package-version,determine-package-changes,create-fallback-tag}.md`
   descriptions; `site/.../cicd/concepts/sfdx-project-fields.md`; README regeneration per
   `AGENTS.md` (no flag changes, so `command-snapshot.json` shouldn't move).

## Testing

Unit tests (`vitest`), no NUT changes — no command's flags change, and the tag shapes are covered at
the module level:

- `versionTagFormat.test.ts` — every validation rule (missing/duplicate/unknown placeholder,
  adjacent placeholders, illegal ref characters, glob characters); render/parse round-trips for the
  four formats in the table, with and without a suffix and a fallback counter; `matchPattern` with
  and without a `versionNumber`, including `v1.2.3.*` not matching `v1.2.30.0`.
- `createPackageVersion.test.ts` — default format reproduces today's tags (existing tests unchanged);
  a custom format is used for `git tag`; an invalid format throws **before** `sf package version
create` is called.
- `createFallbackTag.test.ts` — `v{…}-{BUILD}`: `v1.2.3-4` → `v1.2.3-4-1`, `v1.2.3-4-1` →
  `v1.2.3-4-2`; a format without `v`.
- `determinePackageChanges.test.ts`, `utamPageObjects.test.ts`, `git.test.ts` — the glob, the
  recorded `versionTag`, and the clone ref follow the configured format.

## Open questions

- **Per-pipeline override.** Should `SIMPLY_CICD_VERSION_TAG_FORMAT` (env, read by all four
  commands) override the project setting? Deferred until someone needs a format that differs
  between pipelines of the same repository.
- **Migrating an existing repository.** Switching formats means the first build after the switch
  finds no tag in the new format and does a full package build (and `create-fallback-tag` has
  nothing to fall back to until then). That's a one-time cost and seems acceptable; re-tagging
  history is left to the team.
