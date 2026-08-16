---
title: Deploy pipeline stages
description: How validate, pre-destructive, deploy-unpackaged/install-packaged, post-destructive, and post-deploy chain together — and why it's files, not command chaining.
---

Both [`deploy project`](/cicd/reference/deploy-project/) and [`deploy happy-soup`](/cicd/reference/deploy-happy-soup/) expose the same shape of pipeline, one command per stage. Read [Happy Soup vs. Project deploys](/cicd/concepts/happy-soup-vs-project/) first if you haven't — this page assumes you already know which topic you're using.

## The stages, in order

1. **`validate`** — validates the deploy config file and deploy rules file against their JSON schemas before anything else runs. A missing file is a warning, not a failure; a malformed one fails the command. Run this early in the pipeline (e.g. on every merge request) so a typo in `deploy.json` fails fast instead of mid-deployment.
2. **`pre-destructive`** — runs `bin/preDestructive.sh` if present.
3. **`deploy-unpackaged`** (happy-soup) or **`install-packaged`** (project) — the actual deployment: `bin/unpackagedDeploy.sh` for happy-soup, or installing the packaged version for project. This is where `--test-level`/`--test-suite`/`--tests` apply for happy-soup deploys.
4. **`post-destructive`** — runs `bin/postDestructive.sh` if present.
5. **`post-deploy`** — runs `bin/postDeploy.sh` if present.

Project deployments also have a standalone **`run-apex-tests`** command, since project deploys install a package rather than running tests inline during the deploy stage.

Every one of these `bin/*.sh` scripts is optional — a stage with no matching script for a given repo is effectively a no-op for that repo. This is what makes the same `simply-cicd` pipeline reusable across projects with very different deployment needs: the CLI provides the orchestration (auth, config resolution, progress tracking, resuming); your repo provides the actual deployment logic in shell scripts it owns.

## State lives in files, not in command chaining

There's no `simply-cicd` "pipeline runner" command that calls the five stages in sequence for you — **your CI config (e.g. `.gitlab-ci.yml`) does that**, as five separate jobs. What ties them together is two files, both read and written by the stage commands themselves:

- **`DEPLOY_PROGRESS.json`** (`--deploy-progress-file`, default `DEPLOY_PROGRESS.json`) — tracks which stage a deployment last completed. If a pipeline fails partway through and is retried, the stage commands resume from where progress left off, rather than re-running stages that already succeeded. Pass `--start-from <job-name>` to override this and force a specific stage to (re-)run regardless of recorded progress.
- **The deploy config file itself** (`--deploy-config-file`, project default `config/deploy.json`; happy-soup derives it from `--source-branch-name` when not given explicitly) — describes what's being deployed and to where. `deploy-rules-file` (default `config/deploy-rules.json`) layers additional constraints on top.

Because state is file-based rather than encoded in command arguments passed between jobs, each stage's CI job can be a clean, independent step — it just needs read/write access to the repo checkout (for the progress and config files) and the target org credentials.

## A minimal stage job

Every stage command needs org authentication (`--alias`, or the `--jwt-key-file`/`--client-id`/`--instance-url`/`--username` JWT flags, or `--auth-url`) and, for happy-soup, `--ci-job-token` to authenticate the read-only repo clone. See the [GitLab CI pipeline guide](/cicd/guides/gitlab-ci-pipeline/) for a full working example wiring these into CI jobs.
