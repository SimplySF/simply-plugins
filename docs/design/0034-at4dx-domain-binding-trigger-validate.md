# 0034 — `at4dx binding validate`: wire up `missing-domain-trigger` trigger scanning

**Status:** Draft
**Package:** `packages/simply-aep`
**Date:** 2026-09-03

## Problem

`simply-node`'s [0036](https://github.com/SimplySF/simply-node/blob/main/docs/design/0036-at4dx-domain-binding-trigger-validate.md)
adds a `missing-domain-trigger` rule to `@simplysf/simply-aep-core`'s `validateBindings`: a `Domain`
binding whose SObject has no Active Apex trigger calling
`fflib_SObjectDomain.triggerHandler(<DomainClass>.class)` is a fully-wired-but-dead binding — the Domain
class (and any `DomainProcessBinding__mdt` on that SObject) never runs. That rule is opt-in: it only
fires when a caller passes a `triggers: RawApexTriggerRecord[]` array into `validateBindings`. This
package's `sf simply aep at4dx binding validate` command — the only consumer of `validateBindings` here —
doesn't do that today, so the new rule is invisible until this command scans and passes triggers through.

## Decision

`binding/validate.ts` scans Apex triggers (via `simply-aep-core`'s new `scanLocalApexTriggers`/
`scanOrgApexTriggers`) alongside the existing binding scan, and passes the result into `validateBindings`
— but **only when `Domain` is among the resolved `--type` set** (default, or explicitly requested).
`missing-domain-trigger` is the only rule that consumes `triggers`, so scanning them for a `--type service`
-only run would be pure waste — an extra Tooling query (org) or `ComponentSet` pass (local) for a check
that can never fire.

No new flags. This is the same shape of change as [0014](0014-domain-process-binding-entity-definition-eligibility.md)'s addition to `domain-process-binding validate` — an existing command's issue surface grows, its signature doesn't.

## Behavior

```sh
sf simply aep at4dx binding validate --target-org my-org
sf simply aep at4dx binding validate --source-dir sfdx-source/core
```

Unchanged flags/exclusivity/error keys. The only visible difference: when a `Domain` binding is scanned
and its trigger wiring is broken, a `missing-domain-trigger` row now appears in the issues table (and
`--json` output) exactly like every other rule, and — being `error` severity — sets
`process.exitCode = 1` the same way `missing-sobject-reference` already does.

### `run()` changes

Both the `targetOrg` and `sourceDirs` branches gain a trigger scan, gated on `requestedTypes.includes('Domain')`:

```ts
const triggers = requestedTypes.includes('Domain')
  ? targetOrg
    ? await scanOrgApexTriggers(connection)
    : scanLocalApexTriggers(sourceDirs)
  : undefined;

issues = validateBindings(
  scanResult.records,
  { malformed: scanResult.malformed, ambiguous: scanResult.ambiguous },
  triggers,
);
```

A trigger-scan failure (org query error, local `ComponentSet` I/O error) is treated the same as the
existing binding-scan failure for that branch — `error.orgQueryFailed`/`error.localScanFailed` — rather
than a new error key, since from the caller's perspective both are "couldn't read what's in the
org/source."

## Alternatives considered

**Always scanning triggers, regardless of `--type`.** Rejected — wasted work (and, for `--target-org`, a
wasted API call) on every run that never touches `Domain` bindings, for zero behavior difference. The
`requestedTypes.includes('Domain')` gate is cheap and already-available (the flag is parsed before any
scanning starts).

**A new `--check-triggers`/`--skip-trigger-check` flag.** Rejected — `binding validate`'s existing model
is "run every applicable rule for the requested type(s), no per-rule opt-out flags" (see
[0015](0015-at4dx-binding-validate-create-set.md)); adding one flag for one rule breaks that consistency
for no requested benefit. If a real need for suppressing just this rule emerges, it's a `--exclude-rule`-shaped
feature for every rule, not a bespoke flag for this one.

## Implementation plan

1. **`binding/validate.ts`** — import `scanLocalApexTriggers`/`scanOrgApexTriggers` from
   `@simplysf/simply-aep-core`; add the gated trigger scan and pass-through described above, in both the
   `targetOrg` and local branches.
2. **`messages/simply.aep.at4dx.binding.validate.md`** — mention the new rule in the command
   `description` (rule list already isn't enumerated per-flag here, so this is a short prose addition, not
   a flag change).
3. **Tests** (`packages/simply-aep/test/commands/simply/aep/at4dx/binding/validate.test.ts`) — see
   Testing below.
4. **Housekeeping** — bump the `@simplysf/simply-aep-core` dependency to the version that ships
   [0036](https://github.com/SimplySF/simply-node/blob/main/docs/design/0036-at4dx-domain-binding-trigger-validate.md);
   `pnpm run readme`; root `pnpm run build` for `command-snapshot.json`.

## Testing

| Case                                                                                  | What it pins down                                                                               |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `--type domain`, local source with a Domain binding + matching Active trigger         | No `missing-domain-trigger` issue.                                                              |
| `--type domain`, local source with a Domain binding and no trigger on that SObject    | `missing-domain-trigger` issue present; `process.exitCode === 1`.                               |
| `--type service` (or `--type selector`/`unit-of-work`) only, no `Domain` requested    | Trigger scan never runs (assert the mocked scan function is not called).                        |
| `--target-org`, mocked `Connection` with a Tooling query returning a matching trigger | No `missing-domain-trigger` issue; confirms the org branch wires `scanOrgApexTriggers` through. |
| `--target-org`, Tooling query throws                                                  | `error.orgQueryFailed`, same as an existing binding-scan failure.                               |
| Default (no `--type`, all four types)                                                 | Trigger scan runs (Domain is in the default set).                                               |

## Open questions

- Same open questions as [simply-node's 0036](https://github.com/SimplySF/simply-node/blob/main/docs/design/0036-at4dx-domain-binding-trigger-validate.md)
  apply here unchanged (non-literal `triggerHandler` conventions, blank `To__c`, Inactive-only severity,
  Tooling query cost at scale) — this doc doesn't repeat them, since none are specific to the command
  layer.
