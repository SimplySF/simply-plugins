---
title: Opening and staging happy-soup releases
description: Use `simply cicd happy-soup release create` and `release stage` to open a dated release branch with its deployment files, and to start staging branches for the work headed into it.
---

In a happy-soup repository, each release is a dated branch, such as `release/2026-10-19`. The deploy stages use that release's `deployment-configs/2026-10-19.json` (see [Project vs. Happy Soup](/cicd/concepts/happy-soup-vs-project/#branches-pick-the-config-file-deployments-close-out-archives-it)), and a `deployment-steps/2026-10-19.md` records its manual steps. Work for the release is staged on `<team>/<application>/<name>` branches that merge into it.

Two developer commands set this up from a local clone. Unlike the pipeline stages, they're meant to be run by people: they ask for anything you leave out when you run them in a terminal.

## Opening a release

```bash
sf simply cicd happy-soup release create --date 2026-10-19 --dry-run
sf simply cicd happy-soup release create --date 2026-10-19
```

This:

1. Creates `release/2026-10-19` from the remote's copy of the production branch and checks it out. Your other branches aren't checked out or pulled, and unpushed local commits stay out.
2. Copies the deployment steps and deployment configs templates to `deployment-steps/2026-10-19.md` and `deployment-configs/2026-10-19.json`, and commits both in one commit. The config file is exactly the one the deploy stages look for on this branch.
3. Pushes the branch.
4. Opens a draft merge request back into the production branch, titled `Release 2026-10-19`. The release branch is kept after it merges.

The merge request needs a VCS token and project ID:

```bash
export SIMPLY_VCS_TOKEN=<api token>
sf simply cicd happy-soup release create --date 2026-10-19 --vcs-project-id 1234
```

The project ID can also come from `SIMPLY_VCS_PROJECT_ID` or `vcs.projectId` in `.sfdevrc.json`, and the platform from `--vcs-provider`, `SIMPLY_VCS_PROVIDER`, or `vcs.provider` (GitLab by default). Both are checked before anything changes. Pass `--no-merge-request` to push without one, or `--no-push` to keep everything local.

Running the command again for a release that already exists checks the branch out (fast-forwarding a local copy that's only behind) and opens the merge request if it's missing, so a run that failed at that step can simply be repeated.

## Staging work for a release

```bash
sf simply cicd happy-soup release stage --team platform --app core --name PROJ-1058 --base-branch release/2026-10-19
sf simply cicd happy-soup release stage
```

This creates `platform/core/PROJ-1058` from the remote's copy of the base branch and checks it out. It isn't pushed. Leave out the flags in a terminal to pick the team, application, and base branch from lists. The base branches offered are the remote's `environment/*` and `release/*` branches, with the production branch first. Without a terminal, or with `--no-prompt` or `--json`, `--team`, `--app`, and `--name` are required, and the base defaults to the production branch.

## Configuration

Both commands read `config/release.json` (or `release.json`), searching from the current directory up to the repository root. Every field is optional:

```json
{
  "productionBranch": "environment/production",
  "deploymentStepsTemplate": "xdocs/deployment-steps-template.md",
  "deploymentConfigsTemplate": "xdocs/deployment-configs-template.json",
  "teams": [
    {
      "name": "platform",
      "label": "Platform",
      "applications": [{ "name": "core", "description": "Core services" }, "portal"]
    },
    "data"
  ],
  "applications": ["shared"]
}
```

- `productionBranch`: what `release create` cuts from and targets, and the default base for `release stage`.
- `deploymentStepsTemplate` and `deploymentConfigsTemplate`: read from the base branch. A template that doesn't exist is skipped and reported.
- `teams`: the teams `release stage` offers, each with its own `applications`. Teams and applications can also be written as records keyed by name, such as `{ "platform": { "applications": ["core"] } }`.
- `applications`: offered for a team that doesn't list its own.

Pass `--config` to use another file.

## Safety

- A working tree with uncommitted changes is refused before anything changes.
- Nothing is force-checked-out, reset, or force-pushed, and your repository's commit hooks always run.
- If a hook rejects the commit, nothing is pushed and the deployment files stay staged. Commit them with a message your rules accept, push the branch, and run `release create` again to open the merge request. `--message "chore: PROJ-123 set up release {DATE}"` avoids the rejection in the first place.
- A local branch with the release's name that isn't on the remote is refused, with the commands to push or delete it.

## Moving from the ReleaseBranch script

| Script                                     | Now                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `--type release --date D`                  | `happy-soup release create --date D`                                |
| `--type staging --team T --app A --name N` | `happy-soup release stage --team T --app A --name N`                |
| `--no-mr`                                  | `--no-merge-request`                                                |
| `--project-id`                             | `--vcs-project-id`, `SIMPLY_VCS_PROJECT_ID`, or `vcs.projectId`     |
| `--gitlab-token`, `GITLAB_*_TOKEN`         | `--vcs-token` or `SIMPLY_VCS_TOKEN`                                 |
| `gitlabProjectId` in `.sfdevrc.json`       | Still read, with a deprecation warning. Move it to `vcs.projectId`. |
| `.projectrc.json`                          | Not read. Move its settings to `.sfdevrc.json`.                     |
| `config/release.json`                      | Unchanged.                                                          |

The deployment files are now one commit instead of two, the default message is `chore: set up release {DATE}`, and the production branch is no longer checked out and pulled first.
