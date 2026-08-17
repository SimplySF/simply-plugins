---
title: VCS providers
description: How simply-cicd talks to source control, what's configurable today, and what's GitLab-only for now.
---

Every command that clones, tags, pushes to, or opens merge requests against a repository goes through a small internal abstraction, `VcsProvider` (`src/common/vcs/`), rather than talking to GitLab (or any host) directly. The interface covers listing group projects, reading file content, branch existence/creation, committing files, finding/creating/updating merge requests, reading project-level CI variables, and building authenticated remote URLs for both push and read-only clone operations.

**Only GitLab is implemented today.** The type this abstraction is built around, `VcsProviderKind`, is currently a single-value union (`'gitlab'`), and the factory that constructs a provider throws for anything else. It's designed this way deliberately, so a GitHub (or other) provider can be added later without touching any command that consumes a `VcsProvider` — but as of today, pointing `--vcs-provider` at anything but `gitlab` will fail.

## Configuring the GitLab connection

Two different sets of flags exist depending on which commands you're using, and they are **not interchangeable**:

### Deploy/build stage commands

Commands under `deploy project`, `deploy happy-soup`, and the tagging build commands (`build create-fallback-tag`, `build create-package-version`) share:

- `--vcs-provider` — the platform to talk to. Defaults to `gitlab`; `gitlab` is currently the only accepted value.
- `--vcs-host` — the hostname of the VCS instance, e.g. `gitlab.com` or a self-hosted `gitlab.example.com`. Defaults to `gitlab.com`.
- `--ci-job-token` (read-only clones) or `--project-access-token` (push/tag operations) — the actual credential. These map to whichever token type your CI platform issues per-job vs. a longer-lived project token, and are used to build an authenticated remote URL via `buildCiCloneUrl`/`buildAuthenticatedRemoteUrl`.

### `sfdx-dependabot`

This command talks to the GitLab API directly (listing group projects, reading `sfdx-project.json`, opening merge requests) rather than just building git remote URLs, so it needs richer GitLab-specific config:

- `--gitlab-api-url` — GitLab API v4 base URL. Falls back to `SIMPLY_CICD_GITLAB_API_URL`, then the legacy `SFDX_DEPENDABOT_GITLAB_API_URL`, then `CI_API_V4_URL` (GitLab CI's own built-in variable) if not passed explicitly — so in a GitLab CI job, you often don't need to set this at all.
- `--gitlab-token` — a GitLab access token with file-writing and merge-request privileges. Falls back to `SIMPLY_CICD_GITLAB_TOKEN`, then the legacy `SFDX_DEPENDABOT_GITLAB_TOKEN`. There's no fallback to a CI-provided token here, since `CI_JOB_TOKEN` doesn't have the cross-project API scope `sfdx-dependabot` needs to open MRs in other repositories — you need a real personal or project access token.

All of the flags above can also be set once as a `SIMPLY_CICD_*` environment variable — e.g. `SIMPLY_CICD_VCS_HOST`, `SIMPLY_CICD_VCS_PROVIDER`, `SIMPLY_CICD_GITLAB_API_URL` — instead of repeating them on every command in a pipeline. See [Environment variables](/cicd/concepts/environment-variables/) for the full list and precedence rules.

## Practical implication

Because the abstraction exists but only has one implementation, none of the current `--vcs-*` flag defaults or fallback env vars (`CI_API_V4_URL`, etc.) will do anything useful against a non-GitLab host today. If your pipeline runs on GitHub Actions, Bitbucket Pipelines, or similar, the deploy/build/notify commands themselves will still work (they mostly just need target-org credentials), but anything that pushes tags or archives config back to the source repo, or `sfdx-dependabot`'s cross-repo scanning, is GitLab-only until a second provider is added.
