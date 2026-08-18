---
title: Wiring up a GitLab CI pipeline
description: An end-to-end walkthrough of a project (2GP packaged) build and deploy pipeline, generalized from a real production pipeline.
---

This walks through a real **project** (2GP unlocked package) pipeline's shape, generalized and stripped of anything org-specific. If you're deploying unpackaged org metadata instead, read [Project vs. Happy Soup](/cicd/concepts/happy-soup-vs-project/) first — the stage commands are named differently (`deploy happy-soup *`), several flags (like `--source-branch-name`) don't apply here, and a happy-soup pipeline notifies per-stage rather than once for the whole run.

A full pipeline is really **two pipelines**: a **build** pipeline that runs on every push and, on release branches, produces a package version; and a **deploy** pipeline that promotes that package version through environment tiers. They're connected by a child-pipeline trigger, not by manually copying values between unrelated jobs.

## Build pipeline

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

cleanup-scratch-orgs:
  stage: prepare
  script:
    - sf simply cicd build cleanup-scratch-orgs
      --dev-hub-name main --dev-hub-username $DEVHUB_USERNAME --dev-hub-client-id $DEVHUB_CLIENT_ID --dev-hub-instance-url $DEVHUB_INSTANCE_URL
      --dev-hub-name secondary --dev-hub-username $DEVHUB_SECONDARY_USERNAME --dev-hub-client-id $DEVHUB_SECONDARY_CLIENT_ID --dev-hub-instance-url $DEVHUB_SECONDARY_INSTANCE_URL
      --jwt-key-file $DEVHUB_JWT_KEY_FILE

create-scratch:
  stage: build
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  script:
    - sf simply cicd build create-scratch
      --dev-hub-name main --dev-hub-username $DEVHUB_USERNAME --dev-hub-client-id $DEVHUB_CLIENT_ID --dev-hub-instance-url $DEVHUB_INSTANCE_URL
      --jwt-key-file $DEVHUB_JWT_KEY_FILE
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
  stage: test
  needs: [build-and-test]
  when: always
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  script:
    - sf simply cicd build delete-scratch
      --dev-hub-name main --dev-hub-username $DEVHUB_USERNAME --dev-hub-client-id $DEVHUB_CLIENT_ID --dev-hub-instance-url $DEVHUB_INSTANCE_URL
      --jwt-key-file $DEVHUB_JWT_KEY_FILE

create-package-version:
  stage: package
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  script:
    - sf simply cicd build create-package-version
      --ci-commit-ref-name $CI_COMMIT_REF_NAME --ci-commit-sha $CI_COMMIT_SHA
      --ci-pipeline-id $CI_PIPELINE_ID --ci-pipeline-url $CI_PIPELINE_URL
      --ci-project-path $CI_PROJECT_PATH --ci-pipeline-source $CI_PIPELINE_SOURCE
      --project-access-token $PROJECT_ACCESS_TOKEN
      --jwt-key-file $DEVHUB_TOOLING_JWT_KEY_FILE --devhub-tooling-username $DEVHUB_TOOLING_USERNAME
      --devhub-tooling-client-id $DEVHUB_TOOLING_CLIENT_ID --devhub-tooling-instance-url $DEVHUB_TOOLING_INSTANCE_URL
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

## Deploy pipeline

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

The shared `.deploy-*` job templates (defined once, extended per environment) carry the actual `sf simply cicd deploy project *` calls:

```yaml
.deploy-pre-destructive:
  stage: pre-destructive
  timeout: 6h
  artifacts:
    expire_in: 2 weeks
    paths: [DEPLOY_PROGRESS.json]
  variables:
    START_FROM: ''
  script:
    - sf simply cicd deploy project pre-destructive
      --alias "${ALIAS}" --auth-url "${AUTH_URL}" --ci-job-token "${CI_JOB_TOKEN}"
      --start-from "${START_FROM}" --test-level "${TEST_LEVEL}"

.deploy-install-packaged:
  stage: install-packaged
  timeout: 2h
  script:
    - sf simply cicd deploy project install-packaged
      --alias "${ALIAS}" --auth-url "${AUTH_URL}" --ci-job-token "${CI_JOB_TOKEN}"
      --subscriber-package-version-id "${SUBSCRIBER_PACKAGE_VERSION_ID}"

# ...deploy-unpackaged, run-apex-tests, post-deploy, and post-destructive templates
# follow the same shape, each calling its matching `sf simply cicd deploy project <stage>`.
```

Wrap every stage's `before_script`/`after_script` with [`notify project --before-script`/`--after-script`](/cicd/guides/teams-notifications/) — once at the pipeline's first job and once at its last, not on every stage.

:::note[Your org's variables]
`$DEVHUB_*`, `$PROJECT_ACCESS_TOKEN`, `$SANDBOX_*`, `$DEPLOY_BRANCH_*` — every `$VAR` above is a GitLab CI/CD variable you define under Settings → CI/CD → Variables (masked and protected on release branches). The `$CI_*` variables are GitLab's own [predefined variables](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html) — pass them straight through, don't hardcode them.
:::

## Retrying and resuming

Each `.deploy-*` template's `START_FROM` variable maps to `--start-from`, letting you manually restart a specific stage from a specific point without editing the pipeline — see [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) for exactly how `DEPLOY_PROGRESS.json` resume semantics work. `DEPLOY_PROGRESS.json` itself needs to be a CI artifact passed between stage jobs (as shown above) since each job runs in a fresh checkout.

## Happy-soup differences

A happy-soup pipeline follows the same environment-tier/branch-gating shape, but: `deploy happy-soup *` instead of `deploy project *`; drop everything Dev Hub/package-related (there's no `create-package-version`/`install-packaged` step tied to a single package — dependency installation still happens, but via `deploy happy-soup install-packaged`, unconditionally, not gated by branch/environment rules); add `--source-branch-name $CI_COMMIT_REF_NAME` so each stage derives the right `deployment-configs/*.json`; wrap **every** stage with `notify happy-soup --before-script`/`--after-script` rather than just the first/last job; and add a `deployment-close-out` job after `post-deploy` to archive the config that was actually used onto `config/deploy.json`, plus a `tag-deployment` job to record the deployment on the merged commit.

## Simplifying with environment variables

Most flags above that repeat across jobs — `--ci-job-token`, `--ci-commit-ref-name`, `--jwt-key-file`, `--project-access-token`, and the rest — can be set **once** as a `SIMPLY_CICD_*` CI/CD variable instead of being passed on every command. See [Environment variables](/cicd/concepts/environment-variables/) for the full flag-to-variable mapping. The one exception in this pipeline is `--dev-hub-name`/`--dev-hub-username`/`--dev-hub-client-id`/`--dev-hub-instance-url` — since these accept multiple values (one Dev Hub per repeated flag), they aren't backed by an environment variable and must still be passed explicitly on every `build *` command.

For example, GitLab already exposes `CI_JOB_TOKEN` and `CI_COMMIT_REF_NAME` automatically — mapping them once at the pipeline level:

```yaml
variables:
  SIMPLY_CICD_CI_JOB_TOKEN: $CI_JOB_TOKEN
  SIMPLY_CICD_CI_COMMIT_REF_NAME: $CI_COMMIT_REF_NAME
  SIMPLY_CICD_JWT_KEY_FILE: $DEVHUB_JWT_KEY_FILE
```

lets every `.deploy-*` template above drop `--ci-job-token "${CI_JOB_TOKEN}"` and every `build *` job drop `--jwt-key-file $DEVHUB_JWT_KEY_FILE`, since the commands pick the variable up automatically when the flag isn't passed. Per-stage values that genuinely change between jobs — `--alias`, `--auth-url`, `--start-from` — are still set per-job via `variables:` overrides the same way they are today; only the flags that are truly constant across the whole pipeline are worth hoisting to a `SIMPLY_CICD_*` variable.
