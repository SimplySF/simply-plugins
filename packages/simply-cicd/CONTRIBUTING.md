# Contributing to @simplysf/simply-cicd

Commands for Salesforce CI/CD pipelines. This package is part of the [`simply-plugins`](https://github.com/SimplySF/simply-plugins) monorepo.

**Start with the [root CONTRIBUTING.md](https://github.com/SimplySF/simply-plugins/blob/main/CONTRIBUTING.md).** It covers repository structure, environment setup, commit conventions, versioning and publishing, CI, git hooks, and the pull request process — all of which apply here. This file covers only what is specific to this package.

## Working on this package

Run from this directory to target just this package:

```sh
pnpm run build       # compile + lint + regenerate command-snapshot.json
pnpm test            # the full gate CI runs
pnpm run test:only   # just the unit tests, skipping lint and the doc gates
pnpm run lint
```

## Trying a command locally

Run this package's dev binary without installing it into the Salesforce CLI:

```sh
./bin/dev.js --help          # macOS/Linux
./bin/dev.cmd --help         # Windows
```

Or link it so `sf` picks it up from anywhere:

```sh
sf plugins link .
```

## Command help text

Summaries, descriptions, examples, and error messages live in [`messages/`](messages), not in the command source. Edit the relevant `messages/*.md` file, then regenerate the README command reference:

```sh
pnpm run readme
```

Commit the regenerated `README.md`. The docs site derives its command reference pages from it, so a stale README means stale published docs.

## Command snapshot

`command-snapshot.json` records every command and flag so that accidental breaking changes surface in review. It regenerates as part of `pnpm run build` — commit whatever changes. CI re-verifies with `git diff --exit-code`, so a stale snapshot fails the build.

> `@simplysf/simply-cicd` is **not** bundled into the [`@simplysf/simply`](https://github.com/SimplySF/simply-plugins/tree/main/packages/simply) orchestrator plugin — it is installed on its own — so changing a flag here does not affect the orchestrator's snapshot.

## Tests

No pull request is accepted without tests covering the change. Tests live in [`test/`](test), mirroring the `src/` layout, and run under [Vitest](https://vitest.dev/).

## Reporting issues

Please [open an issue](https://github.com/SimplySF/simply-plugins/issues) rather than sending a pull request for anything non-trivial without prior discussion.
