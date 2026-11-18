# 0069 — Plain step lines instead of a table in `simply project release create`

**Status:** Implemented; pending manual terminal check
**Package:** `packages/simply-project`, `packages/simply-plugin-kit`
**Date:** 2026-11-18

## Problem

Two things make the command's terminal output hard to read.

1. **The plan can be printed twice.** The plan ("This will: …") was the `message` of the final clack
   `confirm` prompt. clack redraws a prompt on every keypress and on submit, and it decides how many
   lines to erase by counting the lines it wrote. When the terminal is narrower than clack thinks (a
   stale `process.stdout.columns`, a resized VS Code panel), the long "Create release/…" step wraps
   onto extra rows that clack doesn't count. The redraw then leaves the top of the old frame behind,
   so the user sees a cut-off "This will:" block above the full one.
2. **The result is a Field/Value table.** After a run made up of clack prompts and a spinner, the
   command prints a wide `this.table` that repeats what the spinner line just said (branch, status),
   shows the full 40-character commit SHA, and reports the release and default branch as bare
   statuses ("Already exists", "Set").

## Decision

Print the plan once, as static text, and ask only `Continue?`. Static text is never redrawn, so it
can't leave a stale copy behind. Replace the table with one line per step that ran, in the same clack
gutter as the prompts, then close the session with an outro. Add the two clack helpers this needs,
`step` and `outro`, to `simply-plugin-kit`. `step` wraps its text to the terminal width itself, with a
hanging indent under `- ` bullets, because clack's `log` doesn't wrap. `--json` output is unchanged.

## Behavior

Interactive run:

```
◇  This will:
│  - Publish release v3.10.0 from tag v3.10.0.11.
│  - Create release/v3.20.0 from release/v3.10.0, with version 3.20.0, and push it. The push
│    starts a build that creates a package version.
│  - Make release/v3.20.0 the project's default branch.
│
◇  Continue?
│  Yes
│
◇  Created release/v3.20.0 from release/v3.10.0 (512c187)
│
◇  Release v3.10.0 already exists
│  https://gitlab.example.com/group/project/-/releases/v3.10.0.11
│
◇  release/v3.20.0 is now the default branch
│
└  Done. The push started the build that creates the package version.
```

The branch line is the spinner's done line. The release and default-branch lines appear only when
those steps were asked for.

| Result                       | Branch line                                                     | Outro                                                                             |
| ---------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `Created`                    | `Created <branch> from <source> (<short SHA>)`                  | `Done. The push started the build …`                                              |
| `Declined` (answered no)     | `Cancelled`                                                     | `Nothing was changed.`                                                            |
| `Commit rejected`            | `A hook rejected the commit on <branch>, so nothing was pushed` | none; `simply-project-core` already prints how to recover, and the exit code is 1 |
| `Would create` (`--dry-run`) | `Would create <branch> from <source>, with version <version>`   | none                                                                              |

| Release status   | Line                                          |
| ---------------- | --------------------------------------------- |
| `Created`        | `Published release <name> from tag <tag>`     |
| `Already exists` | `Release <name> already exists`               |
| `Would create`   | `Would publish release <name> from tag <tag>` |

The release URL, when the platform returns one, is the line's second line.

| Default-branch status | Line                                      |
| --------------------- | ----------------------------------------- |
| `Set`                 | `<branch> is now the default branch`      |
| `Would set`           | `Would make <branch> the default branch`  |
| `Not set`             | `Didn't make <branch> the default branch` |

Non-interactive runs (`--no-prompt`, `--dry-run`) print the same lines with `this.log`, without the
gutter, spinner, or outro. `--json` prints only the JSON result, as before.

## Alternatives considered

- **Keep the plan in the `confirm` message and pre-wrap it to the terminal width.** It would fix the
  case where clack's width is right but the text is long. It doesn't fix the case that caused the bug,
  where the width clack reads is wrong, and the plan would still be redrawn on every keypress.
- **A single done line plus the release URL.** Shortest, but it folds the release and default-branch
  results into one line, or drops them, which is the information someone checking the run wants.
- **A slimmer table.** It still breaks the clack session visually and still needs a header, so it
  fixes the noise but not the mismatch.
- **Use clack's `note` box for the plan.** A box draws its border at the terminal width, which brings
  back the width-dependence this change removes.

## Implementation plan

1. `packages/simply-plugin-kit/src/prompts/prompts.ts`: add `step(message)` and `outro(message)`, and
   export them from `src/index.ts`. Add rows for them to the kit README's API table.
2. `packages/simply-project/messages/simply.project.release.create.md`: split `confirm` into
   `confirm.plan` and `confirm`, and replace `tableTitle` and `spinner.done` with the `result.*` and
   `outro.*` messages above.
3. `packages/simply-project/src/commands/simply/project/release/create.ts`: print the plan with
   `step` before the `Continue?` confirm, build the summary lines from the result, and drop the table.

## Testing

- Kit: `step` wraps to the terminal width, indents continuation lines under a `- ` bullet, and keeps
  blank lines; `outro` passes its message through.
- Command: the summary lines for each branch, release, and default-branch status; the short SHA; the
  URL line; `Commit rejected` still sets exit code 1; non-interactive runs log plain lines and no
  table.

## Open questions

None.
