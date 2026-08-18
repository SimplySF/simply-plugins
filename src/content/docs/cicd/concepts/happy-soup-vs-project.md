---
title: Project vs. Happy Soup
description: Understanding the different deployment paradigms supported by Simply and how they can fit into your development workflow.
sidebar:
  order: 1
---

Simply views the Salesforce deployment world through two distinct lenses, the view of the Project and the view of the Happy Soup. The Project defines a discrete application or package of metadata that is being defined for later deployment into an environment. It could contain many dependencies on other packages, or it could be standalone. The Happy Soup defines a collection of packages and org-centric metadata that needs to be deployed into one or many environments.

The Project is the mechanism through which an individual application gets assembled, and the Happy Soup is how that Project and many others get delivered to an end-user environment.

The Project repositories and the Happy Soup repositories are separated for many reasons. The primary one is that it allows for Projects to define their own rules in terms of SDLC and governance around how and when changes to application code are managed. The Happy Soup, however, has strong governance and required approvals in place to prevent unilateral change to environments. The Happy Soup is the deployment orchestrator and it is the "source of truth" of what has been deployed into an environment.

## Project: one repo, one unlocked package, sandbox promotion

A **project** repository holds the source for a single Salesforce application, built as a second-generation **unlocked** package. The `build` topic commands compile it, push it to a scratch org, test it, and create a package version from it. From there, `deploy project *` orchestrates promoting **that one project's package — plus its declared dependencies — into a sandbox environment**. It's deliberately narrow: one repository, one package, one target at a time.

1. `deploy project install-packaged` installs the packaged dependencies declared in `sfdx-project.json`, then the project's own package — resolving the version to install from `--subscriber-package-version-id`, or by reading the `04t...` ID annotated on the git tag at `HEAD` if not given explicitly.
2. `deploy project deploy-unpackaged` **also exists** — a project pipeline isn't limited to installing the package as-is. Anything that has to ship as source rather than inside the package (org-specific config, metadata the package intentionally excludes) runs through `bin/unpackagedDeploy.sh`, same as happy-soup's equivalent stage.
3. `deploy project run-apex-tests` authenticates to the target org directly and runs its Apex tests, since the tests live inside the installed package.

There's exactly one deploy config path per environment (`config/deploy.json` by default), and no `--source-branch-name` flag on `deploy project *` commands — there's nothing to derive, since a project pipeline only ever has one implicit deployment target (internally called `local`).

## Happy soup: standalone repo, multiple apps, one org per environment

"Happy soup" is Salesforce-community shorthand for a large, unpackaged metadata org — everything deployed as source, no package boundary. A **happy-soup** repository is its own standalone thing: it has its own `sfdx-project.json` (declaring every packaged dependency that needs installing) plus a Salesforce source tree of org-centric metadata that isn't packaged anywhere. Where a project pipeline promotes one package, a happy-soup pipeline **orchestrates deploying multiple applications' worth of metadata into one Salesforce environment**.

- Dependencies declared in `sfdx-project.json` are installed **unconditionally** by `deploy happy-soup install-packaged` — that part isn't configurable per stage.
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

  `slug` is the VCS project path `simply-cicd` clones fresh for that deployment (skipped for the reserved name `local`, since that always means "this repo, already checked out" — the same mechanism a project pipeline uses internally for its one implicit deployment). `ref` pins a branch/tag to check out; if omitted, `simply-cicd` first tries to deduce a version tag from this deployment's own dependency entry in `sfdx-project.json` (a `"<name>@<version>"` dependency resolves to git tag `v<version>`), and only falls back to the repo's default branch if that lookup finds nothing. Each of the four boolean stage flags controls **only** whether that named deployment participates in that specific stage — `reporting-app` above only ever runs its unpackaged deploy, never pre/post-destructive or post-deploy.

- An optional **`deploy-rules.json`** enforces minimums on top of that. Each entry in its `rules` array matches a `deployments[]` entry by `deploymentName` or `deploymentSlug` (at least one of the two is required) and lists `requireStages` — the stage flags (`unpackagedDeploy`, `preDestructive`, `postDestructive`, `postDeploy`) that matched deployment must have set to `true`:

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

Deploy config resolution: an explicit `--deploy-config-file` always wins; otherwise it's derived from `--source-branch-name` by taking whatever comes after the first `/` and looking for `deployment-configs/<that>.json`. So a branch named `release/2026-08-16` resolves to `deployment-configs/2026-08-16.json`, and `environment/production` resolves to `deployment-configs/production.json` — the prefix before the slash is just a naming convention for you to organize branches by, not something the CLI parses specially.

When a merge request targets one of those branches, the pipeline finds the matching dated (or environment-named) config and runs only the stages/deployments it lists. Once that MR merges, `deploy happy-soup deployment-close-out` copies whichever config file was actually used onto `config/deploy.json` and commits it (`[skip ci]`) — so if the pipeline later runs directly on the environment branch itself (not via an MR), `config/deploy.json` is what defines its actions, with no `--source-branch-name` needed at that point.

## Picking the right one

|                               | Project                                            | Happy Soup                                                                               |
| ----------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Repository holds              | One app's source, built as an unlocked 2GP package | Its own `sfdx-project.json` + unpackaged org metadata                                    |
| Scope per pipeline run        | One package + its dependencies, into one sandbox   | Multiple named applications, into one environment                                        |
| Dependency install            | `install-packaged`, always runs                    | `install-packaged`, always runs unconditionally                                          |
| Unpackaged/destructive stages | Single implicit `local` deployment                 | Explicit `deployments[]` array, gated per stage per app                                  |
| Config resolution             | Fixed path (`config/deploy.json`)                  | Derived from `--source-branch-name`, archived on merge                                   |
| Apex tests                    | `run-apex-tests` against the installed package     | Covered by `--test-level`/`--test-suite`/`--tests` on the deploy-unpackaged stage itself |

If your org installs a single namespaced package with a version number, you're doing `project`. If your org is one shared environment receiving unpackaged metadata from several application repos, you're doing `happy-soup`. Don't mix flags from one topic into the other — `deploy project *` commands reject `--source-branch-name` (it doesn't exist on them), and `deploy happy-soup *` commands have no concept of `--subscriber-package-version-id`.

See [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) for how the stage commands within either topic chain together, and the [command reference](/cicd/reference/deploy-project/) for exact flags.
