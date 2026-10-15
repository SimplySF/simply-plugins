# 0045 — Migrating `apx` code generation into `simply aep`

**Status:** In progress — phase 1 in `simply-plugins-core` ([its 0045](https://github.com/SimplySF/simply-plugins-core/blob/main/docs/design/0045-aep-core-generation-engine.md)) and phase 2 here are implemented; phases 3–5 are not started
**Package:** `packages/simply-aep` (CLI); `simply-plugins-core/packages/simply-aep-core` (library);
`simply-vscode` (editor); retirement work in `Syntax-Syllogism/apx`, `apx-core`, and
`apx-vscode-extension`
**Date:** 2026-10-15

## Problem

Two independent toolchains cover Apex Enterprise Patterns today, and each has half of the story:

| Toolchain                                                 | What it does                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@syntax-syllogism/apx` + `apx-core` + Apx VS Code        | **Generates** fflib/AT4DX layers (selector, domain, service, unit of work), AT4DX criteria/actions, selector methods, and field-set injections.                                       |
| `@simplysf/simply-aep` + `simply-aep-core` + Simply AT4DX | **Reads, validates, and edits** the AT4DX metadata those generators write: Application Factory bindings, domain-process bindings, field-set inclusions, platform-event subscriptions. |

The overlap is real and already causing drift:

- **Two serializers for the same Custom Metadata.** `apx-core` renders
  `ApplicationFactory_*Binding__mdt`, `DomainProcessBinding__mdt`, and
  `SelectorConfig_FieldSetInclusion__mdt` records from Eta templates
  (`src/aep/templates/apex/*Binding.ts`). `simply-aep-core` builds the same records with
  `buildBindingXml`/`buildDomainProcessBindingXml`/`buildFieldSetInclusionXml`, which always write
  both the primary and `...Alternate__c` SObject fields (one `xsi:nil`) so a re-scan never reports
  `ambiguous-sobject-reference` ([0022](0022-at4dx-update-xml-shape-preservation.md)). A record `apx`
  generates and one `simply` creates for the same binding can differ.
- **Generators don't validate.** `apx generate domain --at4dx` will happily write a second Domain
  binding for an SObject that already has one; `simply aep at4dx binding validate` would flag it as an
  error, but only if the user thinks to run it afterwards. `simply aep at4dx binding create` runs that
  validation itself and refuses to write an error without `--force` ([0015](0015-at4dx-binding-validate-create-set.md)).
- **Two installs, two release trains, two docs sites** for what users experience as one job:
  scaffold the layer, then wire and check its bindings.

## Decision

Move every `apx` generation capability into the simply suite, in five phases, ending with `apx`
reduced to `sf apx dead` alone. **`apx dead` is out of scope and does not move.**

- The generation engine (naming, describe view, path layout, plan builders, templates, engine,
  use-case descriptors and option schemas, result renderer) moves from `apx-core` into
  **`@simplysf/simply-aep-core`**, under a `generate/` subtree. Custom Metadata records are rendered by
  `simply-aep-core`'s existing XML builders, not by `apx-core`'s binding templates.
- The nine generation commands become **`sf simply aep generate ...`** in **`@simplysf/simply-aep`**,
  so they ship in the `@simplysf/simply` orchestrator automatically.
- Generators that write Custom Metadata records run the same validation the matching
  `simply aep at4dx <type> create` command runs, and refuse to introduce an error-severity issue
  without `--force`.
- The Apx VS Code generation UI moves to `simply-vscode`.
- `apx`, `apx-core`, and `apx-vscode-extension` deprecate their generation surface, then remove it in a
  major release, leaving dead-code analysis in place.

## Behavior

### Command mapping

| `apx` command                           | `simply` command                          | Notes                                                                                  |
| --------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `apx generate` (aggregate)              | `simply aep generate`                     | Topic and command share an ID, as in `apx`.                                            |
| `apx generate selector`                 | `simply aep generate selector`            |                                                                                        |
| `apx generate domain`                   | `simply aep generate domain`              |                                                                                        |
| `apx generate service`                  | `simply aep generate service`             |                                                                                        |
| `apx generate unitofwork`               | `simply aep generate unit-of-work`        | Matches `binding create --type unit-of-work`.                                          |
| `apx generate selector method`          | `simply aep generate selector-method`     | Flattened. `selector` stays a leaf command, not a topic.                               |
| `apx generate selector field-injection` | `simply aep generate field-set-inclusion` | Uses the name `simply aep at4dx field-set-inclusion` already uses for the same record. |
| `apx generate action`                   | `simply aep generate action`              |                                                                                        |
| `apx generate criteria`                 | `simply aep generate criteria`            |                                                                                        |
| `apx dead`                              | — (stays in `apx`)                        | Out of scope.                                                                          |

Why `generate` is a sibling of `at4dx` rather than a child: four of the generators are flavor-neutral
(`--flavor fflib` is just as valid as `at4dx`), and `simply aep at4dx <type> <verb>` is one CMDT type
per subtopic. The AT4DX-only generators (`action`, `criteria`, `selector-method`,
`field-set-inclusion`) still sit under `generate` because they produce Apex classes and tests. A CMDT
record is only part of their output.

### Flag mapping

| `apx` flag                                        | `simply` flag                                  | Change                                                                                                                                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--at4dx` / `--fflib` (exactly one)               | `-f, --flavor at4dx\|fflib` (required)         | One option flag instead of two mutually exclusive booleans. Same rule, enforced by oclif.                                                                                                                                               |
| `-p, --output-path` (default `generated-files`)   | `-d, --output-dir` (default `generated-files`) | Renamed to the `sf` convention. Same default and the same `main/classes/...`, `main/schema/...`, `test/classes/...` layout, so generated paths don't move.                                                                              |
| `-b, --binding-sequence`                          | `--sequence`                                   | Same name `binding create --type unit-of-work` uses.                                                                                                                                                                                    |
| `--sobject-selector-class-name`                   | `--selector-class`                             | Shorter. No behavior change.                                                                                                                                                                                                            |
| `-r/-d/-u` (`--selector/--domain/--unit-of-work`) | `--selector`, `--domain`, `--unit-of-work`     | Long forms only. `-d` now belongs to `--output-dir`.                                                                                                                                                                                    |
| _(none)_                                          | `--overwrite`                                  | New. See "Existing files".                                                                                                                                                                                                              |
| _(none)_                                          | `--force`                                      | New. See "Validation".                                                                                                                                                                                                                  |
| `-i, --interactive`                               | `-i, --interactive`                            | Phase 4. Not available in phases 2–3.                                                                                                                                                                                                   |
| everything else                                   | unchanged                                      | `-o/--target-org`, `-s/--sobject`, `--prefix`, `-a/--api-version`, `-c/--class-name`, `--service-basename`, `--process-name`, `--order`, `--trigger-operation`, `--description`, `--label`, `--fields`, `--fieldset-name`, `--dry-run`. |

Naming, pluralization, prefix handling, the 40-character limits, `--order` validation, describe and
API-version precedence, and the fflib unit-of-work `manualSteps` snippet all carry over unchanged.
`docs/command-details.md` in `apx` becomes the source for the new `messages/*.md` descriptions.

### Existing files

`apx` overwrites silently. The simply create commands refuse to clobber
(`developer-name-already-exists`). Generators adopt the simply behavior, which `apx-core`'s engine
already supports as the `error` overwrite policy:

- Default: if any planned path exists, fail before writing anything and list the paths.
- `--overwrite`: replace existing files (the old `apx` behavior).
- `--dry-run` still lists `wouldCreate` and never writes. It also prints each planned path as `NEW` or
  `OVERWRITE`, and warns when a real run would refuse because files exist.

### Validation

When a run plans a Custom Metadata record, the generator scans local bindings in the project's
package directories plus `--output-dir`. It adds the planned records, then runs the matching
validator:

| Generated record                                | Validator                       |
| ----------------------------------------------- | ------------------------------- |
| `ApplicationFactory_*Binding__mdt` (at4dx only) | `validateBindings`              |
| `DomainProcessBinding__mdt`                     | `validateDomainProcessBindings` |
| `SelectorConfig_FieldSetInclusion__mdt`         | `validateFieldSetInclusions`    |

Only issues the planned records **introduce** count; pre-existing problems are reported by `validate`,
not here (the scoping rule from [0011](0011-domain-process-binding-issue-scoping.md)). Introduced
error-severity issues fail the run unless `--force` is passed. Warnings are printed and returned.
fflib runs, `service` without bindings, and `selector-method` write no CMDT and skip this step.

As built, the scan-merge-diff lives in `simply-aep-core` as `planValidation` (its 0045), so the editor
gets the same answer. Three details the implementation settled:

- `--dry-run` runs validation too, and reports the issues without failing; it warns that a real run
  would refuse.
- `missing-domain-trigger` isn't checked: it needs a trigger scan, and `generate domain` writes the
  trigger itself.
- The generated records choose `BindingSObject__c` or `…Alternate__c` by EntityDefinition
  eligibility, not `apx`'s custom-vs-standard rule. `apx`'s rule produced records these validators
  flag — a `User` binding in the primary field is an error — so keeping it would have made the
  generators fail their own validation.

### JSON result

`{ baseDir, created, skipped, wouldCreate?, manualSteps?, issues }`. Two changes from `apx`:
`manualSteps` appears whenever it's produced (the aggregate no longer omits it for compatibility), and
`issues` carries the validation results above, each tagged
`record: 'binding' | 'domain-process-binding' | 'field-set-inclusion'`.

## Alternatives considered

- **Keep `apx` separate and have `simply-aep` depend on `apx-core`.** This leaves two serializers and
  two release trains, and the simply suite would depend on an MIT library outside the org with its own
  versioning policy. It solves none of the problems above.
- **Separate `simply-aep-generate-core` package.** This would give a cleaner dependency footprint for
  scan-only consumers, since `eta`, `pluralize`, and `zod` would stay out. But generation must import
  the CMDT builders and validators from `simply-aep-core` anyway, so the two packages would always
  release together. The extra dependencies are small, and `simply-apex-core` already ships `zod`.
- **Put the generators under `simply aep at4dx`.** This would misfile `--flavor fflib` and break the
  one-CMDT-type-per-subtopic rule the existing commands follow.
- **Fold `action`/`criteria` into `at4dx domain-process-binding create --generate-class`.** This is
  tempting because the binding is half of their output. Rejected because it gives a CRUD command for
  metadata records an Apex-scaffolding mode with a different flag set (`--process-name` naming,
  defaulted `--order`) and different failure modes. Cross-referencing in the help text gets the same
  discoverability.
- **Alias the old IDs (`aliases: ['apx:generate:domain']`).** This collides with an installed `apx`
  plugin during the deprecation window, which is when the alias would matter. `apx`'s own
  deprecation notices do the redirecting instead.
- **Keep `apx`'s silent overwrite.** That would make the generators the only simply write commands that
  clobber without asking. `--overwrite` keeps the old behavior one flag away.
- **Drop `-i` entirely.** The VS Code extension covers guided use, but CLI users rely on `-i` today
  (see `apx/docs/interactive-mode.md`). It's deferred to phase 4 instead of dropped, so phases 2–3
  aren't blocked on a shared prompting module.

## Implementation plan

Each phase ships independently and leaves every package releasable.

### Phase 0 — Agree the design (this doc)

- Settle the open questions below.
- Licensing: `apx`/`apx-core` are MIT (© Jake Richter) and simply is Apache-2.0. The author relicenses
  ported files to Apache-2.0 under the SimplySF header. Add a line to `simply-aep-core`'s README
  crediting `apx-core` as the origin.

### Phase 1 — Library: generation moves into `simply-aep-core`

Lands in `simply-plugins-core` and needs its own design doc there, per that repo's AGENTS.md. That doc
covers the public API surface.

1. Port `apx-core/src/{aep,useCases/generate*,render/generation,render/text,render/table,commandOptions}`
   to `simply-aep-core/src/generate/`. Leave `src/dead/`, `useCases/dead.ts`, and `render/dead.ts`
   behind.
2. Rename `ApxError`/`isApxError` to `AepGenerationError`/`isAepGenerationError` with the same `code`
   values, following the `BindingWriteError` pattern. Rename descriptor `cliId`s to
   `simply:aep:generate:*`.
3. Replace the six CMDT templates (`selectorBinding`, `domainBinding`, `serviceBinding`,
   `unitOfWorkBinding`, `domainProcessBinding`, and `selectorConfigFieldSetInclusionBinding`) with calls
   to the existing `buildBindingXml`, `buildDomainProcessBindingXml`, and `buildFieldSetInclusionXml`. The Apex, trigger, and `FieldSet` templates move as-is.
4. Add `planValidation(preview, sourceDirs)`. It scans locally, merges the planned records, and returns
   only the issues those records introduce. CLI and editor callers then share one implementation.
5. Port the tests from mocha to vitest. The `apx` golden fixtures (`test/fixtures/aep/golden/{at4dx,fflib}`)
   become the parity gate: every generated file must match byte-for-byte, except CMDT records. Each
   intentional CMDT difference is listed in the phase-1 doc.
6. Add the exports to `index.ts` and its exported-key test. Update the README `## API` section and the
   docs-site guide. Release as a minor version (`0.15.0`), since the change is additive.

### Phase 2 — CLI: layer generators

In `packages/simply-aep`:

1. Add `src/common/generate/`: the flags → options adapter (the `apx` `toOptions` logic, minus the
   flavor booleans), connection selection (`connectionFor`), and the dry-run/overwrite/render path
   (`runGeneration`). Shared flags that aren't AEP-specific go to `simply-plugin-kit/flags`.
   _As built:_ the describe-backed generators reuse the kit's `targetOrgFlags` and
   `requireConnection` (with `-a` kept on `--api-version`). The other new flags (`--output-dir`,
   `--overwrite`, `--force`, `--flavor`) only make sense for generators, so they stay in
   `src/common/generate/flags.ts`. The commands extend `SfCommand` directly and pass themselves to
   `runGeneration` for output.
2. Add `generate`, `generate selector`, `generate domain`, `generate service`, and
   `generate unit-of-work`, with `messages/simply.aep.generate*.md` ported from `apx` and the
   validation and `--overwrite` behavior above.
3. Port the descriptor/flag parity test (`apx/test/adapters/parity.test.ts`) so a schema key without a
   flag fails CI.
4. Run `pnpm run build` and `pnpm run readme` in `simply-aep` and `packages/simply`, then
   `pnpm --filter site run sync` (AGENTS.md checklist).

### Phase 3 — CLI: AT4DX process and injection generators

1. Add `generate action`, `generate criteria`, `generate selector-method`, and
   `generate field-set-inclusion`, all org-free.
2. Add cross-references to the help: `at4dx domain-process-binding create` ↔ `generate action/criteria`,
   and `at4dx field-set-inclusion create` ↔ `generate field-set-inclusion`.
3. Add the NUTs that `apx` runs org-free (`NUT_AEP_ENABLE`) under `vitest.nuts.config.ts`.
4. Repeat the README, snapshot, and site sync steps.

At the end of phase 3, `simply aep` has functional parity with `apx`'s generators.

### Phase 4 — Interactive mode and editor

1. **`-i` on all nine commands.** Add a prompting module to `simply-plugin-kit`, driven by the
   descriptors' zod UI hints (`text`, `file`, `enumValue`, `boolean`). These are the same hints the
   Apx VS Code extension already renders from, so the CLI and the editor ask the same questions. Port
   `apx/src/aep/prompting.ts` and `commandSupport.ts` behind it. This is a new shared kit module, so
   it needs its own design doc per the README trigger list.
2. **VS Code.** Port the Apx extension's descriptor-driven registry, input system, and runner into a new
   `simply-vscode/extensions/simply-aep` extension that imports `simply-aep-core` in process, and add
   it to `simply-extension-pack`. A follow-up can add "Generate action/criteria here" entry points to
   the AT4DX Explorer's domain-process tab. Needs a `simply-vscode` design doc.

### Phase 5 — Retire `apx` generation

Start this after phase 3 has been released for at least one minor cycle.

1. **`apx` minor release.** Mark the nine `generate` commands `state: 'deprecated'` with
   `deprecationOptions.to: 'simply:aep:generate:...'`. Update the README and docs site to point to
   simply.
2. **`apx-vscode-extension` minor release.** Deprecate its generation commands with a notification
   that links to the Simply AEP extension (after phase 4 step 2 ships).
3. **Majors.** `apx-core` drops the generation exports and keeps the dead-code API. `apx` removes the
   `generate` commands, leaving `sf apx dead`. `apx-vscode-extension` keeps only "Find Dead Code".
   Each changelog links this doc.

## Testing

- **Golden parity (phase 1).** The `apx` golden plans for both flavors, ported unchanged, must render
  byte-identically, except for the CMDT differences listed in the phase-1 doc. This test makes the move
  safe.
- **CMDT round-trip.** For every generated record, `scanLocal*` → `validate*` must report no
  `ambiguous-sobject-reference` or `malformed` issues. This pins the shared-serializer decision.
- **Validation scoping.** Generating a second Domain binding for an SObject that already has one fails
  without `--force` and succeeds with it. A pre-existing unrelated error doesn't fail a generate run.
- **Overwrite.** An existing target path fails with the full path list and writes nothing.
  `--overwrite` replaces the file. `--dry-run` never writes.
- **Flag parity.** Every schema key has a flag and every flag has a schema key (ported `parity.test.ts`).
- **Command tests.** Auth and connection ordering, API-version precedence (`core-cutover.test.ts`),
  and the fflib unit-of-work `manualSteps` output.
- **Live-org parity.** Before/after human and JSON output of the org-backed generators against one
  scratch org, which the `apx` cutovers skipped. Run manually and record it in the phase-2 PR.

## Open questions

1. **`--output-dir` default.** Keeping `generated-files` preserves `apx` behavior and the golden paths.
   Defaulting to the default package directory would make validation see the new records "in place".
   The draft recommends keeping `generated-files` and revisiting after phase 3. Maintainers decide.
   _Decided for phases 1–2: `generated-files`._ Validation scans `--output-dir` alongside the package
   directories, so records generated there are still checked against everything in place.
2. **Whether the opinionated layout (`main/classes/selectors`, `main/schema/custommetadata/...`) should
   become configurable** (`AepLayout` already supports it) through `sfdx-project.json` plugin config.
   Deferred: not needed for parity.
3. **Deprecation window length** before the phase 5 majors. Proposed: one minor cycle of
   `@simplysf/simply` after phase 3, and at least 60 days. Decided by the `apx` author.
4. **Does `apx dead` eventually follow?** It's explicitly excluded here. If it later moves, it lands as
   `simply apex dead` (it's about Apex classes, not AEP), using what's left of `apx-core` plus
   `simply-aep-core`'s binding scans in place of its own `ApplicationFactory_*` queries. That needs its
   own doc.
