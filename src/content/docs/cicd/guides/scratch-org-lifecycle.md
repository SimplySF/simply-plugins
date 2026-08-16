---
title: Scratch org build lifecycle
description: create-scratch through cleanup-scratch-orgs — the commands behind a CI-driven scratch org build/test cycle.
---

The `build` topic's scratch-org commands form a linear lifecycle, each reading state the previous one wrote to a JSON file in the job's working directory — so they need to run as ordered stages sharing a workspace (or artifacts) within one CI pipeline, not independently.

## The lifecycle

1. **`build create-scratch`** — tries each `--dev-hub-*` in order (repeat the four `--dev-hub-name`/`--dev-hub-username`/`--dev-hub-client-id`/`--dev-hub-instance-url` flags once per Dev Hub, in matching order) until one succeeds, skipping any Dev Hub that's hit its daily scratch-org limit. Writes the new org's auth details to **`SCRATCH_ORG_INFO.json`** — every later command in this list reads that file to know which org and which Dev Hub to act against.
2. **`build install-dependencies`** — installs the packaged dependencies declared in `sfdx-project.json` into the scratch org.
3. **`build push-scratch`** — pushes source. Automatically strips metadata types the scratch org push doesn't support (Einstein Conversation Agent files), and can additionally push a `seedMetadata.path` directory via `--scratch-org-source-dir`.
4. **`build test-scratch`** — runs Apex tests (`RunLocalTests`) against the scratch org. Use `--disable-apex-tests` to skip just the test run without skipping the rest of the job.
5. **`build lwc-jest`** — independent of the scratch org (installs `@salesforce/sfdx-lwc-jest` + `@sa11y/jest` and runs Jest with coverage) — run it in parallel with the scratch-org steps rather than in sequence, since it doesn't touch `SCRATCH_ORG_INFO.json` at all.
6. **`build delete-scratch`** — reads `SCRATCH_ORG_INFO.json` to find which Dev Hub owns the org, and deletes it. Deletion failures are logged, not thrown, so a stuck org doesn't fail an otherwise-green pipeline — put this in a job that always runs (GitLab's `when: always`) so orgs get cleaned up even after an earlier stage fails.

```yaml
create-scratch:
  stage: scratch-org
  script:
    - sf simply cicd build create-scratch
      --dev-hub-name main --dev-hub-username $DEVHUB_USERNAME
      --dev-hub-client-id $DEVHUB_CLIENT_ID --dev-hub-instance-url $DEVHUB_INSTANCE_URL
      --jwt-key-file $DEVHUB_JWT_KEY_FILE
  artifacts:
    paths: [SCRATCH_ORG_INFO.json]

push-and-test:
  stage: scratch-org
  needs: [create-scratch]
  script:
    - sf simply cicd build install-dependencies --jwt-key-file $DEVHUB_JWT_KEY_FILE
    - sf simply cicd build push-scratch --jwt-key-file $DEVHUB_JWT_KEY_FILE
    - sf simply cicd build test-scratch --jwt-key-file $DEVHUB_JWT_KEY_FILE
  artifacts:
    paths: [SCRATCH_ORG_INFO.json]

cleanup-scratch:
  stage: scratch-org
  needs: [push-and-test]
  when: always
  script:
    - sf simply cicd build delete-scratch
      --dev-hub-name main --dev-hub-username $DEVHUB_USERNAME
      --dev-hub-client-id $DEVHUB_CLIENT_ID --dev-hub-instance-url $DEVHUB_INSTANCE_URL
      --jwt-key-file $DEVHUB_JWT_KEY_FILE
```

`SCRATCH_ORG_INFO.json` has to survive between jobs as a GitLab artifact (or equivalent), since each job runs in a fresh checkout — that's what the `artifacts.paths` entries above are for.

## Skipping work when nothing changed

Every command in this lifecycle except `create-scratch` itself checks `PACKAGE_CHANGED` in the environment and no-ops when it's `FALSE` — see [`build determine-package-changes`](/cicd/reference/build/), which should run earlier in the pipeline and feed its `changes.env` output into every job below it via a `dotenv` artifact. This is what keeps a CI pipeline from spinning up a scratch org, pushing source, and running the full test suite on a commit that touched nothing package-relevant (e.g. only docs or CI config changes).

## Housekeeping: cleaning up abandoned orgs

**`build cleanup-scratch-orgs`** is unrelated to any single pipeline run — it's meant as its own scheduled job (e.g. GitLab's scheduled pipelines, nightly) that queries every configured Dev Hub for scratch orgs older than 3 hours and bulk-deletes them, as a backstop for orgs left behind by pipelines that failed before reaching their own `delete-scratch` step.
