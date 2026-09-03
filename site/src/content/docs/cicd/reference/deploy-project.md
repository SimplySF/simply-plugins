---
title: 'Deploy — Project'
description: 'Command reference for the 2GP packaged deploy pipeline stages.'
---

## `sf simply cicd deploy project deploy-unpackaged`

Run the deploy-unpackaged stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project deploy-unpackaged --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the deploy-unpackaged stage of a project deployment.

  Runs the `bin/unpackagedDeploy.sh` script (if present) against the local project directory, resuming from the
  deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project deploy-unpackaged --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/deploy-unpackaged.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/deploy-unpackaged.js)_

## `sf simply cicd deploy project install-packaged`

Install packaged dependencies and the project's own package into the target org.

```
USAGE
  $ sf simply cicd deploy project install-packaged --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab] [--debug] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>] [--subscriber-package-version-id <value>] [--install-type All|Delta|Upgrade]

FLAGS
  --alias=<value>                          (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>                   (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to
                                           authenticate read-only repository clones.
  --debug                                  [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>             [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to
                                           the deployment configuration file.
  --deploy-progress-file=<value>           [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path
                                           to the deployment progress file.
  --deploy-rules-file=<value>              [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path
                                           to the deployment rules file.
  --install-type=<option>                  [default: Upgrade] The type of dependency installation to perform.
                                           <options: All|Delta|Upgrade>
  --subscriber-package-version-id=<value>  The subscriber package version ID (04t...) to install. If not provided, the
                                           ID is looked up from the git tag annotation at HEAD.
  --vcs-host=<value>                       [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g.
                                           gitlab.com).
  --vcs-provider=<option>                  [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting
                                           platform to talk to.
                                           <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install packaged dependencies and the project's own package into the target org.

  Installs the packaged dependencies declared in `sfdx-project.json`, then installs the project's own main package —
  prioritizing --subscriber-package-version-id if given, otherwise looking for a `04t...` package ID annotated on the
  git tag pointing at HEAD.

EXAMPLES
  $ sf simply cicd deploy project install-packaged --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/install-packaged.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/install-packaged.js)_

## `sf simply cicd deploy project post-deploy`

Run the post-deploy stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project post-deploy --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-deploy stage of a project deployment.

  Runs the `bin/postDeploy.sh` script (if present) against the local project directory, resuming from the deployment
  progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project post-deploy --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/post-deploy.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/post-deploy.js)_

## `sf simply cicd deploy project post-destructive`

Run the post-destructive stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project post-destructive --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-destructive stage of a project deployment.

  Runs the `bin/postDestructive.sh` script (if present) against the local project directory, resuming from the
  deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project post-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/post-destructive.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/post-destructive.js)_

## `sf simply cicd deploy project pre-destructive`

Run the pre-destructive stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project pre-destructive --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider github|gitlab]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the pre-destructive stage of a project deployment.

  Runs the `bin/preDestructive.sh` script (if present) against the local project directory, resuming from the deployment
  progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy project pre-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/pre-destructive.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/pre-destructive.js)_

## `sf simply cicd deploy project run-apex-tests`

Run Apex tests against the target org for a project deployment.

```
USAGE
  $ sf simply cicd deploy project run-apex-tests --ci-job-token <value> --alias <value> [--json] [--flags-dir <value>] [--vcs-host <value>]
    [--vcs-provider github|gitlab] [--debug] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>]

FLAGS
  --alias=<value>                 (required) [env: SIMPLY_CICD_ALIAS] Salesforce org alias.
  --ci-job-token=<value>          (required) [env: SIMPLY_CICD_CI_JOB_TOKEN] The CI job token used to authenticate
                                  read-only repository clones.
  --debug                         [env: SIMPLY_CICD_DEBUG] Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json, env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the
                                  deployment rules file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests, env: SIMPLY_CICD_TEST_LEVEL] The Apex test level to run.
  --test-suite=<value>            [env: SIMPLY_CICD_TEST_SUITE] The Apex test suite to run. If specified, overrides
                                  --test-level.
  --tests=<value>                 [env: SIMPLY_CICD_TESTS] Specific Apex tests to run.
  --vcs-host=<value>              [env: SIMPLY_CICD_VCS_HOST] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab, env: SIMPLY_CICD_VCS_PROVIDER] The source-control-hosting platform
                                  to talk to.
                                  <options: github|gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run Apex tests against the target org for a project deployment.

  Authenticates to the target org and runs its Apex tests, if any exist in the project's package directories.

EXAMPLES
  $ sf simply cicd deploy project run-apex-tests --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/run-apex-tests.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/run-apex-tests.js)_

## `sf simply cicd deploy project validate`

Validate deployment configuration files for a project deployment.

```
USAGE
  $ sf simply cicd deploy project validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>]

FLAGS
  --deploy-config-file=<value>    [default: config/deploy.json, env: SIMPLY_CICD_DEPLOY_CONFIG_FILE] Path to the
                                  deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json, env: SIMPLY_CICD_DEPLOY_PROGRESS_FILE] Path to the
                                  deployment progress file. Accepted for consistency with the other project deployment
                                  commands; not used by validation.
  --deploy-rules-file=<value>     [env: SIMPLY_CICD_DEPLOY_RULES_FILE] Path to the deployment rules file.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate deployment configuration files for a project deployment.

  Validates `config/deploy.json` (or the path given by --deploy-config-file) and, if --deploy-rules-file is given, the
  deployment rules file. A missing file is skipped with a warning; a malformed or schema-invalid file fails the command.

EXAMPLES
  $ sf simply cicd deploy project validate

  $ sf simply cicd deploy project validate --deploy-config-file config/deploy.json --deploy-rules-file config/deploy-rules.json
```

_See code: [lib/commands/simply/cicd/deploy/project/validate.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.8.11/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/validate.js)_
