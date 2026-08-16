---
title: Configuring Teams notifications
description: Wiring notify project/happy-soup/teams into a pipeline, including Jira story linking.
---

Three commands post to Microsoft Teams, from most to least opinionated:

- **`notify project`** — deployment cards with Jira story linking, for project (2GP packaged) pipelines.
- **`notify happy-soup`** — the same stage-notification pattern, without Jira integration.
- **`notify teams`** — posts an arbitrary JSON payload you build yourself, for anything the other two don't cover.

All three share one safety default: **`--enabled` must be passed explicitly, or nothing is sent.** This lets a pipeline template ship with notification jobs wired in everywhere, while individual projects opt in (or gate it behind a variable like `$TEAMS_NOTIFICATIONS_ENABLED`) without editing the job definitions.

## The before/after pattern

`notify project` and `notify happy-soup` are designed to run **twice per job**, mirroring the GitLab CI job lifecycle:

- Once with `--before-script`, at the start of a stage — for `notify project`, this is also when the previously-installed and target package versions get resolved and recorded, so the `--after-script` run (potentially in a different job, on a different runner) knows what changed.
- Once with `--after-script`, at the end — posts the actual success/failure card.

```yaml
pre-destructive:
  stage: deploy
  before_script:
    - sf simply cicd notify project --before-script --ci-job-stage pre-destructive
      --alias target-org --username $TARGET_ORG_USERNAME --jwt-key-file $TARGET_ORG_JWT_KEY_FILE
      --client-id $TARGET_ORG_CLIENT_ID --instance-url $TARGET_ORG_INSTANCE_URL
      --enabled
  script:
    - sf simply cicd deploy project pre-destructive --ci-job-token $CI_JOB_TOKEN ...
  after_script:
    - sf simply cicd notify project --after-script --ci-job-stage pre-destructive
      --ci-job-status $CI_JOB_STATUS
      --teams-webhook-url $TEAMS_WEBHOOK_URL
      --enabled
```

If `--after-script` runs in a job that never ran `--before-script` (e.g. a standalone rerun), pass `--prev-installed-package-version` and `--target-package-version` explicitly instead of relying on values `--before-script` would otherwise have resolved and stashed.

### Only notifying once per pipeline

By default every stage posts its own card. To collapse that into a single end-of-pipeline notification instead, pass `--notify-on-completion` on every `--after-script` call, and `--is-final-job` only on the last one — that combination is what actually triggers the send; every other `--after-script` call becomes a silent no-op.

## Jira story linking (`notify project` only)

`notify project` searches commit messages for Jira story keys between the previously-installed and target package versions, and includes them in the Teams card. Two flags control this:

- `--jira-project-key` — fallback project key(s) to search for, if none are configured in your repo's `.sfdevrc.json`.
- `--jira-base-url` — e.g. `https://your-org.atlassian.net/browse`. Without it, story keys are shown as plain text instead of links.

:::note[Your Jira setup]
The exact `.sfdevrc.json` schema for per-repo Jira project key configuration, and which Jira instance/project key(s) your team actually uses, are specific to your org — this guide can tell you the flags exist, not what values to put in them.
:::

## Custom payloads with `notify teams`

For anything outside the built-in card templates — a custom alert, a summary that isn't tied to a deploy stage — build your own JSON payload and post it directly:

```sh
sf simply cicd notify teams \
  --payload '{"text":"Nightly scratch-org cleanup complete"}' \
  --webhook-url $TEAMS_WEBHOOK_URL \
  --enabled
```

See [Teams' incoming webhook payload format](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using) for what `--payload` accepts. All three notify commands accept multiple `--teams-webhook-url` values if you need to post to more than one channel.
