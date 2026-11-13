# 0066 — Spinner for work that follows a clack prompt

**Status:** Implemented; pending manual terminal check
**Package:** `packages/simply-plugin-kit` (`prompts` module); `packages/simply-project`,
`packages/simply-cicd` (call sites)
**Date:** 2026-11-13

## Problem

After [0063](0063-clack-prompts.md), the interactive commands ask their questions with clack and
then go quiet. `project release create`, `project release roll-forward`, and
`cicd happy-soup release create` / `stage` run git fetches, merges, pushes, and VCS API calls after
the last prompt. These can take several seconds with no output, so the command looks hung.

The `package dependencies` commands are out of scope. They already show progress through oclif's
`this.spinner`, and `install` confirms from inside its progress callbacks, so moving them is a
separate change.

## Decision

Add `spinner()` to the plugin-kit `prompts` module, built on clack's `spinner()`. It runs an async
task and shows a clack spinner until the task settles. Commands that prompt use it around the work
that follows their prompts. When a command isn't interactive, nothing is drawn.

```ts
export type SpinnerControl = {
  /** Replace the spinner's text while the task runs. */
  message(text: string): void;
  /** Stop the spinner, run `prompt` (e.g. a confirm), then restart it with the current text. */
  pause<T>(prompt: () => Promise<T>): Promise<T>;
};

export async function spinner<T>(
  options: { message: string; doneMessage?: string | ((result: T) => string); enabled?: boolean },
  task: (control: SpinnerControl) => Promise<T>,
): Promise<T>;
```

## Behavior

| Case                    | Output                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Task resolves           | spinner stops with `doneMessage` (or `doneMessage(result)`; defaults to the current message), and the value is returned |
| Task throws             | spinner stops in clack's error state with `message`; the error is rethrown unchanged                                    |
| `control.pause(prompt)` | spinner is cleared, the prompt runs, then the spinner restarts                                                          |
| `enabled: false`        | nothing is drawn; the task runs with a no-op `control`                                                                  |

- Call sites pass `enabled: interactive`. That uses the same `--no-prompt` / `--json` / `--dry-run`
  guard as their prompts, so `--json` stdout stays clean and CI logs get no spinner frames.
- `release create` and `roll-forward` call `confirm` from inside `createRelease` / `rollForward`.
  Their confirm callbacks are wrapped in `control.pause(...)`, so the confirm doesn't render on top
  of a running spinner.
- Ctrl+C at a prompt still throws `PromptCancelledError`, and the spinner shows its error state.
- While a spinner is running, clack listens for SIGINT, which replaces Node's default exit on
  Ctrl+C. The helper passes `onCancel: () => process.exit(130)`, so Ctrl+C during the work still
  ends the command.
- Each command's done line names the outcome from the result (e.g. `Release branch release/1.4:
Declined`), not a fixed "done", because the core functions can return `Declined`,
  `Commit rejected`, or `Would create`.
- Call sites annotate `doneMessage`'s parameter with the result type. Both arguments are callbacks,
  and TypeScript checks the options object first, so without the annotation `T` is inferred as
  `unknown`.

### Call sites

| Command                          | Spinner wraps                                   |
| -------------------------------- | ----------------------------------------------- |
| `project release create`         | `createRelease` (confirm paused)                |
| `project release roll-forward`   | `rollForward` (confirm paused)                  |
| `cicd happy-soup release create` | `createReleaseBranch`                           |
| `cicd happy-soup release stage`  | `listStagingBaseBranches`; `stageReleaseBranch` |

## Alternatives considered

- **Keep oclif's `this.spinner`.** It already exists, but it's the style mismatch this change is
  fixing, and it would also need its own guard around the confirm callbacks.
- **Return clack's raw `spinner()` from plugin-kit.** Every call site would then need its own
  try/catch to stop the spinner on error, and its own non-interactive guard. Forgetting either one
  leaves a spinner running or writes frames into `--json` output.
- **A `progress` callback in the core functions** (`createRelease` and the others), for step-by-step
  messages. This would give better text ("Fetching…", "Pushing…"), but it changes four functions in
  `simply-plugins-core` and needs a release there first. `SpinnerControl.message` leaves room to
  add it later.

## Implementation plan

1. `simply-plugin-kit`: add `spinner` and `SpinnerControl` to `src/prompts/prompts.ts`, and export
   them from `src/index.ts`.
2. Add a `spinner.*` message key to each affected command's `messages/*.md`.
3. Update the call sites in the table above.

## Testing

- `prompts.test.ts`: start/stop on resolve, including a `doneMessage` function and a changed
  message; error state and rethrow on reject; `pause` clears and restarts around the prompt, and
  around a cancelled prompt; exit 130 from clack's cancel; `enabled: false` never calls
  `clack.spinner`.
- Command tests already run non-interactively (`--no-prompt` or stubbed prompts), so they cover the
  `enabled: false` path without changes.
- Manual check alongside 0063's: Windows Terminal and one POSIX shell, including Ctrl+C during a
  paused confirm.

## Open questions

- Moving `package dependencies manage` / `install` from `this.spinner` to this helper. `install`
  would need its `stepStart`/`stepStop` callbacks mapped onto one `SpinnerControl`.
