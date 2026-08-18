---
title: VCS providers
description: How simply-cicd talks to source control, which platforms are supported, and how to point it at one.
---

Every command that clones, tags, pushes to, or opens change requests against a repository goes through a small internal abstraction, `VcsProvider` (`src/common/vcs/`), rather than talking to any one host directly. The interface covers listing an org/group's repositories, reading file content, branch existence/creation, committing files, finding/creating/updating merge or pull requests, reading repository-level CI variables, reading the upstream repo's identity from CI environment variables, and building URLs — authenticated remotes for push and read-only clone, plus the browser URL of a change request.

**GitLab and GitHub are both implemented.** `--vcs-provider` accepts `gitlab` (the default) or `github`, and its accepted values are sourced from the provider registry, so registering another platform adds the CLI option automatically.

## Choosing a platform

- `--vcs-provider` — the platform to talk to. Defaults to `gitlab`.
- `--vcs-host` — the hostname of the instance, e.g. `gitlab.example.com` or `github.example.com`. **Optional**: each provider supplies its own default (`gitlab.com`, `github.com`), so selecting a provider is enough to reach its public instance. Pass this only for a self-hosted instance.

Providers derive their own API base URL from the host — `https://<host>/api/v4` for GitLab, `https://api.github.com` for github.com and `https://<host>/api/v3` for GitHub Enterprise Server — so no command ever assembles an API URL itself.

## Credentials

- `--ci-job-token` — for read-only clones. Maps to whatever per-job token your CI issues (`CI_JOB_TOKEN` on GitLab, `GITHUB_TOKEN` on Actions).
- `--project-access-token` — for push and tag operations, and for posting diffs back to a change request.
- `--vcs-token` — `sfdx-dependabot` only. That command works _across_ repositories, so it needs a token with file-writing and change-request privileges in every downstream project it might touch. A per-job token won't do: it lacks the cross-repository API scope.

## `sfdx-dependabot`

This command talks to the platform API directly — listing an org/group's repositories, reading each `sfdx-project.json`, opening change requests — rather than just building git remote URLs, so it takes a couple of extra flags:

- `--vcs-token` — as above. Falls back to `SIMPLY_CICD_VCS_TOKEN`, then `SFDX_DEPENDABOT_VCS_TOKEN`.
- `--vcs-api-url` — **optional** override for a self-hosted instance whose API isn't at the provider's usual location. Falls back to `SIMPLY_CICD_VCS_API_URL`, then `SFDX_DEPENDABOT_VCS_API_URL`, then `CI_API_V4_URL` (GitLab CI's own built-in variable), so in a GitLab CI job you rarely need to set it at all.
- `--root-group-id` — the group (GitLab) or organization (GitHub) to scan.

Opt-in is per repository, via a repository-level CI variable named `SFDX_DEPENDABOT_ENABLED=TRUE` — a CI/CD variable on GitLab, an Actions variable on GitHub.

All of the flags above can also be set once as a `SIMPLY_CICD_*` environment variable — e.g. `SIMPLY_CICD_VCS_HOST`, `SIMPLY_CICD_VCS_PROVIDER`, `SIMPLY_CICD_VCS_TOKEN` — instead of repeating them on every command in a pipeline. See [Environment variables](/cicd/concepts/environment-variables/) for the full list and precedence rules.

## Vocabulary and URLs follow the platform

Each provider carries its own terminology, so log lines, generated change-request bodies, and the deployment tag message say "merge request" on GitLab and "pull request" on GitHub. Change-request URLs follow suit: GitLab nests them under `/-/merge_requests/`, GitHub under `/pull/`.

## Flow and flexipage diffs

`build generate-flow-diff` and `build generate-flexipage-diff` post their results back to the change request through the upstream `@syntax-syllogism/flow-delta` reporter for the selected platform — `flow-delta-gitlab` or `flow-delta-github`. They follow `--vcs-provider` along with everything else.

Because the two platforms address a change request differently, each takes its own context flags, all optional:

- GitLab: `--ci-project-id`, `--ci-merge-request-iid`
- GitHub: `--ci-repository` (`owner/repo`), `--ci-pull-request-number`, `--ci-run-id`, `--ci-server-url`

Anything you don't pass falls back to the platform's own CI environment variables, which the reporter reads directly.

## Practical implication

If your pipeline runs on GitLab or GitHub, everything works: cloning, tagging, pushing config back to the source repo, posting diffs, and `sfdx-dependabot`'s cross-repo scanning. On another platform — Bitbucket Pipelines, Azure DevOps — the deploy/build/notify commands themselves still work, since they mostly need target-org credentials, but anything touching the source repository needs a provider implementation first. Adding one means implementing `VcsProvider` and calling `registerVcsProvider`; no command needs to change.
