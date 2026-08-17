---
title: Deploy pipeline stages
description: How validate, pre-destructive, deploy-unpackaged/install-packaged, post-destructive, and post-deploy chain together — and why it's files, not command chaining.
---

Both [`deploy project`](/cicd/reference/deploy-project/) and [`deploy happy-soup`](/cicd/reference/deploy-happy-soup/) expose the same shape of pipeline, one command per stage. Read [Happy Soup vs. Project deploys](/cicd/concepts/happy-soup-vs-project/) first if you haven't — this page assumes you already know which topic you're using.

## The stages, in order

1. **`validate`** — validates the deploy config file and deploy rules file against their JSON schemas before anything else runs. A missing file is a warning, not a failure; a malformed one, or one that violates a `deploy-rules.json` requirement, fails the command. Run this early in the pipeline (e.g. on every merge request) so a misconfigured deployment fails fast instead of mid-deployment.
2. **`pre-destructive`** — runs `bin/preDestructive.sh` if present.
3. **`install-packaged`** — installs the packaged dependencies declared in `sfdx-project.json` (and, for `project`, the project's own package). This one is unconditional: it always runs regardless of what's in the deploy config's `deployments` array.
4. **`deploy-unpackaged`** — deploys unpackaged source via `bin/unpackagedDeploy.sh`. Exists on **both** topics — a `project` pipeline isn't limited to installing its package as-is; anything that has to ship as source alongside it runs here too. This is where `--test-level`/`--test-suite`/`--tests` apply for happy-soup.
5. **`post-destructive`** — runs `bin/postDestructive.sh` if present.
6. **`post-deploy`** — runs `bin/postDeploy.sh` if present.

Project deployments also have a standalone **`run-apex-tests`** command, run separately from `deploy-unpackaged`, since a project's Apex tests live inside the installed package rather than being triggered inline.

Every `bin/*.sh` script is optional — a stage with no matching script for a given repo is effectively a no-op for that repo. This is what makes the same `simply-cicd` pipeline reusable across projects with very different deployment needs: the CLI provides the orchestration (auth, config resolution, per-app selection, progress tracking, resuming); your repo provides the actual deployment logic in shell scripts it owns.

## State lives in files, not in command chaining

There's no `simply-cicd` "pipeline runner" command that calls these stages in sequence for you — **your CI config (e.g. `.gitlab-ci.yml`) does that**, as separate jobs, typically wired with `needs:`/artifact-passing so each stage only starts once the previous one succeeds. What ties them together is two files, both read and written by the stage commands themselves:

- **`DEPLOY_PROGRESS.json`** (`--deploy-progress-file`, default `DEPLOY_PROGRESS.json`) — one key per stage, holding either the `name` of the last app that finished that stage, or `"COMPLETE"` once every app configured for that stage has run. If a pipeline fails partway through a stage and is retried, that stage **automatically resumes one app after** the recorded name — it doesn't repeat the app that already succeeded, and it doesn't blindly restart from the top. Pass `--start-from <name>` to override this and force a stage to (re-)start **at** a specific named app instead of after it — useful for manually re-running just one app that failed without re-running everyone before it.
- **The deploy config file itself** (`--deploy-config-file`, project default `config/deploy.json`; happy-soup derives it from `--source-branch-name` when not given explicitly) — its `deployments` array is what `deploy-unpackaged`/`pre-destructive`/`post-destructive`/`post-deploy` iterate over (see [Happy Soup vs. Project](/cicd/concepts/happy-soup-vs-project/) for the exact schema). `deploy-rules-file` (default `config/deploy-rules.json`) layers minimum-stage requirements on top, enforced at `validate` time.

Because state is file-based rather than encoded in command arguments passed between jobs, each stage's CI job can be a clean, independent step — it just needs read/write access to the repo checkout (for the progress and config files, usually passed as CI artifacts between jobs) and the target org credentials.

## A minimal stage job

Every stage command needs org authentication (`--alias`, or the `--jwt-key-file`/`--client-id`/`--instance-url`/`--username` JWT flags, or `--auth-url`) and `--ci-job-token` to authenticate the read-only git operations the stage performs (cloning each configured app's repo, for happy-soup). See the [GitLab CI pipeline guide](/cicd/guides/gitlab-ci-pipeline/) for a full working example wiring these into CI jobs.
