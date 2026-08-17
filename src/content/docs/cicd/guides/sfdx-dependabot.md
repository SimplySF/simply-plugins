---
title: Automating dependency bumps with sfdx-dependabot
description: How the cross-repo 2GP dependency-bump command works, and how to opt a downstream project in.
---

`sf simply cicd sfdx-dependabot` is Dependabot's idea applied to Salesforce 2GP packages: when a package you maintain releases a new version, this command finds every downstream repository that depends on it and opens a merge request bumping `sfdx-project.json` to the new version — without you having to know or track which repositories consume your package.

## How it decides what to touch

1. Scans every project under `--root-group-id` (a GitLab group ID or URL-encoded path), optionally narrowed with `--project-allowlist`/`--project-denylist`, and optionally skipping archived repos (`--skip-archived`) or forks (`--skip-forks`).
2. For each project, reads `sfdx-project.json` and checks whether it declares a dependency on the package being bumped.
3. **Requires the project to explicitly opt in** via a project-level CI/CD variable, `SFDX_DEPENDABOT_ENABLED=TRUE`. A project that depends on the package but hasn't set this variable is left untouched. This is a deliberate safety boundary — the command never modifies a downstream repository's dependencies just because it technically could.
4. For each eligible, opted-in project, opens a new merge request (or updates an existing open one with the same source/target branch) bumping the dependency version.

## Running it

This is meant to run as its own pipeline, typically triggered from the CI job that just published a new package version (see [`build create-package-version`](/cicd/reference/build/)) — pass the version it just created straight through:

```yaml
sfdx-dependabot:
  stage: notify-downstream
  script:
    - sf simply cicd sfdx-dependabot
      --root-group-id $DEPENDABOT_ROOT_GROUP_ID
      --subscriber-package-version-id $NEW_PACKAGE_VERSION_ID
      --devhub-username $DEVHUB_USERNAME
      --branch-prefix devops/dependabot
      --mr-labels dependencies
      --fail-on-error
```

`--gitlab-token` (or `SIMPLY_CICD_GITLAB_TOKEN`, or the legacy `SFDX_DEPENDABOT_GITLAB_TOKEN`) needs file-writing and merge-request privileges across every downstream project it might touch — this is necessarily a broader-scoped token than a single project's `CI_JOB_TOKEN`, since the whole point is acting across repositories the triggering pipeline doesn't own.

Every flag in the job above — `--root-group-id`, `--devhub-username`, `--branch-prefix`, `--mr-labels`, `--fail-on-error` — is also settable once as a `SIMPLY_CICD_*` CI/CD variable (`SIMPLY_CICD_ROOT_GROUP_ID`, `SIMPLY_CICD_DEVHUB_USERNAME`, `SIMPLY_CICD_BRANCH_PREFIX`, `SIMPLY_CICD_MR_LABELS`, `SIMPLY_CICD_FAIL_ON_ERROR`), leaving only the per-run `--subscriber-package-version-id` to be passed explicitly. See [Environment variables](/cicd/concepts/environment-variables/).

## Try it safely first

Run with `--dry-run` to see exactly what the command _would_ do — which projects it considers, which are eligible — without creating a single branch, commit, or merge request:

```sh
sf simply cicd sfdx-dependabot \
  --root-group-id 12345 \
  --subscriber-package-version-id 04tXXXXXXXXXXXXXXX \
  --devhub-username hub@example.com \
  --dry-run
```

Use `--max-projects` as a safety limit while testing against a large group, and `--fail-on-error` once you trust the setup, so a partial failure across many repos actually fails the pipeline instead of silently succeeding.

## Opting a downstream repository in

In the downstream project (not the package's own repo): Settings → CI/CD → Variables → add `SFDX_DEPENDABOT_ENABLED` = `TRUE`. Nothing else is required on that side — the next `sfdx-dependabot` run against the parent group will pick it up automatically as long as its `sfdx-project.json` declares the dependency.
