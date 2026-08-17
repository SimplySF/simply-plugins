---
title: Configuring Teams notifications
description: Wiring notify project/happy-soup/teams into a pipeline, including Jira story linking.
---

Three commands post to Microsoft Teams, from most to least opinionated:

- **`notify project`** — deployment cards with Jira story linking, for project (2GP packaged) pipelines.
- **`notify happy-soup`** — the same stage-notification pattern, without Jira integration.
- **`notify teams`** — posts an arbitrary JSON payload you build yourself, for anything the other two don't cover.

All three share one safety default: **`--enabled` must be passed explicitly, or nothing is sent.** This lets a pipeline template ship with notification jobs wired in everywhere, while individual projects opt in (or gate it behind a variable like `$TEAMS_NOTIFICATIONS_ENABLED`) without editing the job definitions.

## The before/after pattern — and how it differs by topic

Both `notify project` and `notify happy-soup` are meant to run in `--before-script`/`--after-script` pairs, but at different granularity, matching how each deploy topic is structured (see [Deploy pipeline stages](/cicd/concepts/deploy-pipeline-stages/)):

- **`notify project`** is meant to wrap the **whole pipeline once** — `--before-script` on the very first stage job (typically `pre-destructive`), `--after-script` on the very last (typically `post-destructive`). `--before-script` is also when the previously-installed and target package versions get resolved and recorded, so the later `--after-script` run (potentially in a different job, on a different runner) knows what changed for the Jira story lookup.
- **`notify happy-soup`** is meant to wrap **every stage**, since a happy-soup pipeline can run several unrelated apps per stage and you generally want per-stage visibility, not just a single pipeline-level card.

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

post-destructive:
  stage: deploy
  script:
    - sf simply cicd deploy project post-destructive --ci-job-token $CI_JOB_TOKEN ...
  after_script:
    - sf simply cicd notify project --after-script --ci-job-stage post-destructive
      --ci-job-status $CI_JOB_STATUS
      --teams-webhook-url $TEAMS_WEBHOOK_URL
      --enabled
```

If `--after-script` runs in a job that never ran `--before-script` (e.g. a standalone rerun), pass `--prev-installed-package-version` and `--target-package-version` explicitly instead of relying on values `--before-script` would otherwise have resolved and stashed.

### Collapsing happy-soup's per-stage notifications to one

By default every stage posts its own card for `notify happy-soup`. To collapse that into a single end-of-pipeline notification instead, pass `--notify-on-completion` on every `--after-script` call, and `--is-final-job` only on the last one — that combination is what actually triggers the send; every other `--after-script` call becomes a silent no-op.

## Jira story linking (`notify project` only)

`notify project` searches commit messages for Jira story keys between the previously-installed and target package versions, and includes them in the Teams card. Two flags control this:

- `--jira-project-key` — fallback project key(s) to search for, if none are configured in your repo's `.sfdevrc.json`.
- `--jira-base-url` — e.g. `https://your-org.atlassian.net/browse`. Without it, story keys are shown as plain text instead of links.

`.sfdevrc.json`, at your repo root, takes priority over `--jira-project-key` when present:

```json
{
  "jiraProjectKey": "PROJ",
  "jiraProjectKeys": ["PROJ", "PLAT"]
}
```

Both fields are optional and additive — a single `jiraProjectKey` and an array `jiraProjectKeys` are merged and de-duplicated, so use whichever is more convenient (a lone key vs. several projects sharing one pipeline).

## Custom payloads with `notify teams`

For anything outside the built-in card templates — a custom alert, a summary that isn't tied to a deploy stage — build your own JSON payload and post it directly:

```sh
sf simply cicd notify teams \
  --payload '{"text":"Nightly scratch-org cleanup complete"}' \
  --webhook-url $TEAMS_WEBHOOK_URL \
  --enabled
```

See [Teams' incoming webhook payload format](https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/connectors-using) for what `--payload` accepts. All three notify commands accept multiple `--teams-webhook-url` values if you need to post to more than one channel.

## Getting a webhook URL

Microsoft retired the old Office 365 Connector webhooks — set one up through Teams' **Workflows** app (Power Automate) instead:

1. In the Teams channel or chat you want notifications in, open **Workflows** and create a new flow from the **"Post to a channel when a webhook request is received"** template (or the chat equivalent).
2. Name the flow and pick the target team/channel (or chat).
3. The template adds a default "Post an adaptive card" action — replace it with a **"Post message in a chat or channel"** action, since `notify project`/`notify happy-soup`/`notify teams` post plain card JSON, not the Workflows adaptive-card schema.
4. Set that action's message body to the raw trigger payload (`@{triggerBody().content}` in the flow's expression syntax).
5. Save, then copy the generated **HTTP POST URL** off the trigger step — that's your `--teams-webhook-url`/`--webhook-url` / `TEAMS_WEBHOOK_URL` CI variable. Treat it as a secret (mask it in CI variables) — anyone with the URL can post into that channel.
