---
title: Get Started
description: Requirements and installation for the Simply Salesforce CLI plugins.
---

## Requirements

- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli) (`sf`)
- Node.js `>=22.0.0`

## Install

The orchestrator plugin bundles the eight general-purpose plugins in one install:

```sh
sf plugins install @simplysf/simply
```

That covers `simply-apex`, `simply-data`, `simply-document`, `simply-package`, `simply-permissions`, `simply-project`, `simply-schema`, and `simply-sobject`.

[`simply-cicd`](/cicd/) is **not** part of that bundle — it's built for CI runners rather than day-to-day desktop use, so install it on its own:

```sh
sf plugins install @simplysf/simply-cicd
```

Any plugin can also be installed individually if you'd rather not take the whole bundle — each works standalone:

```sh
sf plugins install @simplysf/simply-apex
sf plugins install @simplysf/simply-data
sf plugins install @simplysf/simply-document
sf plugins install @simplysf/simply-package
sf plugins install @simplysf/simply-permissions
sf plugins install @simplysf/simply-project
sf plugins install @simplysf/simply-schema
sf plugins install @simplysf/simply-sobject
```

## Verify it worked

```sh
sf simply --help
```

If you installed `simply-cicd`, check it separately — it registers its own topic:

```sh
sf simply cicd --help
```

## Where to go next

- Setting up CI/CD? Head to the [simply-cicd overview](/cicd/) — it's the deepest-documented plugin on this site.
- Looking for a specific plugin's commands? See [All plugins](/#all-plugins) on the home page, or jump straight to a [command reference](/plugins/simply-apex/) page.
- Want to contribute? See [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) in the repo.
