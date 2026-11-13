# 0063 — Interactive prompts on `@clack/prompts`

**Status:** Implemented ([#140](https://github.com/SimplySF/simply-plugins/pull/140)); pending manual terminal check
**Package:** `packages/simply-plugin-kit` (new `prompts` module); `packages/simply-package` and
`packages/simply-project` (call sites)
**Date:** 2026-11-12

## Problem

The plugins' interactive prompts come from two libraries, and they look different:

- `package dependencies manage` and `project release create` import `select` from
  `@inquirer/prompts` directly.
- `package dependencies install`, `project release create`, and `project release roll-forward` call
  `SfCommand.confirm()`, which uses `@inquirer/confirm` inside `@salesforce/sf-plugins-core`.

`release create` shows both a select and a confirm in the same run. The internal `release.ts` tool
it replaced ([0062](0062-project-release-create.md)) used `@clack/prompts`, and teams who used that
tool are used to clack's look. Each package that needs a select also pins its own copy of
`@inquirer/prompts`.

## Decision

All interactive prompts go through a new `prompts` module in `@simplysf/simply-plugin-kit`. The
module exports `select` and `confirm`, built on `@clack/prompts`. Commands import from plugin-kit
and no longer import a prompt library or call `this.confirm()`. `@inquirer/prompts` is removed from
`simply-package` and `simply-project`.

## Behavior

| Prompt    | Signature                                                  | Ctrl+C / Esc                  | Timeout                                  |
| --------- | ---------------------------------------------------------- | ----------------------------- | ---------------------------------------- |
| `select`  | `select<T>({ message, options, initialValue, maxItems })`  | throws `PromptCancelledError` | none (same as inquirer's `select` today) |
| `confirm` | `confirm({ message, ms = 10_000, defaultAnswer = false })` | throws `PromptCancelledError` | resolves `defaultAnswer` after `ms`      |

- `confirm` keeps `SfCommand.confirm()`'s signature and its timeout semantics: after 10 seconds with
  no answer it resolves to the default (`false`), so an unattended run declines rather than
  hangs. The timeout is an `AbortSignal` passed to clack. clack reports an abort as a cancel, and
  the helper tells the two apart with `signal.aborted`.
- Cancelling used to surface inquirer's `ExitPromptError` stack. It now throws an `SfError` named
  `PromptCancelledError` ("Prompt cancelled."), which `SfCommand` prints as an ordinary error.
- `options` use clack's shape (`{ value, label, hint }`). A `hint` is shown only next to the
  highlighted option, unlike inquirer's `description`, which was shown under the list.
- Prompts only run when a command is already interactive. The existing `--no-prompt`, `--json`, and
  `--dry-run` guards are unchanged.

## Alternatives considered

- **Keep inquirer.** No work, but the select/confirm mismatch stays, and every package keeps
  pinning its own prompt library.
- **Migrate `select` only and leave `this.confirm()` on inquirer.** Smaller change, but
  `release create` would still mix the two styles in one run.
- **A `SimplyCommand` base class that overrides `confirm`.** That would leave call sites untouched,
  but it would add a base class to every command for one method. The call sites are four lambdas,
  so a plain function import is simpler and makes the dependency visible.
- **Use clack directly in each command.** Every call site would then need its own `isCancel` check.
  Forgetting one lets the cancel symbol pass through as a value.

## Implementation plan

1. `simply-plugin-kit`: add `@clack/prompts`, `src/prompts/prompts.ts`, the
   `error.promptCancelled` message, and the exports from `src/index.ts`.
2. `simply-package`: `dependencies manage` uses `select`, and `dependencies install` uses `confirm`.
3. `simply-project`: `release create` uses `select` and `confirm`, and `release roll-forward` uses
   `confirm`.
4. Remove `@inquirer/prompts` from both packages' dependencies.

## Testing

- `simply-plugin-kit/test/prompts/prompts.test.ts` mocks `@clack/prompts` and covers the following:
  the value passes through; cancel throws `PromptCancelledError`; a confirm timeout resolves
  `defaultAnswer`; and options are forwarded.
- Command tests keep stubbing `promptForVersion` / `promptForType` and pass `--no-prompt`, so they
  are unchanged.
- Manual check in a real terminal, on Windows Terminal and one POSIX shell: arrow keys, Enter,
  Ctrl+C, and the confirm timeout for `dependencies manage`, `release create`, and
  `release roll-forward`.

## Open questions

- `@inquirer/*` stays installed through `@salesforce/sf-plugins-core`. Removing it from the tree
  isn't a goal of this change.
- clack draws a `│` gutter that is designed around `intro`/`outro`. Wrapping a command's prompts in
  `intro`/`outro` is left until we see how the prompts look next to `this.info()` and `this.table()`
  output.
