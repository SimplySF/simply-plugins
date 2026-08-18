---
title: The bin/*.sh stage script contract
description: Exactly how simply-cicd invokes bin/preDestructive.sh, bin/unpackagedDeploy.sh, bin/postDestructive.sh, and bin/postDeploy.sh — arguments, working directory, and environment.
---

[Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) explains that `pre-destructive`, `deploy-unpackaged`, `post-destructive`, and `post-deploy` each run a matching `bin/*.sh` script if one exists in the repo. This page is the contract those scripts are written against: the arguments they receive, the directory they run in, and what `simply-cicd` does to the repo before invoking them. None of this is written down anywhere else, so read it before writing your first script.

## The scripts

| Stage               | Script                    |
| ------------------- | ------------------------- |
| `pre-destructive`   | `bin/preDestructive.sh`   |
| `deploy-unpackaged` | `bin/unpackagedDeploy.sh` |
| `post-destructive`  | `bin/postDestructive.sh`  |
| `post-deploy`       | `bin/postDeploy.sh`       |

Each is optional — a stage with no matching script for a given repo is a no-op for that repo. `install-packaged` has no script; it's handled entirely by the CLI.

## Before the script runs

For every deployment that has a matching script, `simply-cicd`:

1. **Installs dependencies.** If `package.json` exists at the repo root, it runs `npm install --omit=dev` (with `HUSKY_SKIP_INSTALL=1` set) so the script can rely on local `node_modules`. A missing `package.json`, or a failed install, is silently skipped either way — the script still runs.
2. **Fixes permissions.** It best-effort `chmod`s whichever of `logs/`, `data/`, `bin/`, and `scripts/` exist in the repo (`bin/` gets `+rx`, the other three `+rw`), so a repo doesn't need to pre-set permissions in git. A failed `chmod` only logs a warning — on a Linux/macOS runner this can leave a script non-executable, so commit `bin/*.sh` with the executable bit set as a safety net rather than relying on this step alone.

## Invocation

```sh
./bin/<script>.sh --target-org <alias> --test-level <level> [--tests <tests>]
```

- **`--target-org`** — the value passed to the stage command's `--alias` flag (an empty string if none was given).
- **`--test-level`** — the deployment's own `testLevel` (an optional per-entry override in `deploy.json`'s `deployments[]`; see [Happy Soup vs. Project deploys](/cicd/concepts/happy-soup-vs-project/)), falling back to the stage command's `--test-level` flag, falling back to `RunLocalTests`.
- **`--tests`** — only appended when a value resolves, from the deployment's own `tests` or the stage command's `--tests` flag; omitted entirely otherwise.

The script is invoked directly, not through a shell — its first line needs its own shebang (`#!/usr/bin/env bash` or equivalent), and it needs to be executable.

## Working directory, output, and exit code

- **Working directory** is the repository root: for a `project` pipeline's implicit `local` deployment, that's the CI job's own checkout; for a `happy-soup` deployment, that's the fresh clone `simply-cicd` just made for that `deployments[]` entry.
- **stdout/stderr** stream straight through to the CI job's own log — nothing is captured, buffered, or filtered.
- **Environment** is inherited in full from the CI job's process. Every `SIMPLY_CICD_*` variable and CI-native variable (`CI_COMMIT_SHA`, etc.) visible to the `sf simply cicd` process is visible to the script too, with no extra plumbing required.
- **Exit code** determines success or failure: a non-zero exit fails that deployment's job for that stage, which is what `DEPLOY_PROGRESS.json` then records as the point to resume from on retry (see [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/)).
