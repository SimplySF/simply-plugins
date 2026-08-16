---
title: 'Deploy — Happy Soup'
description: 'Command reference for the unpackaged (happy-soup) deploy pipeline stages.'
---

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
