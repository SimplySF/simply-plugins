---
title: Scratch org build lifecycle
description: create-scratch through cleanup-scratch-orgs — the commands behind a CI-driven scratch org build/test cycle.
---

The `build` topic's scratch-org commands form a linear lifecycle, each reading state the previous one wrote to a JSON file in the job's working directory — so they need to run as ordered stages sharing a workspace (or artifacts) within one CI pipeline, not independently. Several steps below also read `sfdx-project.json` fields specific to `simply-cicd` — see [sfdx-project.json fields simply-cicd reads](/cicd/concepts/sfdx-project-fields/) for the full set and their exact shape.

`simply-cicd` doesn't authenticate the Dev Hub itself — `--dev-hub` takes one or more **already-authenticated** aliases (`sf org login jwt --alias main`, or any other login method, run as its own step before these jobs). It's the one exception to "`simply-cicd` never authenticates orgs itself" (see [Environment variables](/cicd/concepts/environment-variables/)): a scratch org's own username isn't known until `create-scratch` creates it, so later stages — potentially in a fresh CI container with no memory of the Dev Hub login above — need to be able to mint a session for the scratch org **itself** on demand. How that happens depends on how the Dev Hub was authenticated:

- **JWT-authenticated Dev Hub** — pass `--jwt-key-file` to every scratch-org command below. A scratch org under a JWT Dev Hub never gets a refresh token of its own (JWT bearer grants don't produce one), so each later stage re-mints a session using the Dev Hub's key file, exactly like `create-scratch` did.
- **Web login or SFDX auth URL** — omit `--jwt-key-file` entirely. The scratch org gets its own refresh token at creation time, which `simply-cicd` uses directly to keep the session alive in later stages — no key file needed anywhere past `create-scratch`.

## The lifecycle

1. **`build create-scratch`** — tries each `--dev-hub` alias in order until one succeeds, skipping any Dev Hub that's hit its daily scratch-org limit. Writes the new org's auth details to **`SCRATCH_ORG_INFO.json`** — every later command in this list reads that file to know which org (and, for `delete-scratch`, which Dev Hub) to act against.
2. **`build install-dependencies`** — installs the packaged dependencies declared in `sfdx-project.json` into the scratch org.
3. **`build push-scratch`** — pushes source. Automatically strips metadata types the scratch org push doesn't support (Einstein Conversation Agent files), and can additionally push a `seedMetadata.path` directory via `--scratch-org-source-dir`.
4. **`build test-scratch`** — runs Apex tests (`RunLocalTests`) against the scratch org. Use `--disable-apex-tests` to skip just the test run without skipping the rest of the job.
5. **`build lwc-jest`** — independent of the scratch org (installs `@salesforce/sfdx-lwc-jest` + `@sa11y/jest` and runs Jest with coverage) — run it in parallel with the scratch-org steps rather than in sequence, since it doesn't touch `SCRATCH_ORG_INFO.json` at all.
6. **`build delete-scratch`** — reads `SCRATCH_ORG_INFO.json` to find which Dev Hub owns the org, confirms `--dev-hub` matches it, and deletes it. Deletion failures are logged, not thrown, so a stuck org doesn't fail an otherwise-green pipeline — put this in a job that always runs (GitLab's `when: always`) so orgs get cleaned up even after an earlier stage fails.

```yaml
create-scratch:
  stage: scratch-org
  before_script:
    - sf org login jwt --alias main --username $DEVHUB_USERNAME
      --jwt-key-file $DEVHUB_JWT_KEY_FILE --client-id $DEVHUB_CLIENT_ID
      --instance-url $DEVHUB_INSTANCE_URL
  script:
    - sf simply cicd build create-scratch --dev-hub main --jwt-key-file $DEVHUB_JWT_KEY_FILE
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
  before_script:
    - sf org login jwt --alias main --username $DEVHUB_USERNAME
      --jwt-key-file $DEVHUB_JWT_KEY_FILE --client-id $DEVHUB_CLIENT_ID
      --instance-url $DEVHUB_INSTANCE_URL
  script:
    - sf simply cicd build delete-scratch --dev-hub main --jwt-key-file $DEVHUB_JWT_KEY_FILE
```

`--jwt-key-file` is shown throughout this example because it assumes a JWT-authenticated Dev Hub — the most common setup for unattended CI. Drop it everywhere above if your Dev Hub uses web login or an SFDX auth URL instead.

Every job that touches the scratch org's own identity (`install-dependencies`/`push-scratch`/`test-scratch`/`delete-scratch`'s second, scratch-org-facing step) runs in a **fresh container with no `sf org login` of its own** — that's fine, because it re-authenticates from what `SCRATCH_ORG_INFO.json` already recorded (plus `--jwt-key-file`, if the Dev Hub needs it). Only jobs that touch the **Dev Hub** directly (`create-scratch`'s capacity check and signup, `delete-scratch`'s Dev-Hub-side deletion call, `cleanup-scratch-orgs`) need their own `sf org login` step, because the Dev Hub alias itself doesn't persist across fresh CI containers any more than the scratch org's does.

`SCRATCH_ORG_INFO.json` has to survive between jobs as a GitLab artifact (or equivalent), since each job runs in a fresh checkout — that's what the `artifacts.paths` entries above are for.

## Skipping work when nothing changed

Every command in this lifecycle except `create-scratch` itself checks `PACKAGE_CHANGED` in the environment and no-ops when it's `FALSE` — see [`build determine-package-changes`](/cicd/reference/build/), which should run earlier in the pipeline and feed its `changes.env` output into every job below it via a `dotenv` artifact. This is what keeps a CI pipeline from spinning up a scratch org, pushing source, and running the full test suite on a commit that touched nothing package-relevant (e.g. only docs or CI config changes).

## Housekeeping: cleaning up abandoned orgs

**`build cleanup-scratch-orgs`** is unrelated to any single pipeline run — it's meant as its own scheduled job (e.g. GitLab's scheduled pipelines, nightly) that queries every `--dev-hub` alias for scratch orgs older than 3 hours and bulk-deletes them, as a backstop for orgs left behind by pipelines that failed before reaching their own `delete-scratch` step. Being its own job, it needs its own `sf org login` step first, same as `create-scratch`/`delete-scratch` above.
