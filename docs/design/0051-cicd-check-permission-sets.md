# 0051 — `simply cicd build check-permission-sets`

**Status:** In progress
**Package:** `packages/simply-cicd`
**Date:** 2026-10-20

## Problem

[0050](0050-permissions-build-check.md) added `simply permissions build --check`, which fails when a
generated permission set has drifted from its source metadata. Using it in a pipeline today means
writing a job by hand for each permission sets file. That job has to keep up with every file added
or moved, and it can't go into a shared pipeline template, because each repo keeps its files in
different places. A repo with no such file at all would make the job fail on a missing `--file`
(0050's input errors are fatal).

`simply-cicd` exists so a pipeline can be a list of `sf simply cicd ...` calls that need no
per-repo scripting. A drift check that discovers its own inputs belongs there.

## Decision

Add `sf simply cicd build check-permission-sets`. It finds every permission sets file in the repo
(the JSON format `simply permissions build --file` reads), checks every permission set each one
declares, and fails the job if any has drifted or is missing. A repo with no permission sets files
is a skip, not a failure, so the job is safe to put in a shared template.

The logic lives in `src/common/build/checkPermissionSets.ts`, beside the other build jobs
(`lwcJest.ts`, `utamPageObjects.ts`). It calls `@simplysf/simply-permissions-core`'s
`loadPermissionSetsFile` and `checkPermissionSets` directly, the same way `simply-cicd` already
consumes `simply-package-core` ([0036](0036-package-dependencies-install-service.md)). It doesn't
shell out to `sf simply permissions build`, because that plugin may not be installed in the
pipeline image.

"Permission config files" here means **permission sets files**. A `--config` overrides file can't
be checked on its own: it has no type, name, or output path. It's checked through whichever
permission sets file references it.

## Behavior

```
sf simply cicd build check-permission-sets [--debug] [--disabled]
```

| Flag         | Env var                | Notes                                           |
| ------------ | ---------------------- | ----------------------------------------------- |
| `--disabled` | `SIMPLY_CICD_DISABLED` | Shared guard flag: log a warning, skip, exit 0. |
| `--debug`    | `SIMPLY_CICD_DEBUG`    | Shared.                                         |

No other flags. The command runs from the repo root, which is the current directory in every CI
job. Relative paths inside a permission sets file resolve against that directory, exactly as they do
for `simply permissions build --file`.

### Discovery

1. List candidate files with `git ls-files --cached --others --exclude-standard -- '*.json'`. That
   means tracked files plus untracked files that aren't ignored, so `.gitignore` is respected and
   `node_modules/`, `.sf/`, and build output are never scanned.
2. Parse each candidate. A file is a **permission sets file** when it parses as JSON and its top
   level is an object with a `permissionSets` array. Anything else is skipped silently, including
   JSON that doesn't parse (such as `tsconfig.json` with comments) and `--config` overrides files.
3. Sort the matches by path.

Detection is by shape rather than by filename because 0039 never fixed a filename. The examples use
`config/permission-sets.json`, but nothing requires it. A top-level `permissionSets` array is
specific enough that a false positive is unlikely, and step 4 reports one loudly if it happens.

4. Validate and load each match with `loadPermissionSetsFile`. A file that looks like a permission
   sets file but fails validation is a **job failure**, not a skip. It's clearly meant to be one, and
   skipping it would let a typo stop the check from running.

### Outcomes

| Situation                                          | Log                                                                           | Exit |
| -------------------------------------------------- | ----------------------------------------------------------------------------- | ---- |
| `--disabled`                                       | `check-permission-sets is disabled. Skipping.`                                | 0    |
| No permission sets files found                     | `No permission sets files found. Skipping.`                                   | 0    |
| Every permission set `up-to-date`                  | Per file: its path and `N permission set(s) up to date.` Then a success line. | 0    |
| Any permission set `drifted` or `missing`          | Each stale set with its status and path, and the fix command for its file     | 1    |
| A permission sets file is invalid, or a scan fails | The `simply permissions build` error text, naming the file                    | 1    |

On drift, the job checks every file before failing, so one run lists every stale permission set
across the repo. For each file with stale sets, it logs the command that fixes them:

```
✖ App_Admin drifted   force-app/main/default/permissionsets/App_Admin.permissionset-meta.xml
✖ App_Support missing force-app/main/default/permissionsets/App_Support.permissionset-meta.xml
  Regenerate with: sf simply permissions build --file config/permission-sets.json
Error: 2 of 5 permission set(s) have drifted from their source metadata or are missing.
```

An invalid file fails immediately, before any further files are checked. The configuration has to
be fixed before the results mean anything, matching 0039's validate-first rule.

Failing on drift is the default, with no opt-out other than `--disabled`. `lwc-jest` made failure
opt-in ([0049](0049-cicd-lwc-jest-fail-and-junit.md)) to avoid turning existing pipelines red on
upgrade. This is a new job, and failing on drift is its whole purpose.

### `--json`

On success: `{ skipped, files: [{ file, permissionSets: PermissionSetCheckResult[] }] }`. On failure
the job throws, so `--json` returns the standard error envelope, as `lwc-jest` does with its flag
set.

### Pipeline placement

The job needs no org, no Dev Hub, and no `PACKAGE_CHANGED` gate, because drift can come from any
change to source metadata or overrides. It runs in parallel with the test-stage jobs:

```yaml
check-permission-sets:
  stage: test
  needs: []
  script:
    - sf simply cicd build check-permission-sets
```

## Alternatives considered

**Shell out to `sf simply permissions build --file <f> --check`.** This would reuse the CLI's
output and exit code exactly. But it makes `simply-cicd` depend on another plugin being installed in
the pipeline image, and on parsing its `--json` output. Calling the library gives the same check
with typed results.

**Find files by a filename convention** (such as `**/permission-sets.json` or
`*.permission-sets.json`). This is simpler and cheaper, but it would retroactively require a name
the `--file` format never required, so existing repos would be silently skipped until renamed.

**Configure the file list in `sfdx-project.json`** (the way other `simply-cicd` settings live there).
This is explicit, but it's per-repo configuration, which is what this job exists to avoid. It also
drifts out of date the same way a hand-written job does.

**Walk the directory tree instead of `git ls-files`.** This works outside a git checkout, but it
needs a hand-maintained skip list (`node_modules`, `.sf`, `.sfdx`, coverage, build output) and would
scan ignored files `.gitignore` already describes. Every CI job runs in a checkout, and other build
jobs already need git.

**Fail when no permission sets files are found.** This is stricter, but it breaks the shared-template
use case that motivates the job. `findPageObjectSources` sets the precedent: a project that hasn't
adopted a feature is a skip.

**Skip invalid permission sets files with a warning.** This is more forgiving, but a typo would
silently disable the check, and it would turn green.

## Implementation plan

1. `package.json`: add `@simplysf/simply-permissions-core: ^0.4.0`.
2. `src/common/build/checkPermissionSets.ts`: `findPermissionSetsFiles(projectDir)`, using
   `git ls-files` and the shape test, and `runCheckPermissionSets(options)`, which loads, checks,
   logs, and throws on drift. `PermissionSetBuildError` is mapped to the same message text
   `simply permissions build` uses.
3. `src/commands/simply/cicd/build/check-permission-sets.ts`: a thin command using `debugFlag` and
   `disabledFlag`.
4. `messages/simply.cicd.build.check-permission-sets.md`.
5. Tests (below).
6. Docs: the `gitlab-ci-pipeline` guide (a `test` stage job and a paragraph on it), and the build
   reference via the README and site sync. The `scratch-org-lifecycle` guide is left alone: its
   numbered list is the scratch org's lifecycle, and this job never touches one.
7. `pnpm run build` (snapshot), `pnpm run readme` in `simply-cicd` and `packages/simply`,
   `pnpm --filter site run sync`, and this doc's index row.

## Testing

**Unit** (`checkPermissionSets.test.ts`, with a temporary git repo and the fixture project):

- **Discovery:**
  - finds permission sets files at any depth, sorted
  - skips JSON without a top-level `permissionSets` array, unparseable JSON, and `--config` overrides files
  - skips gitignored files and includes untracked, non-ignored ones
- **Outcomes:**
  - no files → skipped, exit 0
  - all up to date → success
  - drifted and missing sets in two files → throws after checking both, naming each stale set and each file's fix command
  - an invalid file → throws with the file path, and later files aren't checked
  - `--disabled` → skipped
- **Paths:** relative paths in a file resolve against the project directory, not against the file's location.

**Command:** flags wire through, and `--json` returns the success shape.

**Manual:** in a scratch SFDX repo with two permission sets files, generate both, run the job (exit
0), add a field (exit 1, with both fix commands listed), then delete both files (skip, exit 0).

## Open questions

1. **A JUnit report** (`./test-results/permissions/`, one test case per permission set) would show
   drift in the merge request widget the way `lwc-jest` shows test failures. This is cheap to add,
   but left out until someone asks.
2. **Per-file overrides of the working directory.** Paths currently resolve against the repo root,
   as they do for the CLI. If monorepos keep a permission sets file per sub-project with paths
   relative to that sub-project, this would need a flag. Not added until such a repo exists.
