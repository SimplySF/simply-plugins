# 0068 — Prompt for the release and default branch in `simply project release create`

**Status:** Implemented; pending manual terminal check
**Package:** `packages/simply-project`
**Date:** 2026-11-17

## Problem

When `simply project release create` runs in a terminal, it asks only for `--type` and then asks you to
confirm the plan. Publishing a release for the version being closed out (`--create-release`) and making
the new branch the project's default (`--set-default`) can only be turned on with flags. Someone who
runs the command interactively never hears that either step exists. They cut the branch, then find out
afterwards that the release and the default branch were never done. The command can't fix that
afterwards either: a second run is refused because the new version already has a branch, so both steps
have to be done by hand in the GitLab or GitHub UI.

## Decision

In interactive mode, after the type prompt, ask a yes/no question for each VCS step whose flag wasn't
passed. Ask only when the VCS settings resolve, meaning a token and a project ID are available. The
answers are passed to `createRelease` the same way the flags are, so the plan, the confirmation, and
the result table don't change. This is a change to the command only; `simply-project-core` needs
nothing new.

## Behavior

Prompts run only when the command is interactive. That is the existing rule: not `--no-prompt`,
`--dry-run`, or `--json`.

| Situation                                              | `--create-release` prompt | `--set-default` prompt |
| ------------------------------------------------------ | ------------------------- | ---------------------- |
| Not interactive                                        | never                     | never                  |
| `--create-release` or `--release-tag` passed           | skipped (already on)      | asked, unless passed   |
| `--set-default` passed                                 | asked, unless passed      | skipped (already on)   |
| Both passed                                            | skipped                   | skipped                |
| VCS settings don't resolve (no token or no project ID) | skipped, with one notice  | skipped                |

- The order is: type, then the release question, then the default-branch question. The existing
  confirmation shows the full plan after that.
- Messages:
  - `Publish a <platform> release for the version you're cutting from?`, where `<platform>` is
    `GitLab` or `GitHub`, taken from the resolved provider's `kind`. The platform comes from
    `--vcs-provider`, `SIMPLY_VCS_PROVIDER`, or `vcs.provider` in `.sfdevrc.json`, so the question
    names the platform the release will actually be published on.
  - `Make the new release branch the project's default?`
  - Both default to **No**, so pressing Enter keeps today's behavior. Like every `confirm`, they also
    fall back to No when nobody answers within the timeout.
- **Credentials check.** Before asking either question, the command calls `resolveReleaseVcs` with the
  VCS flags. If it throws, neither question is asked and the command prints one info line:
  `To also publish a release or set the default branch, provide a VCS token and project ID (see --help).`
  Then the cut goes ahead as it does today. When a flag _was_ passed, missing credentials are still an
  error before anything changes, as they are now.
- The `vcs` object that comes back from the check is the one passed to `createRelease`. Settings are
  resolved once, and any `.sfdevrc.json` warnings are printed once.

## Alternatives considered

- **Always ask, and fail if the user says yes without credentials.** This makes the steps easier to
  discover, but then a "yes" stops the run with an error the user can only fix by starting over. Asking
  only when the step can actually run is less surprising. The one-line notice still tells people the
  steps exist.
- **Prompt for a missing token.** That needs a masked prompt that `simply-plugin-kit` doesn't have, and
  tokens typed into an interactive prompt are easy to get wrong and hard to repeat. Tokens already come
  from `SIMPLY_VCS_TOKEN` in CI and in the shell. This can be revisited separately.
- **One multiselect ("Also: publish release / set default").** It means fewer keystrokes, but it is
  the only multiselect in the plugins, and a multiselect needs a space to toggle, which people easily
  miss. Two yes/no questions match the existing `confirm` style.
- **Default the questions to Yes.** Pressing Enter would then publish a release and change a
  repository-wide setting. Both are outward-facing, so they stay opt-in.
- **Add the questions after the plan is built, inside `confirm`.** The plan is computed with the
  options fixed. Changing them afterwards means replanning in the core, which isn't worth it for
  questions whose answers don't depend on the plan.

## Implementation plan

1. `messages/simply.project.release.create.md`: add `prompt.createRelease` (with a `%s` for the
   platform name), `prompt.setDefault`, and
   `info.vcsUnavailable`, and update the description to mention the interactive questions.
2. `src/commands/simply/project/release/create.ts`:
   - Add protected `promptForCreateRelease(platform)` and `promptForSetDefault()`, so tests can stub them like
     `promptForType`.
   - Add private `chooseVcsSteps(flags, interactive)`, called from `run()` (inlining it pushed `run()`
     past the lint complexity limit). It resolves `vcs` strictly first if any VCS flag was passed, so
     that failure still comes before any prompt. Otherwise, when interactive, it tries to resolve,
     prints the notice on failure, and asks the questions that are still open. `vcs` is passed on only
     when at least one step will run.
3. Run `pnpm run readme` for `simply-project` and `packages/simply` (the description changed), then
   `pnpm run build` (no flag changes, so the snapshot should stay as it is).

## Testing

Unit tests in `test/commands/simply/project/release/create.test.ts`:

- The release question names GitLab or GitHub to match the resolved provider.
- Interactive, credentials resolve, both answered yes: `createRelease` gets `createRelease: true`,
  `setDefault: true`, and the resolved `vcs`. `resolveReleaseVcs` is called once.
- Interactive, both answered no: both are `false` and `vcs` is `undefined`.
- Interactive, `--set-default` passed: only the release question is asked.
- Interactive, `--release-tag` passed: the release question isn't asked.
- Interactive, `resolveReleaseVcs` throws: neither question is asked, the cut still runs, and the info
  line is printed.
- `--no-prompt`, `--dry-run`, and `--json`: neither question is asked and `resolveReleaseVcs` isn't
  called for a plain cut. This extends the existing cases.
- The existing interactive tests stub the new prompts so they don't block.

Manual: run in a real terminal with and without `SIMPLY_VCS_TOKEN` to check the prompts render
correctly next to the spinner. This is the same pending manual check as 0063 and 0066.

## Open questions

- Should the notice also appear when credentials are missing for a non-default provider host? Proposed:
  yes. It is a single line, and the text doesn't depend on why resolving failed.
