# 0043 — `--upgrade-type` for `simply cicd` package installs

**Status:** Implemented ([#64](https://github.com/SimplySF/simply-plugins/pull/64))
**Package:** `packages/simply-cicd`
**Date:** 2026-10-14

## Problem

When an unlocked package upgrade removes components, the install's upgrade type decides what
happens to them: deprecate them all (`DeprecateOnly`), delete what can be deleted safely and
deprecate the rest (`Mixed`), or delete everything except custom objects and fields that has no
dependencies (`Delete`). `sf package install --upgrade-type` and
`sf simply package dependencies install --upgrade-type` both expose this choice. The three
`simply-cicd` commands that install packages don't. They always run with the library's default,
`Mixed`. A pipeline that has to keep removed components around (deprecate-only), or that wants a
scratch org or sandbox cleaned out fully (delete), can't get that behavior.

## Decision

Add `--upgrade-type DeprecateOnly|Mixed|Delete` (default `Mixed`) to:

- `build install-dependencies`
- `deploy project install-packaged`
- `deploy happy-soup install-packaged`

The flag uses the same name, values, and default as `sf package install` and
`simply package dependencies install`, so one value means the same thing everywhere. All three
commands install dependencies through `installPackageDependencies` in `sfPackages.ts`. That
function passes the value to `@simplysf/simply-package-core`, which already supports `upgradeType`.

## Behavior

| Command                              | What `--upgrade-type` applies to                                                          |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| `build install-dependencies`         | Every dependency installed into the scratch org                                           |
| `deploy happy-soup install-packaged` | Every dependency installed into the target org                                            |
| `deploy project install-packaged`    | Every dependency, **and** the project's own package (`sf package install --upgrade-type`) |

- The default, `Mixed`, is what all three commands did before this change. Without the flag,
  nothing changes.
- `DeprecateOnly` and `Delete` only matter for unlocked package upgrades. For managed packages and
  fresh installs, Salesforce ignores the value, and so does this command.
- `Delete` isn't confirmed first. `simply package dependencies install` asks for confirmation before
  a `Delete` upgrade of an unlocked package. In a pipeline, the core library gets no prompts and
  auto-approves, the same way it already auto-approves Remote Site Settings. The project's own
  package is installed with `--no-prompt`, as before. Because the flag has to be passed
  explicitly, using `Delete` is the confirmation.
- There's no `SIMPLY_CICD_UPGRADE_TYPE` environment variable. `--install-type` doesn't have one
  either. Both describe a single stage rather than pipeline-wide configuration, and a variable that
  quietly turned on `Delete` across a whole pipeline would be a risky default.

## Alternatives considered

- **Only `build install-dependencies`.** The deploy commands go through the same helper, and a
  team that needs `DeprecateOnly` for scratch orgs needs it even more for sandboxes and production.
- **Dependencies only, not the project's own package, in `deploy project install-packaged`.** A
  user who passes `--upgrade-type DeprecateOnly` to keep removed components would reasonably expect
  that to cover every install the command runs. Applying it to only some of them would be
  surprising.
- **A per-dependency setting in `sfdx-project.json`.** That's more flexible, but no one has asked
  for different upgrade types per dependency. It can be added later on top of the flag.

## Implementation plan

1. `sfPackages.ts`: `upgradeType` on `InstallPackageDependenciesConfig`, defaulting to `Mixed`, and
   passed to the core library.
2. `installDependencies.ts`, `deployCommon.ts`, `deployHappySoup.ts`, and `deployProject.ts`: pass
   it through. `installPackageById` adds `--upgrade-type` to `sf package install`.
3. Add the flag to the three commands, plus `flags.upgrade-type.{summary,description}` in their
   `messages/*.md`.
4. Regenerate the READMEs, `command-snapshot.json`, and the site reference pages.

## Testing

Unit tests (`vitest`):

- Command tests: the default is `Mixed`, an explicit value is passed through, and an unknown value
  is rejected.
- `sfPackages.test.ts`: the value reaches the core library, and `Mixed` is the default.
- `installDependencies.test.ts`, `deployCommon.test.ts`, `deployHappySoup.test.ts`: the value is
  passed through.
- `deployProject.test.ts`: `sf package install` gets `--upgrade-type Mixed` by default, and an
  explicit value reaches both the dependency install and the project package install.

## Open questions

None.
