# Contributing to @simplysf/simply

Salesforce CLI Plugins created by @SimplySF. This package is part of the [`simply-node`](https://github.com/SimplySF/simply-node) monorepo.

**Start with the [root CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md).** It covers repository structure, environment setup, commit conventions, versioning and publishing, CI, git hooks, and the pull request process — all of which apply here. This file covers only what is specific to this package.

## Working on this package

Run from this directory to target just this package:

```sh
pnpm run build       # compile + lint + regenerate command-snapshot.json
pnpm run lint
```

This package has no `test` script and no `test/` directory — it ships no source of its own to test. Its correctness is entirely a function of the bundled plugins, which are tested in their own packages.

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

## Command snapshot

`command-snapshot.json` records every command and flag so that accidental breaking changes surface in review. It regenerates as part of `pnpm run build` — commit whatever changes. CI re-verifies with `git diff --exit-code`, so a stale snapshot fails the build.

## This package bundles the others

This plugin ships no commands of its own. It exists to install every bundled plugin in one step, via the `oclif.plugins` list in [`package.json`](package.json). Its `command-snapshot.json` and `README.md` therefore aggregate the commands of everything in that list, and both need regenerating whenever a bundled plugin changes a flag.

Because its wireit inputs only cover `src/**/*.ts` — which holds nothing but `index.ts` — `pnpm run build` will **not** notice a bundled plugin changed a flag. Regenerate both by hand:

```sh
node --loader ts-node/esm --no-warnings=ExperimentalWarning ./bin/dev.js snapshot:generate
npx prettier --write command-snapshot.json
pnpm run readme
```

Note that `pnpm run readme` here inserts a fresh command block without removing the previous one, leaving a duplicate below the first `<!-- commandsstop -->`. Check for that and trim it before committing.

## Reporting issues

Please [open an issue](https://github.com/SimplySF/simply-node/issues) rather than sending a pull request for anything non-trivial without prior discussion.
