---
title: Project vs. Happy Soup
description: Understanding the different deployment paradigms supported by Simply and how they can fit into your development workflow.
sidebar:
  order: 1
---

Simply supports two deployment paradigms: **Project** and **Happy Soup**. A Project assembles a single application's metadata for promotion — most commonly packaged as a 2GP Unlocked Package, though packaging isn't required. Happy Soup deploys a collection of packages plus org-specific metadata into one or more environments.

Project is how an individual application gets assembled; Happy Soup is how that application, alongside many others, gets delivered to an org. Keeping them in separate repositories lets each Project define its own SDLC rules, while Happy Soup enforces the stricter governance and approvals needed to prevent unilateral changes to an environment. Happy Soup is the deployment orchestrator and the source of truth for what's actually been deployed.

## Project: one repo, one app, sandbox promotion

A **project** repository holds the source for a single Salesforce application. It doesn't have to be packaged at all — `deploy project *` promotes whatever this one repo produces into a sandbox environment regardless — but Simply's preference, and what the `build` topic commands are built around, is a **2GP Unlocked Package**: compile it, push it to a scratch org, test it, and create a package version from it. Either way, the shape is deliberately narrow: one repository, one app, one target at a time.

1. `deploy project install-packaged` installs the packaged dependencies declared in `sfdx-project.json`, then the project's own package — resolving the version to install from `--subscriber-package-version-id`, or by reading the `04t...` ID annotated on the git tag at `HEAD` if not given explicitly. **Skip this stage entirely** if the project isn't packaged; there's no package version for it to install.
2. `deploy project deploy-unpackaged` **also exists** — a project pipeline isn't limited to installing a package as-is. Anything that has to ship as source rather than inside a package (org-specific config, metadata a package intentionally excludes, or the project's entire source if it isn't packaged at all) runs through `bin/unpackagedDeploy.sh`, same as happy-soup's equivalent stage.
3. `deploy project run-apex-tests` authenticates to the target org directly and runs its Apex tests, since the tests live inside the installed package. An unpackaged project has no installed package to point this at — it runs its tests via `--test-level`/`--test-suite`/`--tests` on the `deploy-unpackaged` stage instead, the same way happy-soup does.

There's exactly one deploy config path per environment (`config/deploy.json` by default), and no `--source-branch-name` flag on `deploy project *` commands — there's nothing to derive, since a project pipeline only ever has one implicit deployment target (internally called `local`).

## Happy soup: standalone repo, multiple apps, one org per environment

A **happy-soup** repository is standalone: it has its own `sfdx-project.json` (declaring every packaged dependency to install) plus a source tree of org-specific metadata that isn't packaged anywhere. Where a project pipeline promotes one package, a happy-soup pipeline **deploys multiple applications' metadata into one Salesforce environment**.

- Dependencies declared in `sfdx-project.json` are always installed by `deploy happy-soup install-packaged`; unlike the stages below, this one isn't configurable per deployment.
- Everything else (`deploy-unpackaged`, `pre-destructive`, `post-destructive`, `post-deploy`) is driven by a **`deployments` array** in the deploy config file (`deploy.json` or a dated `deployment-configs/*.json` — see below), where each entry names one application and which stages it participates in:

  ```json
  {
    "deployments": [
      {
        "name": "billing-app",
        "slug": "org/billing-app",
        "ref": "main",
        "unpackagedDeploy": true,
        "preDestructive": true,
        "postDestructive": true,
        "postDeploy": true
      },
      {
        "name": "reporting-app",
        "slug": "org/reporting-app",
        "unpackagedDeploy": true
      }
    ]
  }
  ```

  `slug` is the VCS project path `simply-cicd` clones fresh for that deployment (skipped for the reserved name `local`, which always means "this repo, already checked out" — the same mechanism a project pipeline uses internally for its one implicit deployment). `ref` pins a branch or tag to check out; if omitted, `simply-cicd` first tries to deduce a version tag from this deployment's own dependency entry in `sfdx-project.json` (a `"<name>@<version>"` dependency resolves to git tag `v<version>`), falling back to the repo's default branch only if that lookup finds nothing. Each of the four boolean stage flags controls **only** whether that named deployment participates in that specific stage — `reporting-app` above only ever runs its unpackaged deploy, never pre/post-destructive or post-deploy.

- An optional **`deploy-rules.json`** enforces minimums on top of that. Each entry in its `rules` array matches a `deployments[]` entry by `deploymentName` or `deploymentSlug` (at least one is required) and lists `requireStages` — the stage flags (`unpackagedDeploy`, `preDestructive`, `postDestructive`, `postDeploy`) that matched deployment must set to `true`:

  ```json
  {
    "rules": [
      {
        "deploymentName": "billing-app",
        "requireStages": ["postDeploy"]
      },
      {
        "deploymentSlug": "org/reporting-app",
        "requireStages": ["unpackagedDeploy", "postDestructive"]
      }
    ]
  }
  ```

  `deploy *validate` fails the pipeline if a deployment config violates a rule, rather than silently letting someone ship an environment missing a required stage.

### Branches pick the config file, deployments-close-out archives it

Deploy config resolution: an explicit `--deploy-config-file` always wins; otherwise it's derived from `--source-branch-name` by taking whatever comes after the first `/` and looking for `deployment-configs/<that>.json`. So a branch named `release/2026-08-16` resolves to `deployment-configs/2026-08-16.json`, and `environment/production` resolves to `deployment-configs/production.json` — the prefix before the slash is just a naming convention for organizing branches, not something the CLI parses specially.

When a merge request targets one of those branches, the pipeline finds the matching dated (or environment-named) config and runs only the stages and deployments it lists. Once that MR merges, `deploy happy-soup deployment-close-out` copies whichever config file was actually used onto `config/deploy.json` and commits it (`[skip ci]`) — so if the pipeline later runs directly on the environment branch itself (not via an MR), `config/deploy.json` defines its actions, with no `--source-branch-name` needed at that point.

## Picking the right one

|                               | Project                                                         | Happy Soup                                                                               |
| ----------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Repository holds              | One app's source — 2GP Unlocked Package preferred, not required | Its own `sfdx-project.json` + unpackaged org metadata                                    |
| Scope per pipeline run        | One package + its dependencies, into one sandbox                | Multiple named applications, into one environment                                        |
| Dependency install            | `install-packaged`, always runs                                 | `install-packaged`, always runs                                                          |
| Unpackaged/destructive stages | Single implicit `local` deployment                              | Explicit `deployments[]` array, gated per stage per app                                  |
| Config resolution             | Fixed path (`config/deploy.json`)                               | Derived from `--source-branch-name`, archived on merge                                   |
| Apex tests                    | `run-apex-tests` against the installed package                  | Covered by `--test-level`/`--test-suite`/`--tests` on the deploy-unpackaged stage itself |

If your org receives one app's metadata — packaged or not — from its own dedicated repo, you're doing `project`. If your org is one shared environment receiving unpackaged metadata from several application repos, you're doing `happy-soup`. Don't mix flags from one topic into the other — `deploy project *` commands reject `--source-branch-name` (it doesn't exist on them), and `deploy happy-soup *` commands have no concept of `--subscriber-package-version-id`.

See [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) for how the stage commands within either topic chain together, and the [command reference](/cicd/reference/deploy-project/) for exact flags.
