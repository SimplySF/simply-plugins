# 0041 — `simply settings address state create`/`activate`

**Status:** Draft
**Package:** new `packages/simply-settings` (CLI, in `simply-plugins`); new
`packages/simply-settings-core` (library, in `simply-plugins-core`, where this doc is duplicated
under that repo's next free number)
**Date:** 2026-10-14

## Problem

An org with State and Country/Territory Picklists enabled ships with states for only a handful of
countries. Adding the rest — ISO 3166-2 lists roughly 5,000 subdivisions — has to be done one state
at a time through **Setup → State and Country/Territory Picklists → Configure New State**.
Salesforce documents that this can't be automated through the platform's APIs: "You can't use
Metadata API to create or delete new states, countries, or territories", and "you can't deploy new
ISO codes … using any API"
([State and Country/Territory Picklists and Metadata API](https://help.salesforce.com/s/articleView?language=en_US&id=sf.admin_state_country_picklists_api.htm&type=5)).

[mattandneil/statecodes](https://github.com/mattandneil/statecodes) works around this with an Apex
batch that screen-scrapes that Setup form. It's useful, but it means installing an unlocked package
(plus a Remote Site Setting to the org's own domain) into every org, and it finishes with a manual
Workbench step: retrieve `Address.settings`, find-and-replace `<active>false</active>` and
`<visible>false</visible>`, and deploy it back, because every new state is created inactive and
hidden. Nothing in this CLI does any of this today.

### What the upstream package does (read in full)

`StateCodes.cls` (5,318 lines, ~5,040 of them a hardcoded `Map<String,String>` of
`'{Country}-{State}' => 'State name'`) runs as a batch of scope size 1, one state per `execute`:

1. `GET {orgDomain}/i18n/ConfigureNewState.apexp?countryIso={Country}`, with the running user's
   session id as the `sid` cookie.
2. Pull the four Visualforce view-state hidden fields (`ViewState`, `ViewStateVersion`,
   `ViewStateMAC`, `ViewStateCSRF`) out of the HTML. The country is encoded in the view state.
3. `POST` the form back (`application/x-www-form-urlencoded`) with the state name, ISO code, and
   integration value (set equal to the name), using **hardcoded** generated component ids
   (`configurenew:j_id1:blockNew:j_id9:nameSectionItem:editName`, …, `…:j_id43:addButton`).
4. Classify the response HTML:
   - `<h4>Errors</h4>` or `<h4>Error:</h4>`: a validation error, e.g. the state already exists.
     The batch silently `continue`s.
   - `You are missing information`: the country doesn't exist in the org. Also silently skipped.
   - No `success=true` redirect: an unrecognized failure, written to a `Document` in the user's
     personal folder.
5. Retry each request once on `CalloutException` ("Read timed out"), and email the user on finish.

`StateCodes.page` is a Visualforce page for editing the map as JSON, starting/aborting the batch,
and polling `AsyncApexJob`. It has no logic beyond that.

The upstream repo has **no license** (`gh api repos/mattandneil/statecodes` → `license: null`). We
reimplement the technique, which is a description of how Salesforce's own Setup form behaves. We
don't copy its code or its dataset; see Open questions for where the dataset comes from instead.

## Decision

Add a new plugin, `@simplysf/simply-settings`, under a new `simply settings` topic with an
`address` subtopic: `sf simply settings address state create` and
`sf simply settings address state activate`. The topic is named for the Metadata API's `Settings`
type family, so other `*Settings` commands have an obvious place to land later. `address` mirrors
`AddressSettings`, the type the second command deploys.

All org interaction and HTML handling lives in a new `@simplysf/simply-settings-core` library in
`simply-plugins-core` **from the start**. This follows the same reasoning as
[0024](0024-apex-test-suite-generate.md): don't write it inline and extract it later. The CLI
package stays a thin flags/spinner/table layer. Scraping a Setup form and activating states are
things an editor extension or script could want without the CLI, which meets
[0019](0019-plugin-core-library-extraction.md)'s third criterion.

The plugin is bundled into the `@simplysf/simply` orchestrator like every other plugin.

Three deliberate departures from upstream:

1. **Diff before scraping.** `create` reads the org's current `AddressSettings` (one Metadata API
   `readMetadata` call) first. States whose ISO code already exists, and countries the org doesn't
   have, are classified without any HTTP traffic. Upstream sends two requests for every one of its
   ~5,040 entries on every run, even when nothing is missing.
2. **Parse the form instead of hardcoding component ids.** The `j_id9`/`j_id43` ids are generated
   by Visualforce and shift whenever Salesforce changes the page. We submit every hidden input the
   GET response contains, and find the name/code/integration-value inputs and the Add button by
   their stable id **suffixes** (`:editName`, `:editIsoCode`, `:editIntVal`, `:addButton`).
3. **Report every outcome.** Upstream silently swallows validation errors, so a state rejected
   for a real reason (say, a duplicate _name_) looks the same as one that already existed. Every
   state gets a status and, where Salesforce gave one, its message.

## Behavior

### Input: state definitions

Both commands work over the same list of state definitions, resolved the same way:

| Source                     | When        | Shape                                                                                                                                                                  |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bundled ISO 3166-2 dataset | No `--file` | Shipped in `simply-settings-core` (see Open questions for its source).                                                                                                 |
| `--file <path>`            | Given       | JSON object `{ "US-CA": "California", … }`. This is the same `{Country}-{State}` → name shape the upstream page edits, so an existing customized list ports unchanged. |

Keys must match `^[A-Z]{2}-[A-Z0-9]{1,3}$`, and names must be non-empty. The command fails before
any org call on the first invalid entry, naming it. `--country` (multiple) then filters the list to
those ISO 3166-1 alpha-2 codes. An unknown country code in `--country` is an error, not an empty
result. The integration value is always set to the name, as upstream does. Setting it separately
is out of scope for v1; see Open questions.

### `sf simply settings address state create`

```
sf simply settings address state create --target-org myOrg --country US --country CA
sf simply settings address state create --target-org myOrg --file states.json --dry-run
```

| Flag            | Char | Required       | Description                                                                                                               |
| --------------- | ---- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `--target-org`  | `-o` | Yes            | `simply-plugin-kit`'s shared org flag.                                                                                    |
| `--api-version` | —    | No             | Same.                                                                                                                     |
| `--file`        | `-f` | No             | State definitions JSON (above). Defaults to the bundled dataset.                                                          |
| `--country`     | `-c` | No, multiple   | Only these countries.                                                                                                     |
| `--concurrency` | —    | No (default 4) | How many states are submitted in parallel (1–10). Each state is still a GET then a POST against its own fresh view state. |
| `--dry-run`     | —    | No             | Do the diff and print what would be created; send no Setup-form requests.                                                 |

**Flow.**

1. Resolve and filter the definitions.
2. `readAddressSettings(connection)` — `connection.metadata.read('AddressSettings', 'Address')`.
   If State and Country/Territory Picklists isn't enabled, fail with a message saying so.
3. Plan. Each definition becomes `exists` (the ISO code is already present under that country),
   `country-missing` (no such country in the org), or `pending`.
4. Unless `--dry-run`, open a Setup session (below) and submit each `pending` state through
   `mapConcurrent` (from `simply-core`), with `retryWithBackoff` wrapping transport-level failures
   only (timeouts, resets, 5xx). Re-POSTing after a timeout is safe: if the first attempt landed,
   the retry comes back as a duplicate and is classified `exists`.
5. Print a summary table of counts by status, plus a detail table of every `rejected`/`failed`
   row. Finish with a hint to run `state activate`, since new states are created inactive.

**Opening a Setup session.** `GET {instanceUrl}/secur/frontdoor.jsp?sid={accessToken}` with a
cookie jar (`undici` with manual redirect-following, collecting `Set-Cookie`), then
`GET /i18n/ConfigureNewState.apexp?countryIso=US` to confirm the response is the form and not a
login page. If it's a login page, the command fails before submitting anything: "Couldn't open a
Setup session with this org's credentials. The auth may lack the `web`/`full` OAuth scope." The
access token never appears in output or in error messages.

**Submitting one state** (`createState(session, definition)`):

1. `GET /i18n/ConfigureNewState.apexp?countryIso={Country}`.
2. Find the form containing an input whose name ends `:editIsoCode`. Collect all of its hidden
   inputs (this covers the four view-state fields plus the form's own marker input), set the
   `:editName`, `:editIsoCode`, and `:editIntVal` inputs, and add the `:addButton` submit's
   name/value. If any of the four expected suffixes is missing, the state is `failed` with
   "Setup form layout not recognized". This is the tripwire for Salesforce changing the page.
3. `POST` the form to its `action` URL and classify the response:

| Response contains                              | Status            | Message                                    |
| ---------------------------------------------- | ----------------- | ------------------------------------------ |
| `success=true`                                 | `created`         | —                                          |
| An error block whose text says the code exists | `exists`          | Salesforce's text                          |
| Any other `<h4>Errors</h4>`/`<h4>Error:</h4>`  | `rejected`        | Salesforce's text (first `<li>` / heading) |
| `You are missing information`                  | `country-missing` | —                                          |
| Anything else                                  | `failed`          | "Unrecognized response" + HTTP status      |

The exact "already exists" wording is pinned from a real org at implementation time (see
Testing). Until it matches, a duplicate shows up as `rejected`, which is visible rather than wrong.

**Output.** `--json` returns:

```ts
type StateCreateResult = {
  summary: Record<'created' | 'exists' | 'country-missing' | 'rejected' | 'failed' | 'would-create', number>;
  states: Array<{ country: string; code: string; name: string; status: StateStatus; message?: string }>;
};
```

`--dry-run` reports `would-create` in place of `pending`. Following the `validate` commands'
convention, `process.exitCode = 1` when any state is `rejected` or `failed`; the result is still
returned in full.

### `sf simply settings address state activate`

```
sf simply settings address state activate --target-org myOrg --country US
```

| Flag            | Char | Required        | Description                               |
| --------------- | ---- | --------------- | ----------------------------------------- |
| `--target-org`  | `-o` | Yes             | Shared org flag.                          |
| `--api-version` | —    | No              | Same.                                     |
| `--file`        | `-f` | No              | Same definitions input as `create`.       |
| `--country`     | `-c` | No, multiple    | Same filter.                              |
| `--wait`        | `-w` | No (default 33) | Minutes to wait for the deploy.           |
| `--dry-run`     | —    | No              | Report what would change; deploy nothing. |

**Scope.** Only states that are both in the resolved definitions **and** present in the org get
`<active>true</active>` and `<visible>true</visible>`. Other states, and every country, are left
alone. This makes `create` + `activate` with the same flags a matched pair, and it never re-enables
a standard state an admin deliberately hid. Upstream's find-and-replace activates everything
instead, which is the main behavior change here.

**Mechanism.** Read `AddressSettings`, flip the fields on the matched states, and deploy the
settings back through `@salesforce/source-deploy-retrieve` from a temporary directory, polling up
to `--wait`. The upstream README warns that `Address.settings` retrieved from _another_ org can
drift from the target's labels. That doesn't apply here, because we write back exactly what we
just read from the same org. If nothing needs changing, nothing is deployed and the command says
so.

**Output.** `{ activated: number; alreadyActive: number; notInOrg: number; deployId?: string }`,
plus the list of activated states in `--json`.

### `@simplysf/simply-settings-core` API

| Export                                                | Kind | Purpose                                                                     |
| ----------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| `loadIsoStateDefinitions()`                           | data | The bundled dataset, as `StateDefinition[]`.                                |
| `parseStateDefinitions(json)`                         | pure | Validate/normalize the `--file` shape; throws `SfError` naming the bad key. |
| `filterStateDefinitions(defs, countries)`             | pure | `--country` filter, erroring on unknown codes.                              |
| `readAddressSettings(connection)`                     | org  | Metadata API read, with the "picklists not enabled" check.                  |
| `planStateCreation(defs, settings)`                   | pure | → `exists` / `country-missing` / `pending`.                                 |
| `openSetupSession(connection)`                        | org  | Frontdoor + cookie jar + login-page check → `SetupSession`.                 |
| `parseNewStateForm(html)`                             | pure | → `{ action, fields }`, or `undefined` if the layout isn't recognized.      |
| `classifyNewStateResponse(status, html)`              | pure | → `{ status, message? }` per the table above.                               |
| `createState(session, def)` / `createStates(options)` | org  | One state / many with concurrency, retry, `onProgress` callback.            |
| `planStateActivation(defs, settings)`                 | pure | → the mutated settings + counts.                                            |
| `activateStates(options)`                             | org  | Plan + deploy.                                                              |

## Alternatives considered

**Create states through the Metadata API.** This would be the clean answer, but Salesforce
explicitly doesn't support it (see Problem). `activate` uses the Metadata API precisely because
editing existing states _is_ supported.

**Port the Apex batch and deploy it to the org.** This leaves code, a Remote Site Setting, and
`Document` records in the org, needs Apex test coverage in production, and reports its results
over email. The CLI already holds an authenticated session, so none of that footprint is needed.

**Drive a headless browser (Playwright).** This adds a large dependency and an install step for
what is a two-request form submission. We'd only reconsider if Salesforce moved this Setup page
to Lightning with no server-rendered form.

**Hardcode the upstream component ids.** These are generated ids from the page as it was in 2019.
The suffix-based parse costs about twenty lines and fails loudly when the page changes, instead of
posting garbage.

**Activate everything (upstream's find-and-replace).** This is simpler, but it silently re-enables
states admins hid on purpose. `--file` with the full list, or no `--country`, already covers "do
everything" for the dataset.

**Fold activation into `create` as `--activate`.** Admins commonly create in a sandbox, review,
and then activate. Upstream's README insists on exactly that. Two commands keep that pause
natural. Running the pair back to back is one extra line.

**Topic `simply address` / package `simply-address`.** Considered first. `simply settings address`
was chosen so future `*Settings` metadata commands share a home.

## Implementation plan

Per the cross-repo recipe ([0027](0027-core-extraction-round-1-post-split.md)), core first:

1. **`simply-plugins-core`**: `packages/simply-settings-core`, using the standard `-core` library
   shape (`exports`/`main`/`types`, no oclif). Dependencies: `@salesforce/core`,
   `@salesforce/source-deploy-retrieve`, `@simplysf/simply-core` (`workspace:^`; for
   `mapConcurrent`/`retryWithBackoff`), `undici`, and an HTML parser (`node-html-parser`: small,
   no native deps; regex over Visualforce output was rejected as too fragile for attribute order).
   Add `src/data/iso-3166-2.json` with the bundled dataset and its license notice, the `src/address/*`
   modules per the API table, a barrel `src/index.ts`, `test/index.test.ts` (exported-key list),
   a README `## API` section, a `CONTRIBUTING.md` stub, and this doc under that repo's next
   number. Open that PR, merge it, and publish `0.1.0`.
2. **`simply-plugins`**: `packages/simply-settings`, scaffolded from `simply-community`'s
   `package.json`/`bin`/`tsconfig`/wireit block, with `oclif.topics` `simply → settings → address
→ state`. Add `src/commands/simply/settings/address/state/{create,activate}.ts`,
   `messages/simply.settings.address.state.{create,activate}.md`, and tests. Then
   `pnpm run build` (for `command-snapshot.json`) and `pnpm run readme`.
3. **Register it**: add it to `packages/simply`'s `oclif.plugins` and `dependencies`, then rebuild
   and run `pnpm run readme` there. Add it to `OTHER_PLUGIN_DIRS` in
   `site/scripts/sync-command-reference.mjs` and to the sidebar in `site/astro.config.mjs`, then run
   `pnpm --filter site run sync`.
4. Add the index row to `docs/design/README.md`, and update Status once both PRs land.

## Testing

**Core unit tests (vitest + `undici` `MockAgent`):**

- `parseNewStateForm` against a captured, scrubbed `ConfigureNewState.apexp` page: it finds all
  hidden inputs and the four suffixed fields, and returns `undefined` when any suffix is missing.
- `classifyNewStateResponse`: one captured fixture per row of the classification table.
- `planStateCreation`/`planStateActivation` against a small `AddressSettings` fixture: existing
  codes, missing countries, already-active states, and states outside the definitions left
  untouched.
- `openSetupSession`: cookies carried through frontdoor's redirects, the login-page response
  becoming the scope error, and the token absent from the error text.
- `createStates`: concurrency bound respected, a timeout retried, and a retry landing as `exists`.
- `parseStateDefinitions`: bad keys, empty names, and non-object JSON.

**CLI unit tests**: flags wired through, table/JSON shape, `exitCode` set on `rejected`/`failed`,
and `--dry-run` sending no Setup requests.

**NUT** (scratch org with the `StateAndCountryPicklist` feature): `create --country US --file`
with one fictitious code (`US-ZZ`), run twice (`created`, then `exists`), then `activate`, then
re-read `AddressSettings` and assert it's active and visible. This is also where the response
fixtures and the exact "already exists" wording get captured.

## Open questions

1. **Bundled dataset source.** Upstream's map is unlicensed, so it isn't copied. Candidates:
   Debian `iso-codes`' `iso_3166-2.json` (LGPL-2.1+; shipped unmodified as a data file with its
   notice), or a Wikidata export (CC0). Either way, subdivision _levels_ need choosing: ISO lists
   France's regions _and_ departments, for example, and upstream appears to include both. Decide
   the source before implementing step 1. The fallback is shipping no dataset and requiring `--file`.
2. **Auth types.** Frontdoor needs a token with `web`/`full` scope. The default `sf org login web`
   app has it; JWT flows with a custom connected app may not. That case is handled by the fail-fast
   error, but it's worth confirming against a JWT-authed org before release.
3. **Setup domain.** Whether `/i18n/ConfigureNewState.apexp` on the instance URL still serves
   the classic form, or redirects to `*.my.salesforce-setup.com`, is confirmed in the NUT. The cookie
   jar follows redirects across both hosts either way.
4. **Default `--concurrency`.** 4 is a guess, chosen so the full dataset runs in tens of minutes
   instead of the hours a serial run takes. Measure against a sandbox and adjust.
5. **Separate integration values** (for example, ISO code as the integration value). Not in v1.
   It would be a value-shape extension to `--file`, not a new flag.
