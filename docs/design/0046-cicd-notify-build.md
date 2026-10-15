# 0046 — `simply cicd notify build`

**Status:** Draft
**Package:** `packages/simply-cicd`
**Date:** 2026-10-15

## Problem

`simply cicd` can post Teams cards for deployment pipelines (`notify project`, `notify happy-soup`),
but nothing covers the build pipeline: the `build *` jobs that create scratch orgs, push and test
source, and create the package version. A broken build is only noticed by whoever is watching the
pipeline. A new package version, which is the build pipeline's real output, isn't announced at all.
The team only learns about it when the version is deployed somewhere.

`notify project` can't just be pointed at build jobs. Its `--after-script` only posts on a
`post-destructive` success or on a failure. Its success card is worded as a deployment ("Completed
Deployment") and has an environment column. It also lists the stories between the version installed
in the target org and the one being deployed, which a build has no equivalent for.

## Decision

Add `simply cicd notify build`, next to `notify project` and `notify happy-soup`. It runs in a build
job's `after_script` and posts one of two cards:

- a **failure card** when the job failed, whichever build job it was;
- a **package version card** when the job succeeded and created a package version. The card lists
  the new version tag, its `04t` ID, and the issue references in the commits since the previous
  version tag.

It reuses the `notify` family's CI flags (same names and `SIMPLY_CICD_*` environment variables),
`--enabled` gate, Teams sender, Handlebars card templates and `AlmProvider` story extraction.

## Behavior

```
sf simply cicd notify build --ci-job-status <status> --teams-webhook-url <url>... --enabled [flags]
```

| `--ci-job-status` | Package version created in this job? | Card                                           |
| ----------------- | ------------------------------------ | ---------------------------------------------- |
| `failed`          | either                               | Failure: project, job, stage, branch, pipeline |
| `success`         | yes                                  | Package version: tag, `04t`, stories           |
| `success`         | no                                   | none (`{ sent: false }`)                       |
| anything else     | either                               | none (`{ sent: false }`)                       |

**Was a package version created in this job?** The `04t` ID comes from
`--subscriber-package-version-id` (env `SIMPLY_CICD_SUBSCRIBER_PACKAGE_VERSION_ID`). If that isn't
set, it comes from `SUBSCRIBER_PACKAGE_VERSION_ID` in `subscriberPackageVersionId.env` in the working
directory, which `build create-package-version` writes. An `after_script` runs in the same working
directory, so wiring the command into every build job's `after_script` is enough. Only the
`create-package-version` job has the file, and only when it actually created a version, not when it
skipped for a merge request or a non-release branch.

**Version tag and stories.**

1. If the clone is shallow (`git rev-parse --is-shallow-repository`), fetch with
   `--unshallow --tags`; otherwise fetch `--tags`.
2. The new tag is the tag at `HEAD` whose annotation subject is the `04t` ID
   (`git tag --points-at HEAD --format=…`). `create-package-version` annotates its tag that way, so
   this works for every version tag format and suffix.
3. The previous tag is `git describe --tags --abbrev=0 --match <glob> <tag>^`. The glob is
   `VersionTagFormat.fromProject(...).matchPattern()`, so tags in other formats aren't picked up.
4. Stories are `git log --pretty=oneline <previous>..<tag>`, passed through
   `renderIssuesFromCommitLog` with `--alm-provider`/`--alm-project-key`/`--alm-base-url`, as in
   `notify project`.

If any of these steps fails (a fetch error, no annotated tag, or no previous tag for a package's
first version), the command logs a warning and the card shows `N/A` for the missing part. A
notification is never the reason a build fails, except when sending it fails: like the other
`notify` commands, a webhook that rejects the post fails the command.

**Flags.**

| Flag                              | Env                                         | Notes                                         |
| --------------------------------- | ------------------------------------------- | --------------------------------------------- |
| `--ci-commit-ref-name`            | `SIMPLY_CICD_CI_COMMIT_REF_NAME`            | Card's branch column                          |
| `--ci-job-name`                   | `SIMPLY_CICD_CI_JOB_NAME`                   | Failure card heading                          |
| `--ci-job-stage`                  | `SIMPLY_CICD_CI_JOB_STAGE`                  | Failure card                                  |
| `--ci-job-status`                 | `SIMPLY_CICD_CI_JOB_STATUS`                 | Selects the card (table above)                |
| `--ci-pipeline-id`                | `SIMPLY_CICD_CI_PIPELINE_ID`                | Pipeline link text                            |
| `--ci-pipeline-url`               | `SIMPLY_CICD_CI_PIPELINE_URL`               | Pipeline link                                 |
| `--ci-project-title`              | `SIMPLY_CICD_CI_PROJECT_TITLE`              | Card heading                                  |
| `--subscriber-package-version-id` | `SIMPLY_CICD_SUBSCRIBER_PACKAGE_VERSION_ID` | Overrides the `.env` file                     |
| `--alm-base-url`                  | `SIMPLY_CICD_ALM_BASE_URL`                  | As in `notify project`                        |
| `--alm-project-key`               | `SIMPLY_CICD_ALM_PROJECT_KEY`               | As in `notify project`                        |
| `--alm-provider`                  | `SIMPLY_CICD_ALM_PROVIDER`                  | Default `jira`                                |
| `--teams-webhook-url` (multiple)  | —                                           | Required when `--enabled`                     |
| `--enabled`                       | `SIMPLY_CICD_ENABLED`                       | Default `false`, as in every `notify` command |
| `--debug`                         | `SIMPLY_CICD_DEBUG`                         |                                               |

The JSON result is `{ sent: boolean }`. The Teams payload has the same shape as `notify project`'s
(`content`, `refName`, `pipelineId`, `pipelineUrl`, `projectTitle`, `jobName`, `jobStage`,
`jobStatus`, `stories`, `storiesLinked`, `packageVersion`, `packageVersionPrevious`), plus
`subscriberPackageVersionId`, so a Power Automate flow built for one works with the other.

There are no `--before-script`/`--after-script` flags. A build has nothing to record up front, and no
"starting" card was asked for.

## Alternatives considered

- **`simply cicd build notify`.** That would group it with the jobs it reports on, but every other
  notification lives under `notify`. A user looking for "how do I get Teams cards" should find all
  three in one topic.
- **A build mode on `notify project`.** That command's flags (`--alias`, `--packaging-devhub`,
  `--prev-installed-package-version`, the before/after split) are all about the deployment flow.
  Adding a mode would make half of them meaningless depending on another flag, and would make the
  help text harder to read for both uses.
- **Detecting the package job by `--ci-job-name`.** Job names are whatever the pipeline author
  chose. The `.env` file that `create-package-version` writes is a signal it controls.
- **Resolving the version through the packaging DevHub** (`sf package version report`), as
  `notify project` does. That would need the DevHub authenticated in `after_script`. The stories have
  to be computed between git tags anyway, and the annotated tag already holds both the version and
  the `04t`.
- **Reusing `getCommitStories`.** It always runs `git fetch --unshallow` and returns `N/A` when that
  fails, which happens on a full clone. It also takes version strings rather than tag names, so it
  would break on custom tag formats. The new helper shares `renderIssuesFromCommitLog` instead.
- **A card for every successful job.** Too noisy for a pipeline with a dozen jobs per commit.
  Failures and new versions are what people act on.

## Implementation plan

1. `src/common/notify/templates.ts`: `build-failure-notification` and
   `build-package-version-notification`.
2. `src/common/notify/buildNotification.ts`: `resolveSubscriberPackageVersionId`,
   `fetchVersionHistory`, `findPackageVersionTag`, `findPreviousVersionTag`,
   `getPackageVersionHistory` (which turns any failure into `N/A`), and `sendBuildNotification`,
   which picks the card.
3. `src/commands/simply/cicd/notify/build.ts` and `messages/simply.cicd.notify.build.md`.
4. Mention `notify build` in the `notify teams` description, next to the other built-in cards.
5. Regenerate the `simply-cicd` README (it isn't bundled into the `simply` orchestrator), `command-snapshot.json`,
   and the site reference pages. Add this doc to the index.

## Testing

Unit tests (`vitest`):

- `buildNotification.test.ts`:
  - The `04t` comes from the option first, then the `.env` file, otherwise there is none.
  - The tag lookup picks the tag whose annotation matches the `04t`, out of several tags at `HEAD`.
  - The previous tag uses the format's match glob and `<tag>^`.
  - A shallow clone gets `--unshallow`, a full clone doesn't.
  - The table above: failed → failure card; success with a `04t` → package version card with
    stories; success without one, or `canceled`, → nothing sent.
  - A missing tag, a missing previous tag, or a fetch error gives `N/A` without throwing.
- `notify/build.test.ts`: `--enabled` gating, missing `--teams-webhook-url`, and flags mapped to
  options.

## Open questions

None.
