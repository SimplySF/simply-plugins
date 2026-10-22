# 0055 — Override sections and keys match the PermissionSet metadata

**Status:** Draft
**Package:** `packages/simply-permissions` (CLI); `packages/simply-permissions-core` (library, in
`simply-plugins-core`, where this doc is duplicated as its 0051)
**Date:** 2026-10-22

## Problem

[0054](0054-permissions-config-record-access-names.md) renamed `viewAll` and `modifyAll` to the
metadata's `viewAllRecords` and `modifyAllRecords`. The rest of a permission set build config still
differs from the XML it produces, in both its section names and its keys:

| Config                                            | PermissionSet XML                                      |
| ------------------------------------------------- | ------------------------------------------------------ |
| `objects`                                         | `<objectPermissions>`                                  |
| `objects` keys `read`, `create`, `edit`, `delete` | `allowRead`, `allowCreate`, `allowEdit`, `allowDelete` |
| `fields`                                          | `<fieldPermissions>`                                   |
| `tabs`                                            | `<tabSettings>`                                        |
| `tabs` key `visible: boolean`                     | `<visibility>`: `Visible`, `Available`, or `None`      |

Tabs are more than a naming problem. The generator writes `visible: false` as
`<visibility>Hidden</visibility>`, which is a profile value, not one a permission set accepts. And a
boolean can't express `Available` (the tab is available but hidden from the user's nav).

The rest already matches: the `fields` keys (`readable`, `editable`), `recordTypeVisibilities` and
its `visible`, `userPermissions` (keyed by `<name>`, valued by `<enabled>`), and
`hasActivationRequired`.

## Decision

Every section and key is named for the PermissionSet element it sets:

```json
{
  "objectPermissions": {
    "Account": { "allowRead": true, "allowEdit": true, "viewAllRecords": true }
  },
  "fieldPermissions": {
    "Account.AnnualRevenue": { "readable": true, "editable": false }
  },
  "tabSettings": {
    "standard-Account": { "visibility": "Available" }
  },
  "recordTypeVisibilities": { "Account.Enterprise": { "visible": true } },
  "userPermissions": { "ApiEnabled": true },
  "hasActivationRequired": false
}
```

- `objectPermissions` entries take `allowRead`, `allowCreate`, `allowEdit`, `allowDelete`,
  `viewAllRecords`, `modifyAllRecords`, and `viewAllFields`.
- `tabSettings` entries take `visibility`: `Visible`, `Available`, or `None`, written to the XML as
  given.

Old names are rejected with `invalid-config`, as in 0054, and every old name in a file is reported
at once: `objects was renamed to objectPermissions.`, `read was renamed to allowRead.`,
`visible was renamed to visibility (Visible, Available, or None).`

Generated defaults: a scanned tab is `Visible`, as before. A tab that only an override names, with
no `visibility` of its own, is `None` (it was `Hidden`).

The exported `TabSetting` type changes from `{ tab, visible: boolean }` to
`{ tab, visibility: TabVisibility }`, with `TabVisibility` exported alongside it.

`simply-permissions-core@0.8.0` shipped with 0054 alone, so this is `0.9.0`. The plugins skip
0.8.0 and move to 0.9.0 directly, so plugin users migrate once.

## Alternatives considered

**Keep `tabs[].visible` and only fix the `Hidden` output.** It fixes the deploy problem but keeps a
key that isn't the metadata's, and still can't express `Available`.

**Keep the short section names.** `objects` / `fields` / `tabs` are shorter, but then the file is
half metadata names and half not, and you have to remember which. Matching the XML throughout means
the PermissionSet metadata reference documents the format.

**Accept both old and new names.** Rejected for the same reasons as in 0054: two names for one
setting forever, and a precedence rule for files that set both.

## Implementation plan

1. **Core** (`0.9.0`): rename the sections and the `objectPermissions` keys; replace `visible` with a
   `visibility` enum; generalize 0054's renamed-name rejection to the top-level, object, and tab
   schemas; `TabSetting.visibility` in the template, which writes it unchanged; tests.
2. **`simply-permissions`** (bump straight to `^0.9.0`): the README's `--config` example and table.

## Testing

**Core:** each renamed section and key is rejected from an inline `config` and from an overrides
file, naming the new name; every renamed name in one file is reported at once; an invalid
`visibility` value is rejected; overrides with the new names compile; a scanned tab is `Visible` and
an override-only tab without `visibility` is `None`; the template writes `Visible`, `Available`, and
`None` as given and never `Hidden`.

## Open questions

None.
