---
title: 'Deploy — Validate'
description: 'Command reference for the generic deploy validate command.'
---

## `sf simply cicd deploy validate`

Validate deployment configuration files against their JSON schemas.

```
USAGE
  $ sf simply cicd deploy validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-rules-file <value>]
    [--source-branch-name <value>]

FLAGS
  --deploy-config-file=<value>  [env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the deployment configuration file.
  --deploy-rules-file=<value>   [env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the deployment rules file.
  --source-branch-name=<value>  [env: SIMPLY_CICD_SOURCE_BRANCH_NAME] The source branch name for the deployment, used to
                                derive the deployment config file path if --deploy-config-file is not provided.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate deployment configuration files against their JSON schemas.

  Validates the deployment config file (`deploy.json`) and deployment rules file independently against their schemas. A
  missing file is skipped with a warning; a malformed or schema-invalid file fails the command.

  This is the generic form of the command, with no namespace-specific default file paths — see `deploy project validate`
  and `deploy happy-soup validate` for versions with sensible defaults for those deployment styles.

EXAMPLES
  $ sf simply cicd deploy validate --deploy-config-file config/deploy.json --deploy-rules-file config/deploy-rules.json
```

_See code: [lib/commands/simply/cicd/deploy/validate.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.4.1/packages/simply-cicd/lib/commands/simply/cicd/deploy/validate.js)_
