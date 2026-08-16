# @simplysf/simply-cicd

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-cicd?label=@simplysf/simply-cicd)](https://npmjs.com/@simplysf/simply-cicd) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-cicd.svg)](https://npmjs.com/@simplysf/simply-cicd) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply-cicd
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-node) monorepo. See the repo's [CONTRIBUTING.md](https://github.com/SimplySF/simply-node/blob/main/CONTRIBUTING.md) for the repo structure, how to set up and build the project, our commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-node/blob/main/CODE_OF_CONDUCT.md).

## Commands

<!-- commands -->

- [`sf simply cicd deploy happy-soup deploy-unpackaged`](#sf-simply-cicd-deploy-happy-soup-deploy-unpackaged)
- [`sf simply cicd deploy happy-soup deployment-close-out`](#sf-simply-cicd-deploy-happy-soup-deployment-close-out)
- [`sf simply cicd deploy happy-soup install-packaged`](#sf-simply-cicd-deploy-happy-soup-install-packaged)
- [`sf simply cicd deploy happy-soup post-deploy`](#sf-simply-cicd-deploy-happy-soup-post-deploy)
- [`sf simply cicd deploy happy-soup post-destructive`](#sf-simply-cicd-deploy-happy-soup-post-destructive)
- [`sf simply cicd deploy happy-soup pre-destructive`](#sf-simply-cicd-deploy-happy-soup-pre-destructive)
- [`sf simply cicd deploy happy-soup tag-deployment`](#sf-simply-cicd-deploy-happy-soup-tag-deployment)
- [`sf simply cicd deploy happy-soup validate`](#sf-simply-cicd-deploy-happy-soup-validate)
- [`sf simply cicd deploy project deploy-unpackaged`](#sf-simply-cicd-deploy-project-deploy-unpackaged)
- [`sf simply cicd deploy project install-packaged`](#sf-simply-cicd-deploy-project-install-packaged)
- [`sf simply cicd deploy project post-deploy`](#sf-simply-cicd-deploy-project-post-deploy)
- [`sf simply cicd deploy project post-destructive`](#sf-simply-cicd-deploy-project-post-destructive)
- [`sf simply cicd deploy project pre-destructive`](#sf-simply-cicd-deploy-project-pre-destructive)
- [`sf simply cicd deploy project run-apex-tests`](#sf-simply-cicd-deploy-project-run-apex-tests)
- [`sf simply cicd deploy project validate`](#sf-simply-cicd-deploy-project-validate)
- [`sf simply cicd deploy validate`](#sf-simply-cicd-deploy-validate)
- [`sf simply cicd notify happy-soup`](#sf-simply-cicd-notify-happy-soup)
- [`sf simply cicd notify project`](#sf-simply-cicd-notify-project)
- [`sf simply cicd notify teams`](#sf-simply-cicd-notify-teams)
- [`sf simply cicd sfdx-dependabot`](#sf-simply-cicd-sfdx-dependabot)

## `sf simply cicd deploy happy-soup deploy-unpackaged`

Run the deploy-unpackaged stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup deploy-unpackaged --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    Path to the deployment configuration file. If not provided, derived from
                                  --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --source-branch-name=<value>    The source branch name for the deployment, used to derive the deployment config file
                                  path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the deploy-unpackaged stage of a happy-soup deployment.

  Runs the `bin/unpackagedDeploy.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup deploy-unpackaged --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/deploy-unpackaged.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/deploy-unpackaged.js)_

## `sf simply cicd deploy happy-soup deployment-close-out`

Archive the deployment config file used for a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup deployment-close-out --ci-commit-ref-name <value> --ci-pipeline-id <value> --ci-project-path <value>
    --project-access-token <value> [--json] [--flags-dir <value>] [--debug] [--deploy-config-file <value>]
    [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--deploy-release-date <value>] [--source-branch-name
    <value>] [--vcs-host <value>] [--vcs-provider gitlab]

FLAGS
  --ci-commit-ref-name=<value>    (required) The commit ref (branch) to fetch and switch to before archiving.
  --ci-pipeline-id=<value>        (required) The CI pipeline ID, used to build the authenticated push remote.
  --ci-project-path=<value>       (required) The project path (e.g. group/project), used to build the authenticated push
                                  remote.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    Path to the deployment configuration file to archive, if --deploy-release-date is not
                                  provided.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-release-date=<value>   The release date (e.g. 2026-01-15) used to resolve the source file as
                                  `deployment-configs/<date>.json`, taking priority over --deploy-config-file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --project-access-token=<value>  (required) A project access token with write access, used to push the archive commit.
  --source-branch-name=<value>    The source branch name for the deployment, used to derive the deployment config file
                                  path if --deploy-config-file is not provided.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Archive the deployment config file used for a happy-soup deployment.

  Fetches and switches to the commit ref, then copies the deployment config file that was used (either
  --deploy-release-date resolved to `deployment-configs/<date>.json`, or the explicit/derived deploy config file) to
  `config/deploy.json` and commits it. If no source file can be found, an existing obsolete `config/deploy.json` is
  removed instead. Both cases push the change with a `[skip ci]` commit message.

EXAMPLES
  $ sf simply cicd deploy happy-soup deployment-close-out --ci-commit-ref-name main --ci-pipeline-id 123 --ci-project-path group/project --project-access-token $PROJECT_ACCESS_TOKEN --deploy-release-date 2026-01-15
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/deployment-close-out.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/deployment-close-out.js)_

## `sf simply cicd deploy happy-soup install-packaged`

Install packaged dependencies into the target org for a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup install-packaged [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>] [--client-id <value>]
    [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>] [--install-type All|Delta|Upgrade]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --install-type=<option>         [default: Upgrade] The type of dependency installation to perform.
                                  <options: All|Delta|Upgrade>
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --username=<value>              Salesforce username, used for JWT authentication.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install packaged dependencies into the target org for a happy-soup deployment.

  Authenticates to the target org and installs the packaged dependencies declared in `sfdx-project.json`.

EXAMPLES
  $ sf simply cicd deploy happy-soup install-packaged --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/install-packaged.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/install-packaged.js)_

## `sf simply cicd deploy happy-soup post-deploy`

Run the post-deploy stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup post-deploy --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    Path to the deployment configuration file. If not provided, derived from
                                  --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --source-branch-name=<value>    The source branch name for the deployment, used to derive the deployment config file
                                  path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-deploy stage of a happy-soup deployment.

  Runs the `bin/postDeploy.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup post-deploy --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/post-deploy.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/post-deploy.js)_

## `sf simply cicd deploy happy-soup post-destructive`

Run the post-destructive stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup post-destructive --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    Path to the deployment configuration file. If not provided, derived from
                                  --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --source-branch-name=<value>    The source branch name for the deployment, used to derive the deployment config file
                                  path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the post-destructive stage of a happy-soup deployment.

  Runs the `bin/postDestructive.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup post-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/post-destructive.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/post-destructive.js)_

## `sf simply cicd deploy happy-soup pre-destructive`

Run the pre-destructive stage of a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup pre-destructive --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--source-branch-name
    <value>] [--start-from <value>] [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>]
    [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    Path to the deployment configuration file. If not provided, derived from
                                  --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --source-branch-name=<value>    The source branch name for the deployment, used to derive the deployment config file
                                  path if --deploy-config-file is not provided.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run the pre-destructive stage of a happy-soup deployment.

  Runs the `bin/preDestructive.sh` script (if present) for each configured deployment that participates in this stage,
  cloning each repo fresh and resuming from the deployment progress file unless --start-from is given.

EXAMPLES
  $ sf simply cicd deploy happy-soup pre-destructive --ci-job-token $CI_JOB_TOKEN --alias my-org --source-branch-name release/uat
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/pre-destructive.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/pre-destructive.js)_

## `sf simply cicd deploy happy-soup tag-deployment`

Tag the current commit with details about a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup tag-deployment --ci-merge-request-iid <value> --ci-merge-request-project-url <value> --ci-pipeline-id <value>
    --ci-pipeline-url <value> --ci-project-path <value> --project-access-token <value> [--json] [--flags-dir <value>]
    [--alias <value>] [--auth-url <value>] [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>]
    [--username <value>] [--debug] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--vcs-host <value>]
    [--vcs-provider gitlab]

FLAGS
  --alias=<value>                         Salesforce org alias.
  --auth-url=<value>                      Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                          authentication.
  --ci-merge-request-iid=<value>          (required) The merge request's internal ID (IID), used to build the merge
                                          request link in the tag message.
  --ci-merge-request-project-url=<value>  (required) The project's URL, used to build the merge request link in the tag
                                          message.
  --ci-pipeline-id=<value>                (required) The CI pipeline ID.
  --ci-pipeline-url=<value>               (required) The CI pipeline URL, included in the tag message if provided.
  --ci-project-path=<value>               (required) The project path (e.g. group/project), used to build the
                                          authenticated push remote.
  --client-id=<value>                     Connected app client ID, used for JWT authentication.
  --debug                                 Enable verbose debug logging.
  --deploy-progress-file=<value>          [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>             [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>                  Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>                  Path to the JWT private key file.
  --project-access-token=<value>          (required) A project access token with write access, used to push the tag.
  --username=<value>                      Salesforce username, used for JWT authentication.
  --vcs-host=<value>                      [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>                 [default: gitlab] The source-control-hosting platform to talk to.
                                          <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Tag the current commit with details about a happy-soup deployment.

  Authenticates to the target org, derives an org domain prefix from its instance URL, and creates an annotated git tag
  (`deployed--<org-domain-prefix>-<timestamp>`) recording the deployment time (America/New_York) and, if provided, the
  associated pipeline and merge request links. The tag is pushed to the source repository.

EXAMPLES
  $ sf simply cicd deploy happy-soup tag-deployment --alias my-org --ci-pipeline-id 123 --ci-pipeline-url https://gitlab.example.com/group/project/-/pipelines/123 --ci-project-path group/project --ci-merge-request-iid 45 --ci-merge-request-project-url https://gitlab.example.com/group/project --project-access-token $PROJECT_ACCESS_TOKEN
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/tag-deployment.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/tag-deployment.js)_

## `sf simply cicd deploy happy-soup validate`

Validate deployment configuration files for a happy-soup deployment.

```
USAGE
  $ sf simply cicd deploy happy-soup validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>] [--source-branch-name <value>]

FLAGS
  --deploy-config-file=<value>    Path to the deployment configuration file. If not provided, derived from
                                  --source-branch-name.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --source-branch-name=<value>    The source branch name for the deployment, used to derive the deployment config file
                                  path if --deploy-config-file is not provided.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Validate deployment configuration files for a happy-soup deployment.

  Validates the deployment config file (explicit, or derived from --source-branch-name) and, if --deploy-rules-file is
  given, the deployment rules file. A missing file is skipped with a warning; a malformed or schema-invalid file fails
  the command.

EXAMPLES
  $ sf simply cicd deploy happy-soup validate --source-branch-name release/uat

  $ sf simply cicd deploy happy-soup validate --deploy-config-file deployment-configs/uat.json --deploy-rules-file config/deploy-rules.json
```

_See code: [lib/commands/simply/cicd/deploy/happy-soup/validate.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/happy-soup/validate.js)_

## `sf simply cicd deploy project deploy-unpackaged`

Run the deploy-unpackaged stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project deploy-unpackaged --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json] Path to the deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

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

_See code: [lib/commands/simply/cicd/deploy/project/deploy-unpackaged.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/deploy-unpackaged.js)_

## `sf simply cicd deploy project install-packaged`

Install packaged dependencies and the project's own package into the target org.

```
USAGE
  $ sf simply cicd deploy project install-packaged --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>]
    [--subscriber-package-version-id <value>] [--install-type All|Delta|Upgrade]

FLAGS
  --alias=<value>                          Salesforce org alias.
  --auth-url=<value>                       Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                           authentication.
  --ci-job-token=<value>                   (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>                      Connected app client ID, used for JWT authentication.
  --debug                                  Enable verbose debug logging.
  --deploy-config-file=<value>             [default: config/deploy.json] Path to the deployment configuration file.
  --deploy-progress-file=<value>           [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>              [default: config/deploy-rules.json] Path to the deployment rules file.
  --install-type=<option>                  [default: Upgrade] The type of dependency installation to perform.
                                           <options: All|Delta|Upgrade>
  --instance-url=<value>                   Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>                   Path to the JWT private key file.
  --subscriber-package-version-id=<value>  The subscriber package version ID (04t...) to install. If not provided, the
                                           ID is looked up from the git tag annotation at HEAD.
  --username=<value>                       Salesforce username, used for JWT authentication.

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

_See code: [lib/commands/simply/cicd/deploy/project/install-packaged.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/install-packaged.js)_

## `sf simply cicd deploy project post-deploy`

Run the post-deploy stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project post-deploy --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json] Path to the deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

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

_See code: [lib/commands/simply/cicd/deploy/project/post-deploy.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/post-deploy.js)_

## `sf simply cicd deploy project post-destructive`

Run the post-destructive stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project post-destructive --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json] Path to the deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

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

_See code: [lib/commands/simply/cicd/deploy/project/post-destructive.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/post-destructive.js)_

## `sf simply cicd deploy project pre-destructive`

Run the pre-destructive stage of a project deployment.

```
USAGE
  $ sf simply cicd deploy project pre-destructive --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>] [--vcs-host <value>] [--vcs-provider gitlab]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json] Path to the deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.
  --vcs-host=<value>              [default: gitlab.com] The source-control host to talk to (e.g. gitlab.com).
  --vcs-provider=<option>         [default: gitlab] The source-control-hosting platform to talk to.
                                  <options: gitlab>

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

_See code: [lib/commands/simply/cicd/deploy/project/pre-destructive.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/pre-destructive.js)_

## `sf simply cicd deploy project run-apex-tests`

Run Apex tests against the target org for a project deployment.

```
USAGE
  $ sf simply cicd deploy project run-apex-tests --ci-job-token <value> [--json] [--flags-dir <value>] [--alias <value>] [--auth-url <value>]
    [--client-id <value>] [--instance-url <value>] [--jwt-key-file <value>] [--username <value>] [--debug]
    [--deploy-config-file <value>] [--deploy-progress-file <value>] [--deploy-rules-file <value>] [--start-from <value>]
    [--test-level <value>] [--test-suite <value>] [--tests <value>]

FLAGS
  --alias=<value>                 Salesforce org alias.
  --auth-url=<value>              Salesforce authorization (SFDX auth) URL, used as an alternative to JWT
                                  authentication.
  --ci-job-token=<value>          (required) The CI job token used to authenticate read-only repository clones.
  --client-id=<value>             Connected app client ID, used for JWT authentication.
  --debug                         Enable verbose debug logging.
  --deploy-config-file=<value>    [default: config/deploy.json] Path to the deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file.
  --deploy-rules-file=<value>     [default: config/deploy-rules.json] Path to the deployment rules file.
  --instance-url=<value>          Salesforce login/instance URL, used for JWT authentication.
  --jwt-key-file=<value>          Path to the JWT private key file.
  --start-from=<value>            Start (or resume) the deployment from a specific job name, overriding the progress
                                  file.
  --test-level=<value>            [default: RunLocalTests] The Apex test level to run.
  --test-suite=<value>            The Apex test suite to run. If specified, overrides --test-level.
  --tests=<value>                 Specific Apex tests to run.
  --username=<value>              Salesforce username, used for JWT authentication.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Run Apex tests against the target org for a project deployment.

  Authenticates to the target org and runs its Apex tests, if any exist in the project's package directories.

EXAMPLES
  $ sf simply cicd deploy project run-apex-tests --ci-job-token $CI_JOB_TOKEN --alias my-org
```

_See code: [lib/commands/simply/cicd/deploy/project/run-apex-tests.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/run-apex-tests.js)_

## `sf simply cicd deploy project validate`

Validate deployment configuration files for a project deployment.

```
USAGE
  $ sf simply cicd deploy project validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-progress-file <value>]
    [--deploy-rules-file <value>]

FLAGS
  --deploy-config-file=<value>    [default: config/deploy.json] Path to the deployment configuration file.
  --deploy-progress-file=<value>  [default: DEPLOY_PROGRESS.json] Path to the deployment progress file. Accepted for
                                  consistency with the other project deployment commands; not used by validation.
  --deploy-rules-file=<value>     Path to the deployment rules file.

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

_See code: [lib/commands/simply/cicd/deploy/project/validate.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/project/validate.js)_

## `sf simply cicd deploy validate`

Validate deployment configuration files against their JSON schemas.

```
USAGE
  $ sf simply cicd deploy validate [--json] [--flags-dir <value>] [--deploy-config-file <value>] [--deploy-rules-file <value>]
    [--source-branch-name <value>]

FLAGS
  --deploy-config-file=<value>  Path to the deployment configuration file.
  --deploy-rules-file=<value>   Path to the deployment rules file.
  --source-branch-name=<value>  The source branch name for the deployment, used to derive the deployment config file
                                path if --deploy-config-file is not provided.

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

_See code: [lib/commands/simply/cicd/deploy/validate.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/deploy/validate.js)_

## `sf simply cicd notify happy-soup`

Send a happy-soup deployment stage notification to Microsoft Teams, without Jira story integration.

```
USAGE
  $ sf simply cicd notify happy-soup [--json] [--flags-dir <value>] [--after-script] [--before-script] [--ci-commit-ref-name
    <value>] [--ci-environment-name <value>] [--ci-job-name <value>] [--ci-job-stage <value>] [--ci-job-status <value>]
    [--ci-pipeline-id <value>] [--ci-pipeline-url <value>] [--enabled] [--teams-webhook-url <value>...]
    [--notify-on-completion] [--is-final-job] [--debug]

FLAGS
  --after-script                  Run the after-stage notification logic.
  --before-script                 Run the before-stage (starting) notification logic.
  --ci-commit-ref-name=<value>    The git branch or tag ref for this pipeline run.
  --ci-environment-name=<value>   The name of the target CI environment.
  --ci-job-name=<value>           The name of the current CI job.
  --ci-job-stage=<value>          The stage of the current CI job.
  --ci-job-status=<value>         The status of the current CI job (e.g. success, failed).
  --ci-pipeline-id=<value>        The ID of the current CI pipeline.
  --ci-pipeline-url=<value>       The URL of the current CI pipeline.
  --debug                         Enable verbose debug logging.
  --enabled                       Whether the notification is actually sent. Defaults to false so pipelines can gate
                                  this behind their own condition.
  --is-final-job                  Marks this job as the final job in the pipeline. Combined with --after-script and
                                  --notify-on-completion, this is what actually triggers the final notification.
  --notify-on-completion          Only send a notification on the final job of the pipeline, suppressing per-stage
                                  notifications.
  --teams-webhook-url=<value>...  One or more Teams webhook URLs to send the notification to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a happy-soup deployment stage notification to Microsoft Teams, without Jira story integration.

  Run with `--before-script` at the start of a stage to post a "starting" card, and with `--after-script` at the end to
  post a success or failure card. With `--notify-on-completion`, intermediate stage notifications are suppressed and
  only the final job (`--is-final-job` combined with `--after-script`) posts a card.

EXAMPLES
  $ sf simply cicd notify happy-soup --before-script --ci-job-stage pre-destructive --teams-webhook-url https://outlook.office.com/webhook/... --enabled

  $ sf simply cicd notify happy-soup --after-script --is-final-job --notify-on-completion --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/happy-soup.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/notify/happy-soup.js)_

## `sf simply cicd notify project`

Send a project deployment notification to Microsoft Teams, with Jira story integration.

```
USAGE
  $ sf simply cicd notify project [--json] [--flags-dir <value>] [--after-script] [--alias <value>] [--before-script]
    [--ci-commit-ref-name <value>] [--ci-environment-name <value>] [--ci-job-name <value>] [--ci-job-stage <value>]
    [--ci-job-status <value>] [--ci-pipeline-id <value>] [--ci-pipeline-url <value>] [--ci-project-title <value>]
    [--client-id <value>] [--devhub-tooling-client-id <value>] [--devhub-tooling-instance-url <value>]
    [--devhub-tooling-username <value>] [--enabled] [--instance-url <value>] [--jira-base-url <value>]
    [--jira-project-key <value>] [--jwt-key-file <value>] [--prev-installed-package-version <value>]
    [--subscriber-package-version-id <value>] [--target-package-version <value>] [--teams-webhook-url <value>...]
    [--username <value>] [--debug]

FLAGS
  --after-script                            Run the after-deployment notification logic.
  --alias=<value>                           The target Salesforce org alias to authenticate and query for the previously
                                            installed package version.
  --before-script                           Run the before-deployment setup logic (resolves and records package
                                            versions).
  --ci-commit-ref-name=<value>              The git branch or tag ref for this pipeline run.
  --ci-environment-name=<value>             The name of the target CI environment.
  --ci-job-name=<value>                     The name of the current CI job.
  --ci-job-stage=<value>                    The stage of the current CI job (e.g. pre-destructive, post-destructive).
  --ci-job-status=<value>                   The status of the current CI job (e.g. success, failed, canceled).
  --ci-pipeline-id=<value>                  The ID of the current CI pipeline.
  --ci-pipeline-url=<value>                 The URL of the current CI pipeline.
  --ci-project-title=<value>                The project title shown in the notification card's heading.
  --client-id=<value>                       Connected app client ID for JWT authentication to the target org.
  --debug                                   Enable verbose debug logging.
  --devhub-tooling-client-id=<value>        Connected app client ID for JWT authentication to the tooling DevHub.
  --devhub-tooling-instance-url=<value>     Login instance URL for the tooling DevHub.
  --devhub-tooling-username=<value>         Username for JWT authentication to the tooling DevHub.
  --enabled                                 Whether the notification is actually sent. Defaults to false so pipelines
                                            can gate this behind their own condition.
  --instance-url=<value>                    Login instance URL for the target org.
  --jira-base-url=<value>                   Base URL for linking a Jira issue key, e.g. https://jira.example.com/browse.
                                            Story keys are shown without links if not provided.
  --jira-project-key=<value>                Fallback Jira project key(s) used to search commit messages for story
                                            references, if none are configured in .sfdevrc.json.
  --jwt-key-file=<value>                    Path to the JWT private key file, used for both the target org and tooling
                                            DevHub authentication.
  --prev-installed-package-version=<value>  The previously installed package version. Only needed if re-running
                                            --after-script without having run --before-script first in the same job.
  --subscriber-package-version-id=<value>   The subscriber package version ID (04t...) being deployed, used to resolve
                                            the target package version from the tooling DevHub.
  --target-package-version=<value>          The target package version. Only needed if re-running --after-script without
                                            having run --before-script first in the same job.
  --teams-webhook-url=<value>...            One or more Teams webhook URLs to send the notification to.
  --username=<value>                        Username for JWT authentication to the target org.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a project deployment notification to Microsoft Teams, with Jira story integration.

  Run once with `--before-script` at the start of a deployment pipeline (to record the previously installed and target
  package versions), and once with `--after-script` at the end (to post a success or failure card to Teams, including
  the Jira stories that shipped between those two versions).

EXAMPLES
  $ sf simply cicd notify project --before-script --ci-job-stage pre-destructive --alias my-org --username user@example.com --jwt-key-file server.key --client-id abc123 --instance-url https://login.salesforce.com --enabled

  $ sf simply cicd notify project --after-script --ci-job-stage post-destructive --ci-job-status success --teams-webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/project.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/notify/project.js)_

## `sf simply cicd notify teams`

Send a serialized JSON payload to a Microsoft Teams webhook.

```
USAGE
  $ sf simply cicd notify teams --payload <value> --webhook-url <value> [--json] [--flags-dir <value>] [--enabled]
  [--debug]

FLAGS
  --debug                Enable verbose debug logging.
  --enabled              Whether the notification is actually sent. Defaults to false so pipelines can gate this behind
                         their own condition.
  --payload=<value>      (required) The JSON payload to send to Teams, as a serialized string.
  --webhook-url=<value>  (required) The Teams webhook URL to send the payload to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Send a serialized JSON payload to a Microsoft Teams webhook.

  Posts a payload as-is to one or more Microsoft Teams incoming webhook URLs. Use this for custom notifications that
  don't fit the built-in `notify project` or `notify happy-soup` card templates.

EXAMPLES
  $ sf simply cicd notify teams --payload '{"text":"Deployment complete"}' --webhook-url https://outlook.office.com/webhook/... --enabled
```

_See code: [lib/commands/simply/cicd/notify/teams.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/notify/teams.js)_

## `sf simply cicd sfdx-dependabot`

Automatically update downstream projects with a newly released Salesforce 2GP package version.

```
USAGE
  $ sf simply cicd sfdx-dependabot [--json] [--flags-dir <value>] [--gitlab-api-url <value>] [--gitlab-token <value>]
    [--root-group-id <value>] [--subscriber-package-version-id <value>] [--devhub-username <value>] [--dry-run]
    [--project-allowlist <value>] [--project-denylist <value>] [--skip-archived] [--skip-forks] [--branch-prefix
    <value>] [--mr-labels <value>] [--fail-on-error] [--max-projects <value>] [--vcs-provider gitlab]

FLAGS
  --branch-prefix=<value>                  Prefix used for generated branch names.
  --devhub-username=<value>                Salesforce DevHub username or alias used to resolve the package's name and
                                           version.
  --dry-run                                Run discovery and parsing, but perform zero write, commit, or merge request
                                           operations.
  --fail-on-error                          Return a non-zero exit code if one or more per-project operations fail.
  --gitlab-api-url=<value>                 GitLab API v4 base URL.
  --gitlab-token=<value>                   GitLab access token with file-writing and merge request privileges.
  --max-projects=<value>                   Optional safety limit restricting the maximum number of eligible projects to
                                           scan.
  --mr-labels=<value>                      Comma-separated labels to apply to created or updated merge requests.
  --project-allowlist=<value>              Comma-separated list of GitLab project paths to include in the scan. If
                                           specified, only matching projects are scanned.
  --project-denylist=<value>               Comma-separated list of GitLab project paths to exclude from scanning.
  --root-group-id=<value>                  GitLab group ID or URL-encoded path to scan for downstream projects.
  --[no-]skip-archived                     Skip archived GitLab repositories.
  --[no-]skip-forks                        Skip forked GitLab repositories.
  --subscriber-package-version-id=<value>  The newly released Salesforce subscriber package version ID (04t...).
  --vcs-provider=<option>                  [default: gitlab] The source-control-hosting platform to talk to.
                                           <options: gitlab>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Automatically update downstream projects with a newly released Salesforce 2GP package version.

  Discovers repositories under a GitLab group, reads each one's `sfdx-project.json`, and for any repository that both
  depends on the released package and has opted in via the `SFDX_DEPENDABOT_ENABLED=TRUE` project-level CI/CD variable,
  opens (or updates) a merge request bumping the dependency to the newly released version.

  Each eligible repository must explicitly opt in — this command never touches a downstream repository's dependencies
  without that variable set.

EXAMPLES
  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --dry-run

  $ sf simply cicd sfdx-dependabot --root-group-id 12345 --subscriber-package-version-id 04tXXXXXXXXXXXXXXX --devhub-username hub@example.com --branch-prefix devops/dependabot --mr-labels dependencies

FLAG DESCRIPTIONS
  --gitlab-api-url=<value>  GitLab API v4 base URL.

    Falls back to the SFDX_DEPENDABOT_GITLAB_API_URL or CI_API_V4_URL environment variables if not provided.
```

_See code: [lib/commands/simply/cicd/sfdx-dependabot.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-cicd@0.1.0/packages/simply-cicd/lib/commands/simply/cicd/sfdx-dependabot.js)_
<!-- commandsstop -->
