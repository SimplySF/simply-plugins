# 0061 — Deprecate `sfdx-dependabot`'s unprefixed environment-variable fallbacks

**Status:** Accepted — implemented on `feat/cicd-deprecate-unprefixed-env-fallbacks`  
**Package:** `packages/simply-cicd`  
**Date:** 2026-11-11

## Problem

Every `simply cicd sfdx-dependabot` flag already has a `SIMPLY_CICD_` environment variable (oclif's
`env:`). The command also falls back, silently, to a second, older set of names:
`SFDX_DEPENDABOT_VCS_API_URL`, `_VCS_TOKEN`, `_ROOT_GROUP_ID`, `_DRY_RUN`, `_PROJECT_ALLOWLIST`,
`_PROJECT_DENYLIST`, `_SKIP_ARCHIVED`, `_SKIP_FORKS`, `_BRANCH_PREFIX`, `_CHANGE_REQUEST_LABELS`,
`_FAIL_ON_ERROR`, `_MAX_PROJECTS`, plus `PACKAGING_DEVHUB_USERNAME` for `--devhub-username`. These are
the only environment variables in this repo's plugins that the plugins themselves define without
the `SIMPLY_` prefix. Worse, the command's own error messages still point users at them
(`set SFDX_DEPENDABOT_VCS_TOKEN`), so new pipelines keep adopting the old names.

This is the plugin-side half of `simply-plugins-core`'s design doc 0060, which moves
`simply-cicd-core`'s own variables to `SIMPLY_CICD_` names the same way.

## Decision

Keep reading the old names, but deprecate them. One is read only when neither the flag nor its
`SIMPLY_CICD_` variable is set, and reading it logs a warning naming the replacement. They will be
removed in a future release. The error messages and help text name only the `SIMPLY_CICD_` variables.

## Behavior

Resolution order per flag, unchanged except for the warning:

| Order | Source                                     | Warning                                                                                              |
| ----- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| 1     | The flag                                   | —                                                                                                    |
| 2     | Its `SIMPLY_CICD_` variable (oclif `env:`) | —                                                                                                    |
| 3     | The deprecated variable                    | `<OLD> is deprecated and will be removed in a future release. Set <NEW> (or pass --<flag>) instead.` |
| 4     | `CI_API_V4_URL` (`--vcs-api-url` only)     | — (GitLab-provided)                                                                                  |
| 5     | The flag's default                         | —                                                                                                    |

A deprecated variable that is set but shadowed by 1 or 2 is not read, so it doesn't warn.

Out of scope here, because they belong to `simply-cicd-core` and change with its release that
implements 0060 there:

- the `SUBSCRIBER_PACKAGE_VERSION_ID` fallback for `--subscriber-package-version-id`, which comes
  from `create-package-version`'s dotenv artifact;
- the `SFDX_DEPENDABOT_ENABLED` opt-in variable;
- every other command's documentation of the dotenv keys (`PACKAGE_CHANGED`, `LAST_TAG`,
  `AER_PACKAGE_*`, `UTAM_PAGE_OBJECTS_*`, …).

Warning about `SUBSCRIBER_PACKAGE_VERSION_ID` before then would be wrong: the current core writes
only that name, so users would get a warning they can't act on.

## Alternatives considered

- **Remove the fallbacks now.** Rejected: existing pipelines set these, and a missing token or group
  ID fails the whole run.
- **Rename the flags' `env:` to the old names, or list both in `env:`.** oclif takes one name per
  flag, and the `SIMPLY_CICD_` names are already the documented ones.
- **Warn once per run, listing every deprecated variable used.** Rejected: one warning per variable,
  naming its exact replacement, is easier to act on, and there are rarely more than a few.

## Implementation plan

1. `sfdx-dependabot.ts`: a `LEGACY_FLAG_ENV_VARS` map from flag to deprecated name, and
   `readLegacyEnv(flag)`, which warns through `this.warn`. Each fallback reads through it only when
   its flag is unset.
2. `messages/simply.cicd.sfdx-dependabot.md`: `warning.deprecatedEnvVar`, error messages naming the
   `SIMPLY_CICD_` variables, and a description paragraph on the deprecation.
3. Regenerate the README command reference.

## Testing

`test/commands/simply/cicd/sfdx-dependabot.test.ts` now uses the `SIMPLY_CICD_` names for its
baseline environment, and adds:

- deprecated variables only: the run still works, with one warning per variable used, in order;
- a `SIMPLY_CICD_` variable and its deprecated one both set: the new one wins, with no warning;
- the flag passed and the deprecated variable set: no warning;
- the missing-token error names `SIMPLY_CICD_VCS_TOKEN`.

## Open questions

- **Removal release.** It's the maintainers' call, and should land in the same release that removes
  `simply-cicd-core`'s legacy names (core 0060).
