---
title: Wiring up a GitLab CI pipeline
description: An end-to-end walkthrough of a project (2GP packaged) deploy pipeline, from build through post-deploy.
---

This walks through wiring `simply-cicd` commands into a `.gitlab-ci.yml` for a **project** (2GP packaged) deployment. If you're deploying unpackaged org metadata instead, read [Happy Soup vs. Project deploys](/cicd/concepts/happy-soup-vs-project/) first — the stage commands are named differently (`deploy happy-soup *`) and several flags (like `--source-branch-name`) don't apply here.

Every stage below is a **separate CI job** — `simply-cicd` doesn't run them for you in sequence. Ordering and dependencies are your `.gitlab-ci.yml`'s job, using [`DEPLOY_PROGRESS.json`](/cicd/concepts/deploy-pipeline-stages/) to track what's already run.

## 1. Detect whether the package actually changed

```yaml
determine-changes:
  stage: prepare
  script:
    - sf plugins install @simplysf/simply-cicd
    - sf simply cicd build determine-package-changes --out changes.env
  artifacts:
    reports:
      dotenv: changes.env
```

This writes `PACKAGE_CHANGED=TRUE|FALSE`. Every build/scratch-org command downstream reads that variable and no-ops when it's `FALSE` — pass it through as a `dotenv` artifact so later jobs pick it up automatically.

## 2. Validate config before doing anything expensive

```yaml
validate:
  stage: prepare
  script:
    - sf simply cicd deploy validate --deploy-config-file config/deploy.json --deploy-rules-file config/deploy-rules.json
```

Run this on every merge request, not just release branches — it's cheap and catches a malformed `deploy.json` before a scratch org or package version gets built for nothing.

## 3. Build the package version (release branches only)

```yaml
build-package:
  stage: build
  rules:
    - if: '$PACKAGE_CHANGED == "TRUE"'
  script:
    - sf simply cicd build create-package-version
      --ci-commit-ref-name $CI_COMMIT_REF_NAME
      --ci-commit-sha $CI_COMMIT_SHA
      --ci-pipeline-id $CI_PIPELINE_ID
      --ci-pipeline-url $CI_PIPELINE_URL
      --ci-project-path $CI_PROJECT_PATH
      --ci-pipeline-source $CI_PIPELINE_SOURCE
      --project-access-token $PROJECT_ACCESS_TOKEN
      --jwt-key-file $DEVHUB_TOOLING_JWT_KEY_FILE
      --devhub-tooling-username $DEVHUB_TOOLING_USERNAME
      --devhub-tooling-client-id $DEVHUB_TOOLING_CLIENT_ID
      --devhub-tooling-instance-url $DEVHUB_TOOLING_INSTANCE_URL
      --package-release-branch-prefix release/
```

`--ci-*` variables are GitLab's own [predefined CI/CD variables](https://docs.gitlab.com/ee/ci/variables/predefined_variables.html) — pass them straight through, don't hardcode them. When the branch doesn't match `--package-release-branch-prefix` and the pipeline wasn't triggered by a merge request, this command skips (without failing) and `build create-fallback-tag` should run instead to carry the previous version forward.

:::note[Your org's secrets]
`$PROJECT_ACCESS_TOKEN`, `$DEVHUB_TOOLING_*`, and every other `$VAR` in these examples are **your** GitLab CI/CD variables — set them under your project's Settings → CI/CD → Variables (masked and protected on release branches). This guide can't tell you what your Dev Hub connected app or access token values are.
:::

## 4. Deploy stages

```yaml
.deploy-auth: &deploy-auth --alias target-org
  --jwt-key-file $TARGET_ORG_JWT_KEY_FILE
  --client-id $TARGET_ORG_CLIENT_ID
  --instance-url $TARGET_ORG_INSTANCE_URL
  --username $TARGET_ORG_USERNAME

pre-destructive:
  stage: deploy
  script:
    - sf simply cicd deploy project pre-destructive --ci-job-token $CI_JOB_TOKEN *deploy-auth

install-packaged:
  stage: deploy
  needs: [pre-destructive]
  script:
    - sf simply cicd deploy project install-packaged --ci-job-token $CI_JOB_TOKEN *deploy-auth

run-apex-tests:
  stage: deploy
  needs: [install-packaged]
  script:
    - sf simply cicd deploy project run-apex-tests --ci-job-token $CI_JOB_TOKEN *deploy-auth

post-destructive:
  stage: deploy
  needs: [run-apex-tests]
  script:
    - sf simply cicd deploy project post-destructive --ci-job-token $CI_JOB_TOKEN *deploy-auth

post-deploy:
  stage: deploy
  needs: [post-destructive]
  script:
    - sf simply cicd deploy project post-deploy --ci-job-token $CI_JOB_TOKEN *deploy-auth
```

(YAML anchors like `&deploy-auth` don't actually merge into a script line array this way — treat the snippet above as illustrating which flags each job needs, not copy-paste-ready YAML. Use `.gitlab-ci.yml`'s `extends:`/`!reference` instead if you want to share the auth flags across jobs for real.)

Each of these stage commands runs `bin/preDestructive.sh`, `bin/postDestructive.sh`, `bin/postDeploy.sh`, etc. from your repo if present — see [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/) for what each one is expected to do. If a job fails partway through, re-running the pipeline resumes from `DEPLOY_PROGRESS.json` rather than repeating completed stages, unless you pass `--start-from`.

## 5. Notify

Wrap the deploy stage with `notify project --before-script`/`--after-script` — see the [Teams notifications guide](/cicd/guides/teams-notifications/) for the full pattern, including Jira story linking.

## Happy-soup differences

If you're doing a happy-soup deployment instead, replace `deploy project *` with `deploy happy-soup *`, drop everything Dev Hub/package-related (steps 3 and the `run-apex-tests` job — happy-soup tests run inline via `--test-level`/`--test-suite`/`--tests` on the deploy-unpackaged stage itself), and add `--source-branch-name $CI_COMMIT_REF_NAME` to derive the right environment's config file. Add a `deployment-close-out` job after `post-deploy` to archive the config that was actually used, and a `tag-deployment` job to record the deployment on the commit.
