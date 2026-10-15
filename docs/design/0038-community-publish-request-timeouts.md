# 0038 — Fix the community publish hang: send the request, bound the lookup, surface poll errors

**Status:** In progress
**Package:** `simply-community`
**Date:** 2026-10-15 (first drafted 2026-09-17)

## Problem

`sf simply community publish` (and `simply community url set --publish`) hangs instead of failing
or finishing — reported as: works from a desktop terminal, always hangs in a GitLab CI job.

The root cause turned out to be in `simply-community-core`, and not CI-specific: the publish POST
was sent with no body, and jsforce never sends a bodyless POST (it streams the body and only ends the
stream when one is set), so the request sat on an open connection until jsforce's 30-minute fetch
timeout. Confirmed against a live org. The first fix attempt (`simply-plugins-core`
[0040](https://github.com/SimplySF/simply-plugins-core/blob/main/docs/design/0040-community-publish-request-timeouts.md))
added per-attempt timeouts, but they only stopped _waiting_ for a stuck request — the request kept
the process alive regardless, so the command still never exited. Both are fixed in
`simply-plugins-core`
[0044](https://github.com/SimplySF/simply-plugins-core/blob/main/docs/design/0044-community-publish-cancel-stalled-requests.md).

Three things remain in this repo:

1. This plugin still resolves `@simplysf/simply-community-core@0.2.5`, from before either fix.
2. Its own `Network` lookups (`connection.singleRecordQuery`) in `publish.ts` and `url/set.ts` are
   unbounded — the same shape as the core calls, one level up.
3. A failed publish-status check is silent: the poll treats it as "not finished yet", so a
   deterministic failure (e.g. a CI user that can't query `BackgroundOperation`) shows up only as a
   generic timeout once the wait runs out.

## Decision

- Depend on the `simply-community-core` release that ships 0044.
- Replace the three `singleRecordQuery` Network lookups with core's new `queryNetworkByName`, which
  is bounded by `DEFAULT_PUBLISH_REQUEST_TIMEOUT` and cancels the request when it times out. It
  throws the same `SingleRecordQuery_*` errors, so `--ignore-errors` and error output are unchanged.
- Pass `onPollError` to `publishCommunity` from both commands, printing a `warning.pollFailed`
  warning with the underlying error for each failed status check.

This supersedes the earlier draft of this doc (never merged), which wrapped each `singleRecordQuery`
in `retryWithBackoff`'s `attemptTimeout`. That only races a timer against the request, leaving the
request itself running, which is the same flaw 0044 fixes in core.

Out of scope: `url set`'s other org calls (`verifyDomain`, `retrieveCustomSite`,
`deployChangedFiles`) — unrelated to the reported hang, and the deploy already has its own
`--wait`-driven bound.

## Behavior

- No flag or result-shape changes.
- `simply community publish` / `url set --publish` actually reach Salesforce.
- New warning on each failed publish-status check, with the underlying error (`warning.pollFailed`
  in both commands' `messages/*.md`).

## Implementation plan

1. Bump `@simplysf/simply-community-core` in `packages/simply-community/package.json` once
   `simply-plugins-core` 0044 publishes.
2. `publish.ts`, `url/set.ts` — `queryNetworkByName`; `onPollError` → `this.warn`.
3. `messages/*.md` — `warning.pollFailed`.
4. Tests — `publish.test.ts` routes every request through `fakeConnectionRequest` (all three calls go
   through `Connection.request()` now); new cases for the no-such-community error and the poll
   warning.
5. `pnpm run build` — no `command-snapshot.json` diff expected (no flags changed).

## Testing

- Unit, per the plan.
- Against the tarball of the unpublished core: `bin/run.js simply community publish --name <missing>`
  against a live org fails with `SingleRecordQuery_NoRecords` in ~3s and exits.

## Open questions

- A real publish hasn't been run end to end with the fix (core 0044's open question). Do one in a
  sandbox before release.
