# 0049 — `build lwc-jest`: opt-in pipeline failure and JUnit results

**Status:** Implemented ([#78](https://github.com/SimplySF/simply-plugins/pull/78))
**Package:** `packages/simply-cicd`
**Date:** 2026-10-16

## Problem

`simply cicd build lwc-jest` catches every failure, logs `LWC Jest tests failed.`, and exits 0. A
team that wants failing LWC tests to block a merge has no way to make that happen short of wrapping
the command and grepping its log.

The command also writes no machine-readable results. `build test-scratch` (via `runApexTests`)
writes JUnit to `./test-results/apex`, so a pipeline can upload that directory as an artifact and
have GitLab/GitHub render the failures in the merge request. LWC Jest results only exist in the job
log.

## Decision

Add a `--lwc-jest-fail-on-test-failure` boolean flag to `build lwc-jest`, backed by
`SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE` and defaulting to `false`, so today's log-and-continue
behavior stays the default. When it's set, a failing run makes the command exit non-zero.

Always run Jest with the `jest-junit` reporter added to whatever reporters the project already uses,
writing `./test-results/lwc/test-result.xml`, next to the Apex results under `./test-results/`.

## Behavior

```
sf simply cicd build lwc-jest [--lwc-jest-fail-on-test-failure] [--debug] [--disabled]
```

| `--lwc-jest-fail-on-test-failure` / env var | Tests pass        | Tests fail (or install fails)        |
| ------------------------------------------- | ----------------- | ------------------------------------ |
| unset / `false` (default)                   | exit 0, `success` | logs the failure, exit 0 (unchanged) |
| `true`                                      | exit 0, `success` | logs and throws the failure, exit 1  |

- The failure message says which step failed: `Failed to install the LWC Jest test libraries.` or
  `LWC Jest tests failed.` Both paths log it; with the flag set the command also throws it.
- Creates `./test-results/lwc` first, so a `when: always` artifact path exists even if the install
  fails or Jest crashes before its reporters run.
- Installs `jest-junit` with `@salesforce/sfdx-lwc-jest` and `@sa11y/jest`, then runs
  `sfdx-lwc-jest --coverage -- --passWithNoTests` with `JEST_JUNIT_OUTPUT_DIR=./test-results/lwc` and
  `JEST_JUNIT_OUTPUT_NAME=test-result.xml`, adding the reporter in one of two ways:

  | Project has `jest.config.{js,mjs,cjs}`? | How `jest-junit` is added                                                    |
  | --------------------------------------- | ---------------------------------------------------------------------------- |
  | no                                      | `--reporters=default --reporters=jest-junit`                                 |
  | yes                                     | `--config=<temp>/jest.config.mjs`, a wrapper around the project's own config |

  These are the same files `sfdx-lwc-jest` checks: with none of them it passes its own default
  `--config`, which sets no reporters, so the CLI flags lose nothing. When the project has one, a CLI
  `--reporters` would replace the project's `reporters` (an HTML report, say) on every run. The
  wrapper instead exports an async config function that imports the project's config (object or
  function, CommonJS or ESM), keeps every setting, appends `jest-junit` to its reporters (`default`
  if it sets none, skipped if it already lists `jest-junit`), and pins `rootDir` to the project. The
  wrapper is deleted after the run. It's a function rather than a module with top-level `await`
  because Jest 29 loads config files with `require()` first, and that rejects top-level `await`.

- The report is written whether or not tests fail, so a pipeline should upload it unconditionally
  (GitLab: `artifacts: when: always` with `reports: junit:`).
- A failed `npm install` also counts as a failure. The flag means "this step must succeed"; an
  install failure that passed silently would be a green pipeline that ran no tests.
- `--disabled` still wins: the command skips, writes no report, and exits 0.
- `--json` output shape is unchanged (`{ skipped, success }`); with the flag set and a failure, the
  usual `--json` error envelope is returned instead.

## Alternatives considered

- **`--fail-on-test-failure` / `SIMPLY_CICD_FAIL_ON_TEST_FAILURE`.** Shorter, but the switch is
  specifically about LWC Jest, and a pipeline-wide variable with a generic name reads as if it also
  gates Apex tests (which always fail the pipeline, with no opt-out). Putting the test type in the
  flag follows `test-scratch`'s `--disable-apex-tests`, and the variable still follows the
  `SIMPLY_CICD_<FLAG>` rule exactly.
- **`BUILD_ENABLE_JEST_FAILURE` as the variable name** (the original request). Every other
  `simply-cicd` variable is `SIMPLY_CICD_<FLAG>` backed by an oclif flag, so `--help` shows it and
  the [environment variables](../../site/src/content/docs/cicd/concepts/environment-variables.md)
  naming rule holds. A one-off name would be the only variable a user couldn't predict from the flag.
- **Making failure the default.** It would turn currently-green pipelines red on upgrade. The opt-in
  matches the request and `delete-scratch`'s "logged, not thrown" stance for non-gating steps.
- **Reusing `sfdx-dependabot`'s `--fail-on-error` name.** That flag covers per-project errors in a
  batch; here the thing that fails is a test run, so the name says so.
- **A flag for the results path.** No consumer needs another location yet, and a fixed path keeps
  pipeline templates copy-pasteable, the same as `./test-results/apex`. Easy to add later.
- **Always passing `--reporters` on the CLI** (the first version of this PR). Simpler, but it replaced
  a project's own `reporters` on every run, opt-in or not. Caught in review.
- **Reading the project's reporters and passing each as `--reporters`.** The CLI can't carry
  reporter options (`['jest-html-reporter', { pageTitle }]`), so those would be silently dropped.
- **Writing the wrapper into the project root.** That would leave a stray file in the checkout if
  the job is killed; a temp directory plus a pinned `rootDir` avoids touching the project.
- **Parsing Jest's `--json` output and printing a failure report like `runApexTests` does.** Jest's
  default reporter already prints failures readably to the log; duplicating it adds code with no gain.

## Implementation plan

1. `src/common/build/lwcJest.ts`: `failOnTestFailure` option, `jest-junit` install, results
   directory, reporter args or wrapper config (`buildJunitJestConfig`) and env, separate install/test
   failure messages, throw as well as log on failure when the option is set.
2. `src/commands/simply/cicd/build/lwc-jest.ts`: the new flag, passed through.
3. `messages/simply.cicd.build.lwc-jest.md`: description, flag summary, example.
4. `command-snapshot.json`, README regeneration, site `reference/build.md`,
   `concepts/environment-variables.md`, and the `build lwc-jest` step in
   `guides/scratch-org-lifecycle.md`.

## Testing

- `lwcJest.test.ts`: installs `jest-junit`; creates the results directory even when the install
  fails; passes the reporter args and `JEST_JUNIT_*` env with no project config, and a wrapper
  `--config` (removed afterward) with one; logs and returns on failure by default; logs and throws
  with `failOnTestFailure`; names an install failure distinctly; still skips when disabled.
- `buildJunitJestConfig`: imports each generated wrapper for real and checks that the project's
  settings and reporters (with options) are kept, `jest-junit` is appended once, `default` is used
  when none are set, and a relative `rootDir`, an ESM config, and a config function all work.
- `lwc-jest.test.ts`: `--lwc-jest-fail-on-test-failure` and the env var both reach `runLwcJest`; it's
  `false` when the variable is unset or `false`.
- Checked once by hand against real Jest 29 + `jest-junit`: a project config with a custom reporter
  and options, run through the wrapper, ran that reporter with its options, respected the project's
  `testMatch`, wrote the JUnit file, and exited 1 on a failing test.

## Open questions

- A project that configures Jest only through `package.json`'s `jest` key, or a `jest.config.ts`/
  `.json`, already gets `sfdx-lwc-jest`'s default config instead (it only looks for
  `jest.config.{js,mjs,cjs}`), so this change doesn't affect them either way.
