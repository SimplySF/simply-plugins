---
title: Happy Soup vs. Project deploys
description: The single most important concept in simply-cicd — which deployment style your pipeline is using and why it matters.
---

Every deploy command in `simply-cicd` lives under one of two topics: `deploy project ...` or `deploy happy-soup ...`. They're not two ways of doing the same thing — they model two fundamentally different ways a Salesforce org gets its metadata, and picking the wrong one will make every other command's flags and defaults confusing. This distinction isn't written down anywhere else in the plugin's docs, so read this page first.

## Project deploys: 2GP packaged

A **project** deployment assumes your metadata ships as a **second-generation managed package (2GP)**. The pipeline:

1. Builds a new package version in a tooling Dev Hub (`build create-package-version`), or falls back to reusing the last one if nothing changed (`build create-fallback-tag`).
2. Tags the commit that produced it with the resulting `04t...` subscriber package version ID.
3. On deploy, `deploy project install-packaged` looks up that `04t` ID — either from `--subscriber-package-version-id` or from the git tag annotation at `HEAD` — and installs it (plus any packaged dependencies from `sfdx-project.json`) into the target org.
4. `deploy project run-apex-tests` authenticates to the target org directly and runs its Apex tests, since the tests live inside the installed package.

There's exactly one org config path per environment: `config/deploy.json`, with `DEPLOY_PROGRESS.json` tracking which stage a resumed deployment left off at. No `--source-branch-name` flag exists on `deploy project *` commands, because there's nothing to derive — one target, one config file.

## Happy-soup deploys: unpackaged org metadata

"Happy soup" is Salesforce-community shorthand for a single large, unpackaged metadata org — everything deployed as source, no package boundary. A **happy-soup** deployment:

- Has no Dev Hub, no package version, no `04t` ID anywhere in the flow.
- Can target **multiple configured deployments from one command invocation** — `deploy happy-soup deploy-unpackaged` and its `pre-destructive`/`post-destructive`/`post-deploy` siblings each run "for each configured deployment that participates in this stage," cloning each repo fresh.
- Resolves its config file from `--source-branch-name` when `--deploy-config-file` isn't given explicitly — e.g. a `release/uat` branch maps to a UAT deployment config. This is the flag you'll see on almost every `deploy happy-soup *` command that `deploy project *` doesn't have.
- Archives its config after a successful run: `deploy happy-soup deployment-close-out` copies whichever config file was used (or one resolved from `--deploy-release-date` as `deployment-configs/<date>.json`) to `config/deploy.json` and commits it with `[skip ci]`, so the next pipeline run has a record of what actually shipped.
- Tags the deployed commit for audit purposes via `deploy happy-soup tag-deployment` — an annotated tag named `deployed--<org-domain-prefix>-<timestamp>`, optionally linked to the triggering pipeline and merge request.

## Picking the right one

|                             | Project                                             | Happy Soup                                                                                     |
| --------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Metadata unit               | 2GP package version (`04t...`)                      | Raw unpackaged source                                                                          |
| Dev Hub required            | Yes (tooling org for package builds)                | No                                                                                             |
| Config resolution           | Fixed path (`config/deploy.json`)                   | Derived from `--source-branch-name`, or explicit                                               |
| Multi-target in one command | No                                                  | Yes                                                                                            |
| Apex tests                  | `deploy project run-apex-tests` (installed package) | Covered by the `test-level`/`test-suite`/`tests` flags on the deploy stage commands themselves |

If your org installs a namespaced managed package with a version number, you're doing `project`. If your org is a single unpackaged environment (or several environments sharing one pipeline) deployed straight from source, you're doing `happy-soup`. Don't mix flags from one topic into the other — `deploy project *` commands will reject `--source-branch-name` (it doesn't exist on them), and `deploy happy-soup *` commands have no concept of `--subscriber-package-version-id`.

See [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) for how the stage commands within either topic chain together, and the [command reference](/cicd/reference/deploy-project/) for exact flags.
