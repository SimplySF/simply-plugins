---
title: Wiring up a GitLab CI pipeline
description: An end-to-end walkthrough of both project (2GP Unlocked Package preferred) and happy-soup (unpackaged) build and deploy pipelines, generalized from real production pipelines.
---

This walks through both pipeline shapes, generalized and stripped of anything org-specific: a **project** (2GP Unlocked Package preferred) pipeline, and a **happy-soup** (unpackaged org metadata) pipeline. Read [Project vs. Happy Soup](/cicd/concepts/happy-soup-vs-project/) first if you haven't — this guide assumes you already know which one applies to your repo.

## Project pipeline

This section walks through the preferred shape: a project packaged as a 2GP Unlocked Package. (A project doesn't have to be packaged — see [Project vs. Happy Soup](/cicd/concepts/happy-soup-vs-project/#project-one-repo-one-app-sandbox-promotion) — in which case skip the build pipeline below entirely and promote your source through the deploy pipeline's `deploy-unpackaged` stage alone.)

A full packaged project pipeline is really **two pipelines**: a **build** pipeline that runs on every push and, on release branches, produces a package version; and a **deploy** pipeline that promotes that package version through environment tiers. They're connected by a child-pipeline trigger, not by manually copying values between unrelated jobs.

### Build stage

```yaml
stages:
  - prepare
  - build
  - test
  - package
  - deploy

determine-changes:
  stage: prepare
  script:
    - sf plugins install @simplysf/simply-cicd
    - sf simply cicd build determine-package-changes --out changes.env
  artifacts:
    reports:
      dotenv: changes.env

.authenticate-devhub:
  before_script:
    - sf org login jwt --alias main --username $DEVHUB_USERNAME
      --jwt-key-file $DEVHUB_JWT_KEY_FILE --client-id $DEVHUB_CLIENT_ID
      --instance-url $DEVHUB_INSTANCE_URL
    - sf org login jwt --alias secondary --username $DEVHUB_SECONDARY_USERNAME
      --jwt-key-file $DEVHUB_JWT_KEY_FILE --client-id $DEVHUB_SECONDARY_CLIENT_ID
      --instance-url $DEVHUB_SECONDARY_INSTANCE_URL

cleanup-scratch-orgs:
  extends: .authenticate-devhub
  stage: prepare
  script:
    - sf simply cicd build cleanup-scratch-orgs --dev-hub main --dev-hub secondary

create-scratch:
  extends: .authenticate-devhub
  stage: build
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  script:
    - sf simply cicd build create-scratch --dev-hub main --jwt-key-file $DEVHUB_JWT_KEY_FILE
  artifacts:
    paths: [SCRATCH_ORG_INFO.json]

build-and-test:
  stage: test
  needs: [create-scratch]
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  script:
    - sf simply cicd build install-dependencies --jwt-key-file $DEVHUB_JWT_KEY_FILE
    - sf simply cicd build push-scratch --jwt-key-file $DEVHUB_JWT_KEY_FILE
    - sf simply cicd build test-scratch --jwt-key-file $DEVHUB_JWT_KEY_FILE
  artifacts:
    paths: [SCRATCH_ORG_INFO.json]

delete-scratch:
  extends: .authenticate-devhub
  stage: test
  needs: [build-and-test]
  when: always
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  script:
    - sf simply cicd build delete-scratch --dev-hub main --jwt-key-file $DEVHUB_JWT_KEY_FILE

create-package-version:
  stage: package
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  before_script:
    - sf org login jwt --alias packaging-devhub --username $PACKAGING_DEVHUB_USERNAME
      --jwt-key-file $PACKAGING_DEVHUB_JWT_KEY_FILE --client-id $PACKAGING_DEVHUB_CLIENT_ID
      --instance-url $PACKAGING_DEVHUB_INSTANCE_URL
  script:
    - sf simply cicd build create-package-version
      --ci-commit-ref-name $CI_COMMIT_REF_NAME --ci-commit-sha $CI_COMMIT_SHA
      --ci-pipeline-id $CI_PIPELINE_ID --ci-pipeline-url $CI_PIPELINE_URL
      --ci-project-path $CI_PROJECT_PATH --ci-pipeline-source $CI_PIPELINE_SOURCE
      --project-access-token $PROJECT_ACCESS_TOKEN
      --packaging-devhub packaging-devhub
      --package-release-branch-prefix release/
    - sf simply cicd build create-fallback-tag
      --ci-commit-ref-name $CI_COMMIT_REF_NAME --ci-pipeline-id $CI_PIPELINE_ID
      --ci-project-path $CI_PROJECT_PATH --project-access-token $PROJECT_ACCESS_TOKEN

start-deployment:
  stage: deploy
  rules:
    - if: '$CI_COMMIT_REF_NAME =~ /^release\//'
  trigger:
    include: .gitlab-ci.yml
    strategy: depend
  variables:
    SUBSCRIBER_PACKAGE_VERSION_ID: $SUBSCRIBER_PACKAGE_VERSION_ID
```

`create-package-version` skips itself (without failing) on non-release branches and on merge-request pipelines; `create-fallback-tag` is a no-op unless a build actually needed a fallback (see [`build create-fallback-tag`](/cicd/reference/build/) — it does nothing when a real package version was just created). `start-deployment` re-triggers this same repo's pipeline as a **child pipeline**, forwarding the `04t...` ID that either command produced — that's the entire build → deploy handoff; nothing is copied by hand.

### Deploy stage

Environment tiers are just repeated blocks of the same five jobs, each gated to only accept merge requests from a release branch into that tier's target branch, and each requiring manual approval per stage (`when: manual`) except the unpackaged-deploy stage itself:

```yaml
sandbox-pre-destructive:
  extends: .deploy-pre-destructive
  environment:
    name: sandbox
    url: $SANDBOX_INSTANCE_URL
  rules:
    - if: '$DEPLOY_RELEASE_BRANCH_PREFIX =~ $CI_MERGE_REQUEST_SOURCE_BRANCH_NAME && $DEPLOY_BRANCH_SANDBOX =~ $CI_MERGE_REQUEST_TARGET_BRANCH_NAME'
      when: manual
    - when: never
  variables:
    ALIAS: sandbox
    AUTH_URL: $SANDBOX_AUTH_URL

sandbox-install-packaged:
  extends: .deploy-install-packaged
  environment:
    name: sandbox
    url: $SANDBOX_INSTANCE_URL
  needs: [sandbox-pre-destructive]
  rules:
    - if: '$DEPLOY_RELEASE_BRANCH_PREFIX =~ $CI_MERGE_REQUEST_SOURCE_BRANCH_NAME && $DEPLOY_BRANCH_SANDBOX =~ $CI_MERGE_REQUEST_TARGET_BRANCH_NAME'
      when: manual
    - when: never
  variables:
    ALIAS: sandbox
    AUTH_URL: $SANDBOX_AUTH_URL

# ...deploy-unpackaged, run-apex-tests, post-deploy, post-destructive follow the same pattern,
# each `needs:` the previous stage, each gated by the same rules block...

production-post-destructive:
  extends: .deploy-post-destructive
  environment:
    name: production
  needs: [production-post-deploy]
  rules:
    - if: '$DEPLOY_RELEASE_BRANCH_PREFIX =~ $CI_MERGE_REQUEST_SOURCE_BRANCH_NAME && $DEPLOY_BRANCH_PRODUCTION =~ $CI_MERGE_REQUEST_TARGET_BRANCH_NAME'
      when: manual
    - when: never
```

Stage order (`pre-destructive → install-packaged → deploy-unpackaged → run-apex-tests → post-deploy → post-destructive` above) is a pipeline convention, not something `simply-cicd` enforces — there's no command chaining (see [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/)), so pick whatever order makes sense for your app.

The shared `.deploy-*` job templates (defined once, extended per environment) authenticate `${ALIAS}` from that tier's `${AUTH_URL}` in a `before_script`, then carry the actual `sf simply cicd deploy project *` calls — `simply-cicd` itself never sees `${AUTH_URL}`, only the alias the login step just created:

```yaml
.deploy-authenticate:
  before_script:
    - echo "${AUTH_URL}" > /tmp/auth_url.txt
    - sf org login sfdx-url --sfdx-url-file /tmp/auth_url.txt --alias "${ALIAS}"

.deploy-pre-destructive:
  extends: .deploy-authenticate
  stage: pre-destructive
  timeout: 6h
  artifacts:
    expire_in: 2 weeks
    paths: [DEPLOY_PROGRESS.json]
  variables:
    START_FROM: ''
  script:
    - sf simply cicd deploy project pre-destructive
      --alias "${ALIAS}" --ci-job-token "${CI_JOB_TOKEN}"
      --start-from "${START_FROM}" --test-level "${TEST_LEVEL}"

.deploy-install-packaged:
  extends: .deploy-authenticate
  stage: install-packaged
  timeout: 2h
  script:
    - sf simply cicd deploy project install-packaged
      --alias "${ALIAS}" --ci-job-token "${CI_JOB_TOKEN}"
      --subscriber-package-version-id "${SUBSCRIBER_PACKAGE_VERSION_ID}"

# ...deploy-unpackaged, run-apex-tests, post-deploy, and post-destructive templates
# follow the same shape (extending .deploy-authenticate too), each calling its matching
# `sf simply cicd deploy project <stage>`.
```

Wrap every stage's `before_script`/`after_script` with [`notify project --before-script`/`--after-script`](/cicd/guides/teams-notifications/) — once at the pipeline's first job and once at its last, not on every stage.

:::note[Your org's variables]
`$DEVHUB_*`, `$PROJECT_ACCESS_TOKEN`, `$SANDBOX_*`, `$DEPLOY_BRANCH_*` — every `$VAR` above is a GitLab CI/CD variable you define under Settings → CI/CD → Variables (masked and protected on release branches). The `$CI_*` variables are GitLab's own [predefined variables](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html) — pass them straight through, don't hardcode them.
:::

## Happy-soup pipeline

There's no build phase — nothing gets compiled or packaged, so a happy-soup pipeline is just the deploy stages, triggered when a merge request targets an environment branch. The key structural difference from a project pipeline: every stage command takes `--source-branch-name` instead of a fixed config path, so the CLI can derive that MR's `deployment-configs/*.json` on its own (see [Project vs. Happy Soup](/cicd/concepts/happy-soup-vs-project/#branches-pick-the-config-file-deployments-close-out-archives-it)):

```yaml
stages:
  - validate
  - pre-destructive
  - install-packaged
  - deploy-unpackaged
  - post-deploy
  - post-destructive
  - close-out

validate:
  stage: validate
  rules:
    - if: '$CI_MERGE_REQUEST_TARGET_BRANCH_NAME =~ $DEPLOY_ENVIRONMENT_BRANCHES'
  script:
    - sf plugins install @simplysf/simply-cicd
    - sf simply cicd deploy happy-soup validate --source-branch-name "${CI_COMMIT_REF_NAME}"

uat-pre-destructive:
  extends: .happy-soup-pre-destructive
  environment:
    name: uat
    url: $UAT_INSTANCE_URL
  rules:
    - if: '$CI_MERGE_REQUEST_TARGET_BRANCH_NAME == $DEPLOY_BRANCH_UAT'
      when: manual
    - when: never
  variables:
    ALIAS: uat
    AUTH_URL: $UAT_AUTH_URL

# ...install-packaged, deploy-unpackaged, post-deploy, post-destructive follow the same
# pattern for each environment tier — same shape as the project deploy stage above, just
# gated on target branch alone rather than a source/target branch pair, since a happy-soup
# deployment isn't tied to a single release branch.
```

The shared `.happy-soup-*` templates authenticate `${ALIAS}` the same way as the project pipeline's `.deploy-authenticate` job above, composed in via GitLab's `!reference` tag since each job also needs its own `notify happy-soup` call in `before_script` (a job's `before_script` is a plain list, so `extends:` alone would silently overwrite one or the other rather than combining them). They carry the actual `sf simply cicd deploy happy-soup *` calls, and — unlike project's single before/after pair — wrap **every** stage with [`notify happy-soup`](/cicd/guides/teams-notifications/):

```yaml
.deploy-authenticate:
  before_script:
    - echo "${AUTH_URL}" > /tmp/auth_url.txt
    - sf org login sfdx-url --sfdx-url-file /tmp/auth_url.txt --alias "${ALIAS}"

.happy-soup-pre-destructive:
  stage: pre-destructive
  timeout: 6h
  artifacts:
    expire_in: 2 weeks
    paths: [DEPLOY_PROGRESS.json]
  variables:
    START_FROM: ''
  before_script:
    - !reference [.deploy-authenticate, before_script]
    - sf simply cicd notify happy-soup --before-script --ci-job-stage pre-destructive
      --teams-webhook-url $TEAMS_WEBHOOK_URL --enabled
  script:
    - sf simply cicd deploy happy-soup pre-destructive
      --alias "${ALIAS}" --ci-job-token "${CI_JOB_TOKEN}"
      --source-branch-name "${CI_COMMIT_REF_NAME}" --start-from "${START_FROM}"
  after_script:
    - sf simply cicd notify happy-soup --after-script --ci-job-stage pre-destructive
      --ci-job-status $CI_JOB_STATUS --teams-webhook-url $TEAMS_WEBHOOK_URL --enabled

.happy-soup-install-packaged:
  stage: install-packaged
  timeout: 2h
  before_script:
    - !reference [.deploy-authenticate, before_script]
    - sf simply cicd notify happy-soup --before-script --ci-job-stage install-packaged
      --teams-webhook-url $TEAMS_WEBHOOK_URL --enabled
  script:
    - sf simply cicd deploy happy-soup install-packaged --alias "${ALIAS}"
  after_script:
    - sf simply cicd notify happy-soup --after-script --ci-job-stage install-packaged
      --ci-job-status $CI_JOB_STATUS --teams-webhook-url $TEAMS_WEBHOOK_URL --enabled

# ...deploy-unpackaged, post-deploy, and post-destructive templates follow the same shape,
# each calling its matching `sf simply cicd deploy happy-soup <stage>`. install-packaged
# takes no --source-branch-name/--deploy-config-file — its dependency install always runs,
# unconditionally, regardless of the deployment config's `deployments[]` array.
```

`install-packaged` has no environment-tier gating of its own beyond the `needs:`/`rules:` on its job — the command itself doesn't read the deploy config, so there's nothing in `deployments[]` to skip.

Once the MR merges and the pipeline runs directly on the environment branch (a `push` pipeline, not an MR pipeline), close out the config that was actually used and tag the deployment:

```yaml
deployment-close-out:
  stage: close-out
  needs: [uat-post-destructive]
  rules:
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == $DEPLOY_BRANCH_UAT'
  script:
    - sf simply cicd deploy happy-soup deployment-close-out
      --ci-commit-ref-name "${CI_COMMIT_REF_NAME}" --ci-pipeline-id "${CI_PIPELINE_ID}"
      --ci-project-path "${CI_PROJECT_PATH}" --project-access-token "${PROJECT_ACCESS_TOKEN}"

tag-deployment:
  stage: close-out
  needs: [deployment-close-out]
  rules:
    - if: '$CI_PIPELINE_SOURCE == "push" && $CI_COMMIT_BRANCH == $DEPLOY_BRANCH_UAT'
  before_script:
    - echo "${UAT_AUTH_URL}" > /tmp/auth_url.txt
    - sf org login sfdx-url --sfdx-url-file /tmp/auth_url.txt --alias uat
  script:
    - sf simply cicd deploy happy-soup tag-deployment
      --alias uat --ci-pipeline-id "${CI_PIPELINE_ID}" --ci-pipeline-url "${CI_PIPELINE_URL}"
      --ci-project-path "${CI_PROJECT_PATH}" --ci-merge-request-iid "${CI_MERGE_REQUEST_IID}"
      --ci-merge-request-project-url "${CI_MERGE_REQUEST_PROJECT_URL}"
      --project-access-token "${PROJECT_ACCESS_TOKEN}"
```

`tag-deployment` runs in a fresh container of its own (`needs: [deployment-close-out]`, not the earlier `uat-post-destructive` job that last authenticated `uat`), so it re-authenticates the alias itself before reading the org's instance URL for the tag message — same reasoning as every other job above.

`deployment-close-out` copies whichever config file this MR's stages actually used onto `config/deploy.json` and commits it (`[skip ci]`), so a later pipeline running on this same branch has a fixed config with no `--source-branch-name` needed. `tag-deployment` records an annotated git tag on that commit — repeat both jobs per environment tier, same as the deploy stage jobs above.

## Retrying and resuming

Each `.deploy-*`/`.happy-soup-*` template's `START_FROM` variable maps to `--start-from`, letting you manually restart a specific stage from a specific point without editing the pipeline — see [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) for exactly how `DEPLOY_PROGRESS.json` resume semantics work. `DEPLOY_PROGRESS.json` itself needs to be a CI artifact passed between stage jobs (as shown above) since each job runs in a fresh checkout.

## Simplifying with environment variables

Most flags above that repeat across jobs — `--ci-job-token`, `--ci-commit-ref-name`, `--jwt-key-file`, `--project-access-token`, and the rest — can be set **once** as a `SIMPLY_CICD_*` CI/CD variable instead of being passed on every command. See [Environment variables](/cicd/concepts/environment-variables/) for the full flag-to-variable mapping. The one exception in this pipeline is `--dev-hub` — since it accepts multiple values (one Dev Hub alias per repeated flag), it isn't backed by an environment variable and must still be passed explicitly on every `build *` command that takes it.

For example, GitLab already exposes `CI_JOB_TOKEN` and `CI_COMMIT_REF_NAME` automatically — mapping them once at the pipeline level:

```yaml
variables:
  SIMPLY_CICD_CI_JOB_TOKEN: $CI_JOB_TOKEN
  SIMPLY_CICD_CI_COMMIT_REF_NAME: $CI_COMMIT_REF_NAME
  SIMPLY_CICD_JWT_KEY_FILE: $DEVHUB_JWT_KEY_FILE
```

lets every `.deploy-*`/`.happy-soup-*` template above drop `--ci-job-token "${CI_JOB_TOKEN}"` and every `build *` job drop `--jwt-key-file $DEVHUB_JWT_KEY_FILE`, since the commands pick the variable up automatically when the flag isn't passed. Per-stage values that genuinely change between jobs — `--alias`, `--start-from` — are still set per-job via `variables:` overrides the same way they are today; only the flags that are truly constant across the whole pipeline are worth hoisting to a `SIMPLY_CICD_*` variable. `${AUTH_URL}` isn't a `simply-cicd` flag at all in this pipeline — it's a plain CI/CD variable consumed by the `.deploy-authenticate` login step itself, so it isn't part of this mapping. `--source-branch-name` is one worth hoisting the same way in a happy-soup pipeline — it's `$CI_COMMIT_REF_NAME` on every stage job, so `SIMPLY_CICD_SOURCE_BRANCH_NAME: $CI_COMMIT_REF_NAME` in the block above drops it from every `deploy happy-soup *` call too.
