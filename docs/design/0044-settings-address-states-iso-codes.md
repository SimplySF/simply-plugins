# 0044 — `--iso-codes`: fetch state definitions from Debian `iso-codes` at run time

**Status:** Draft
**Package:** `packages/simply-settings` (CLI, in `simply-plugins`); `packages/simply-settings-core`
(library, in `simply-plugins-core`, where this doc is duplicated)
**Date:** 2026-10-14

## Problem

`sf simply settings address state create`/`activate` ([0041](0041-settings-address-states.md))
require a `--file` mapping ISO 3166-2 codes to names. 0041 deliberately shipped no dataset, so
every user has to find, convert, and curate one themselves before the commands do anything. That
is the hardest part of the job, and the result goes stale: ISO 3166-2 changes several times a year
(subdivisions renamed, merged, split), and a hand-maintained file never hears about it.

0041 rejected bundling a dataset for two reasons, and both still hold for anything committed to
this repo:

1. **It goes out of date.** A snapshot in the package is only as fresh as our last release, and
   refreshing it is a chore nobody owns.
2. **Licensing.** The authoritative open source, Debian's
   [`iso-codes`](https://salsa.debian.org/iso-codes-team/iso-codes), is LGPL-2.1+. Converting
   `iso_3166-2.json` into our shape and committing it puts an LGPL-derived file inside an
   Apache-2.0 package.

Both come from _storing_ the data. Neither applies if the command fetches it from upstream each time
it runs.

## Decision

Add an `--iso-codes` flag to both commands as an alternative to `--file`. It downloads
`data/iso_3166-2.json` from Debian's `iso-codes` repository at run time, at the latest release tag
unless `--iso-codes-version` pins one, converts it in memory to the same definitions `--file`
produces, and hands them to the existing pipeline unchanged. Nothing is written to the repo, the
package, or (in this version) the user's disk.

Fetching and converting live in `@simplysf/simply-settings-core`, next to `parseStateDefinitions`,
for the same reason 0041 put everything else there. The CLI only adds flags and a line reporting
which version it used.

## Behavior

### Flags (both `create` and `activate`)

| Flag                  | Required                                | Description                                                                                                                                    |
| --------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--file`              | Exactly one of `--file` / `--iso-codes` | Unchanged.                                                                                                                                     |
| `--iso-codes`         | Exactly one of `--file` / `--iso-codes` | Fetch state definitions from Debian `iso-codes`.                                                                                               |
| `--iso-codes-version` | No; requires `--iso-codes`              | A tag (`v4.20.1`) or branch (`main`) of the `iso-codes` repo. Defaults to the latest release tag.                                              |
| `--all-levels`        | No; requires `--iso-codes`              | Include subdivisions nested under another subdivision (French departments, English boroughs). By default only top-level subdivisions are used. |
| `--country`           | No, multiple                            | Unchanged; filters either source. Strongly suggested with `--iso-codes`, since the unfiltered top level is 3,590 states across 200 countries.  |

`--file` stops being `required: true` and becomes `exactlyOne: ['file', 'iso-codes']`. Existing
invocations with `--file` behave exactly as before.

```
sf simply settings address state create --target-org myOrg --iso-codes --country FR --country DE --dry-run
sf simply settings address state create --target-org myOrg --iso-codes --iso-codes-version v4.20.1 --country FR
sf simply settings address state activate --target-org myOrg --iso-codes --iso-codes-version v4.20.1 --country FR
```

### Resolution

1. **Version.** With `--iso-codes-version`, use it as given. Otherwise ask the GitLab API for the
   newest tag (`GET https://salsa.debian.org/api/v4/projects/iso-codes-team%2Fiso-codes/repository/tags?order_by=version&sort=desc`)
   and take the first tag matching `^v\d+(\.\d+)*$`. We default to a
   release tag rather than `main` because tags are what distributions ship; `main` can hold
   in-progress edits. Users who want unreleased fixes can say `--iso-codes-version main`.
2. **Fetch.** `GET https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/{version}/data/iso_3166-2.json`
   (about 500 KB). Use `undici` (already a core dependency) through `EnvHttpProxyAgent`, so
   `HTTPS_PROXY`/`NO_PROXY` work the way they do for the rest of `sf`. Use a 30-second timeout, and
   wrap transport failures (timeouts, resets, 5xx) in `retryWithBackoff`.
3. **Convert.** The file is `{ "3166-2": [{ code, name, type, parent? }] }`. Drop entries with a
   `parent` unless `--all-levels` is set, map each remaining entry to `code → name`, and pass the
   result through the **existing** `parseStateDefinitions`. Every current upstream code already
   matches its `^[A-Z]{2}-[A-Z0-9]{1,3}$` rule (checked against all 5,046 entries). If upstream
   ever changes shape, the run fails loudly at this step, before any org call, instead of creating
   bad states.
4. **Filter.** `--country` exactly as today, including the error for a country with no entries.

The command logs one line before the org work starts, for example
`Using Debian iso-codes v4.20.1: 26 subdivisions for FR (top level only).`, so the run records
which data it used.

### Why top level by default

ISO 3166-2 lists more than one level for some countries, and a Salesforce org almost always wants
one level. In `v4.20.1`, 1,456 of the 5,046 entries have a `parent`:

| Country | All entries | Top level | What the top level is                                        |
| ------- | ----------- | --------- | ------------------------------------------------------------ |
| US      | 57          | 57        | 50 states, DC, 6 outlying areas                              |
| CA      | 13          | 13        | Provinces and territories                                    |
| FR      | 124         | 26        | Regions and overseas collectivities (departments are nested) |
| GB      | 221         | 4         | England, Scotland, Wales, Northern Ireland                   |

For FR and GB, neither level is right for every org. Top level is the safer default because it is
smaller and easier to review. `--all-levels` gets the full list, and a curated `--file` still
covers anything in between.

### Output

Both result types gain an optional `source` field. This is additive, and it is absent for `--file`:

```ts
source?: { kind: 'iso-codes'; version: string; allLevels: boolean };
```

Everything else is as in 0041.

### Errors

| Situation                                     | Message (gist)                                                                                                   |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Network failure or non-200 after retries      | "Couldn't download ISO 3166-2 data from {url}: {reason}. Check your network or proxy, or pass `--file` instead." |
| Tag lookup returns no release tag             | Same, naming the tags endpoint; suggest `--iso-codes-version`.                                                   |
| `--iso-codes-version` doesn't exist (404)     | "iso-codes has no version '{v}'." with a link to the tags page.                                                  |
| Response isn't the expected shape / bad entry | The existing `parseStateDefinitions` error, prefixed with the source URL.                                        |

### Behavior worth knowing about

- **Duplicate names.** In `v4.20.1`, 9 top-level names repeat within a country (for example
  Azerbaijan's `Lənkəran` city and `Lənkəran` district). Salesforce is expected to reject the
  second as a duplicate name, so it shows up as `rejected` with Salesforce's message. That is
  visible rather than wrong, and the code is still reported.
- **Names are ISO's**, romanized with diacritics (`Sant Julià de Lòria`). The integration value is
  still the name, as in 0041.
- **`create` + `activate` drift.** If a new `iso-codes` release lands between the two commands,
  unpinned runs could resolve different versions. The docs and examples pin
  `--iso-codes-version` for that reason, and `source.version` in the JSON output makes the
  version used auditable.

## Licensing

`iso-codes` is LGPL-2.1+. This design never redistributes it: nothing derived from it is committed,
published in our npm packages, or written to disk. The user's machine downloads the data from
Debian and uses it in memory. The package README and the flag's help text credit Debian's
`iso-codes` project and link to it. Our code stays Apache-2.0 and contains only the URL and a
converter.

## Alternatives considered

**Commit a generated snapshot and refresh it with a script.** This is rejected for both of the
reasons in Problem. It goes stale between releases, and it makes us distribute an LGPL-derived
file.

**Default to `main`.** It's fresher, but it can carry unreleased edits. Release tags are the
reviewed data, and `main` is one flag away.

**pycountry, or an npm wrapper of `iso-codes`.** pycountry is Python. The npm wrappers are
unofficial and repackage the same LGPL data on someone else's release schedule. Going to the
source is simpler and is as fresh as possible.

**Unicode CLDR subdivision names.** CLDR's license is permissive, so it could even be bundled. But
its subdivision ids are a lowercased, hyphen-less form of ISO codes, its English names coverage is
thinner and lags ISO, and the hierarchy lives in a separate containment file. Bundling it would
still go stale, which is the problem being solved here.

**Wikidata (CC0).** As in 0041, its coverage and naming vary, so it needs curation.

**Cache the download.** Tags are immutable, so caching a tagged file in the `sf` cache directory
would be safe and would make repeat runs work offline. It's left out of v1 because one 500 KB GET
per run is cheap and a cache adds invalidation and storage rules. It's easy to add later without
changing any flag. `main` would never be cached.

**A separate `state list --iso-codes` command to export a starter `--file`.** This is useful for
curation, but it's a separate feature (see Open questions).

## Implementation plan

1. **`simply-plugins-core` (`simply-settings-core`)**: add `src/address/isoCodes.ts`:
   - `ISO_CODES_BASE_URL`, plus `isoCodesDataUrl(version)`.
   - `resolveIsoCodesVersion(options?)`, which returns the newest release tag.
   - `isoCodesToStateDefinitions(json, { allLevels })`, which is pure, does the shape check and
     parent filter, and delegates to `parseStateDefinitions`.
   - `fetchIsoCodesStateDefinitions({ version?, allLevels?, dispatcher? })`, which returns
     `{ version, definitions }` and accepts an `undici` dispatcher for tests and proxies.

   Export these from the barrel, add them to `test/index.test.ts` and the README `## API` table,
   copy this doc into that repo, and release a minor version.

2. **`simply-plugins` (`simply-settings`)**: in `src/common/loadStateDefinitions.ts`, accept
   `{ file } | { isoCodes: { version?, allLevels } }` and return `{ definitions, source? }`. Add
   the three flags and `exactlyOne` to both commands, log the source line, add `source` to both
   results, and update `messages/*.md` (summaries, descriptions, examples, the new errors, and the
   attribution). Bump `@simplysf/simply-settings-core`, then `pnpm run build` (for
   `command-snapshot.json`), `pnpm run readme` here and in `packages/simply`, and
   `pnpm --filter site run sync`.
3. In 0041, point its "Bundle an ISO 3166-2 dataset" alternative and open question 5 at this doc.

## Testing

**Core (vitest, `undici` `MockAgent`):**

- `resolveIsoCodesVersion` skips non-release tags and errors when there are none.
- `isoCodesToStateDefinitions`, against a small fixture with nested entries: top level by default,
  everything with `allLevels`, a wrong top-level shape rejected, and a bad code rejected with the
  existing message.
- `fetchIsoCodesStateDefinitions`: the right raw URL for a pinned version, the tags lookup when
  unpinned, a 5xx retried, a 404 turned into the "no version" error, and a timeout turned into the
  download error naming the URL.

**CLI:**

- `--file` and `--iso-codes` together, or neither, fail at flag parsing.
- `--iso-codes-version`/`--all-levels` without `--iso-codes` fail.
- `--iso-codes --country FR` hands only FR's top-level definitions to the planner.
- `source` appears in the JSON for `--iso-codes` and is absent for `--file`.

**Live check (manual, once):** run `create --iso-codes --country FR --dry-run` against a real org
with no mocks, to confirm the endpoints, proxy handling, and the reported counts. Tests never hit
salsa.debian.org.

## Open questions

1. **Flag names.** `--iso-codes` names the data's source, while `--source iso-codes` would leave
   room for more sources later. With one source, the boolean reads better. Revisit if a second
   source is ever added.
2. **Choosing levels more precisely than top level vs. all levels**, for example `--subdivision-type
"Metropolitan department"` using the data's `type` field. This is deferred until someone needs
   a level other than those two.
3. **Availability of salsa.debian.org.** It has no SLA. If outages turn out to matter in practice,
   options include a mirror fallback or the cache described above. `--file` is always the
   fallback.
4. **An export command** (`state list --iso-codes > states.json`) for teams that want to review
   and commit their own curated file. This would be a separate design if wanted.
