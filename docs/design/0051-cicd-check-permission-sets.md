# 0051 — `simply cicd build check-permission-sets`

**Status:** In progress (PR #93, which also carries the `--file` warning)
**Package:** `packages/simply-cicd`; `packages/simply-permissions` (the `--file` naming warning)
**Date:** 2026-10-20 (revised 2026-10-21: discovery by the `.psbuild.json` suffix, not by content)

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

Permission sets files get a standard suffix, **`.psbuild.json`** (for example
`config/app.psbuild.json`). The job finds them by that suffix alone, by walking the directory tree,
so `find . -name '*.psbuild.json'` lists exactly what the job will check. `simply permissions build
--file` keeps accepting any filename but warns when the suffix is missing, because the CI job won't
find that file.

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

1. Walk the directory tree from the current directory. A file is a **permission sets file** when its
   name ends in `.psbuild.json`. Nothing else is read.
2. Don't descend into `node_modules`, `.git`, `.sf`, or `.sfdx`. Pruning them during the walk matters,
   because `node_modules` alone can hold hundreds of thousands of files. Symbolic links aren't
   followed.
3. Sort the matches by path, written relative to the current directory with `/` separators, so the
   log and the fix command read the same on every OS.
4. Validate and load each match with `loadPermissionSetsFile`. A `.psbuild.json` file that fails
   validation is a **job failure**, not a skip. The suffix says it's meant to be one, and skipping it
   would let a typo stop the check from running.

The walk doesn't consult git, so it finds files whether or not they're tracked, ignored, or staged.
In CI, where the checkout is the committed tree, that's every permission sets file in the commit.

### The `.psbuild.json` suffix

The name reads as "permission set build" config, and is short enough to grep for. It describes the
permission sets file only. `--config` overrides files don't get a suffix. They're never discovered
directly, because each is checked through whichever permission sets file references it.

`simply permissions build --file <path>` warns, without failing, when `<path>` doesn't end in
`.psbuild.json`:

```
Warning: config/permission-sets.json doesn't end in .psbuild.json, so `sf simply cicd build
check-permission-sets` won't find it. Rename it to config/permission-sets.psbuild.json.
```

The suggested name inserts `.psbuild` before the `.json` extension, or appends `.psbuild.json` if
there's no `.json` extension. The warning is printed with and without `--check`. Every example in
the `build` messages, the docs site, and 0050 now uses the suffix.

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
  Regenerate with: sf simply permissions build --file config/app.psbuild.json
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

**Find files by their content** (any JSON file whose top level has a `permissionSets` array, listed
with `git ls-files`). This is what the first version of this doc chose, because the `--file` format
never fixed a filename. It was replaced before release: which files would be checked wasn't visible
from their names, so a team couldn't grep for them, and the job read and parsed every JSON file in
the repo. The cost of the suffix, renaming files that already exist, is small this early: `--file`
has only been released for a few weeks, and `build --file` now warns about any file that would be
missed.

**Keep `git ls-files`, matching by suffix.** This respects `.gitignore` exactly, but it needs a git
checkout, and the result depends on the index rather than on what's on disk. A walk with a short
skip list gives the same answer in CI and is predictable everywhere else. A `.psbuild.json` file in
a gitignored directory is rare enough not to need special handling.

**Other suffixes** (`.permission-sets.json`, `.permsets.json`). These were considered and rejected
in favor of `.psbuild.json`, which names what the file is for: it's the build input, not the
permission sets themselves.

**Require the suffix in `build --file`.** This is consistent with the CI job, but it would break
existing setups on upgrade. A warning gets the same result over time without breaking anything.

**Configure the file list in `sfdx-project.json`** (the way other `simply-cicd` settings live there).
This is explicit, but it's per-repo configuration, which is what this job exists to avoid. It also
drifts out of date the same way a hand-written job does.

**Fail when no permission sets files are found.** This is stricter, but it breaks the shared-template
use case that motivates the job. `findPageObjectSources` sets the precedent: a project that hasn't
adopted a feature is a skip.

**Skip invalid permission sets files with a warning.** This is more forgiving, but a typo would
silently disable the check, and it would turn green.

## Implementation plan

1. `package.json`: add `@simplysf/simply-permissions-core: ^0.4.0`.
2. `src/common/build/checkPermissionSets.ts`: `findPermissionSetsFiles()`, the suffix walk, and
   `runCheckPermissionSets(options)`, which loads, checks, logs, and throws on drift.
   `PermissionSetBuildError` is mapped to the same message text `simply permissions build` uses.
   The suffix is a constant here and in `simply-permissions`, since each plugin needs it and the
   string will never change. See open question 3.
3. `src/commands/simply/cicd/build/check-permission-sets.ts`: a thin command using `debugFlag` and
   `disabledFlag`.
4. `messages/simply.cicd.build.check-permission-sets.md`.
5. Tests (below).
6. Docs: the `gitlab-ci-pipeline` guide (a `test` stage job and a paragraph on it), and the build
   reference via the README and site sync. The `scratch-org-lifecycle` guide is left alone: its
   numbered list is the scratch org's lifecycle, and this job never touches one.
7. `pnpm run build` (snapshot), `pnpm run readme` in `simply-cicd` and `packages/simply`,
   `pnpm --filter site run sync`, and this doc's index row.
8. `simply-permissions`, also in #93 because #92 merged before this revision: the `--file` naming warning, `.psbuild.json` in every example in
   `messages/simply.permissions.build.md`, a test for the warning, and the regenerated READMEs.

## Testing

**Unit** (`checkPermissionSets.test.ts`, with a temporary directory and the fixture project):

- **Discovery:**
  - finds `.psbuild.json` files at any depth, sorted, with `/` separators
  - ignores every other file, including a correctly shaped permission sets file without the suffix
  - doesn't descend into `node_modules`, `.git`, `.sf`, or `.sfdx`
  - works outside a git repo
- **`build --file` warning** (in `simply-permissions`): warned for an unsuffixed file with the
  suggested name, not warned for a suffixed one
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
3. **Where the suffix constant lives.** `simply-permissions-core` owns the file format, so it's the
   natural home for an exported `PERMISSION_SETS_FILE_SUFFIX`. That would need another core release
   before either PR could use it, so each plugin defines the string itself for now. Move it to core
   the next time core is released for another reason.
