# 0047 — `simply-sf-mcp`: an MCP server over the `-core` libraries

**Status:** In progress. The server and the `apex`, `aep` and `package` toolsets are implemented.
The `sobject`, `permissions`, `schema` and `data` toolsets wait on moving their logic into core (see
[Implementation notes](#implementation-notes)).
**Package:** `packages/simply-sf-mcp` (new)
**Date:** 2026-10-15

## Problem

Coding agents (Claude Code, Codex, Cursor and others) can already run every `simply` command by
shelling out to `sf`. In practice that is slow and wasteful:

- **Every call pays the CLI's startup cost.** `sf version --json`, which does no work at all, takes
  about 11 s on a typical dev machine. That time goes to oclif loading plugins. Each
  `sf simply ...` call pays it again, then resolves auth and builds a `Connection` again. An agent
  that runs ten commands in a task spends close to two minutes just starting the CLI.
- **Agents find commands by trial and error.** To find the right command, an agent runs
  `sf simply --help`, then `--help` on a topic, then on a command, guesses the flags, and parses
  output written for people. That costs many round-trips and a lot of context, and it still goes
  wrong.
- **Results are shaped for a terminal.** `--json` helps, but spinners, warnings and multi-kilobyte
  envelopes still end up in the agent's context.

The work these commands do mostly lives in the `-core` libraries in `simply-plugins-core`. Most
commands are a thin wrapper: they parse flags, call `requireConnection`, and call one core function.
For example, `simply apex execute` calls `executeApex(connection, file)`. The slow and awkward part
is how the work is reached, not the work itself. (Implementing this found five commands that aren't
thin wrappers yet; see [Implementation notes](#implementation-notes).)

## Decision

Add **`@simplysf/simply-sf-mcp`**, a new package in this repo. It is a
[Model Context Protocol](https://modelcontextprotocol.io) server that exposes selected `simply`
operations as MCP tools. It calls the same `-core` functions the oclif plugins call. It is a
long-running stdio process, so it pays startup once per agent session and caches org connections
between calls.

It is a second front end next to the oclif plugins, not a replacement for them:

```
            simply-plugins-core (libraries)
             ▲                          ▲
  oclif plugins (sf simply …)     simply-sf-mcp (MCP tools)
```

It complements Salesforce's official DX MCP server, `@salesforce/mcp`, and does not compete with
it. That server already covers generic org work: deploy, retrieve, SOQL and running tests.
`simply-sf-mcp` exposes only what is specific to `simply`.

## Behavior

### Running it

```
npx -y @simplysf/simply-sf-mcp [--directory <project>] [--toolsets <a,b,…>] [--allow <tier>]
```

Example registration in Claude Code's `.mcp.json`:

```json
{
  "mcpServers": {
    "simply": { "command": "npx", "args": ["-y", "@simplysf/simply-sf-mcp", "--toolsets", "apex,aep"] }
  }
}
```

| Option        | Default                         | Meaning                                                                                                         |
| ------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--directory` | the process's working directory | The Salesforce DX project root. Relative `source_dir`/`output_dir` arguments resolve against it.                |
| `--toolsets`  | all toolsets                    | Comma-separated list from the toolset table below. Only tools in these toolsets are registered.                 |
| `--allow`     | `read`                          | Highest permission tier to register: `read`, `write` or `destructive`. Tools above the tier are not registered. |

Tools that are filtered out are **not registered at all**. They are not registered-but-refused. An
agent never sees a tool it can't use, and unused tool definitions don't take up its context.

### Permission tiers

The tier describes what a tool does **to the org**. Writing local files (reports, CSVs, generated
source) does not raise the tier, because those changes show up in the agent's diff and are easy to
undo.

| Tier          | Meaning                                                                     | MCP annotations                                 |
| ------------- | --------------------------------------------------------------------------- | ----------------------------------------------- |
| `read`        | Reads the org and/or the local project only.                                | `readOnlyHint: true`                            |
| `write`       | Changes the org, but adds or updates rather than removing (or is undoable). | `readOnlyHint: false`, `destructiveHint: false` |
| `destructive` | Deletes or overwrites data or metadata in the org.                          | `readOnlyHint: false`, `destructiveHint: true`  |

`apex_execute` is `write`, because anonymous Apex can do DML. It is not `destructive`, because the
tool can't know what the script does. That makes `--allow write` a real trust decision, and the docs
say so.

### Tools (first release)

Tool names follow `simply_<topic>_<action>`, using snake_case so they work with every MCP client.
Arguments use the same names as the oclif flags, converted to snake_case (`source_dir`,
`effective_only`).

| Toolset       | Tool                                                        | Core function source      | Tier        | Org? | Status                |
| ------------- | ----------------------------------------------------------- | ------------------------- | ----------- | ---- | --------------------- |
| `apex`        | `simply_apex_execute`                                       | `simply-apex-core`        | write       | yes  | Implemented           |
| `apex`        | `simply_apex_trace_setup`                                   | `simply-apex-core`        | write       | yes  | Implemented           |
| `apex`        | `simply_apex_trace_silence`                                 | `simply-apex-core`        | write       | yes  | Implemented           |
| `apex`        | `simply_apex_logs_purge`                                    | `simply-apex-core`        | destructive | yes  | Implemented           |
| `apex`        | `simply_apex_test_suite_generate`                           | `simply-apex-core`        | read        | no   | Implemented           |
| `aep`         | `simply_aep_binding_list` / `_validate`                     | `simply-aep-core`         | read        | yes¹ | Implemented           |
| `aep`         | `simply_aep_domain_process_binding_list` / `_validate`      | `simply-aep-core`         | read        | yes¹ | Implemented           |
| `aep`         | `simply_aep_field_set_inclusion_list` / `_validate`         | `simply-aep-core`         | read        | yes¹ | Implemented           |
| `aep`         | `simply_aep_platform_event_subscription_list` / `_validate` | `simply-aep-core`         | read        | yes¹ | Implemented           |
| `package`     | `simply_package_version_get`                                | `simply-package-core`     | read        | no²  | Implemented           |
| `sobject`     | `simply_sobject_history_query`                              | `simply-sobject-core`     | read        | yes  | Waits on core (below) |
| `permissions` | `simply_permissions_analyze`                                | `simply-permissions-core` | read        | yes  | Waits on core (below) |
| `schema`      | `simply_schema_visualize`                                   | `simply-schema-core`      | read        | yes  | Waits on core (below) |
| `data`        | `simply_data_files_download`                                | `simply-data-core`        | read        | yes  | Waits on core (below) |
| `data`        | `simply_data_files_upload`                                  | `simply-data-core`        | write       | yes  | Waits on core (below) |

¹ Or local source: like the CLI commands, these read `source_dir` instead of an org when it's given.

² The draft said yes. `simply package version get` only reads `sfdx-project.json`; it never touches
an org or Dev Hub.

With the defaults (`--allow read`, all toolsets) the implemented set is 10 tools. Once the four
waiting toolsets land it becomes 14. These are left out of the first release on purpose:

- **`simply cicd *`.** These are pipeline stages driven by CI variables, not things an agent runs
  interactively. Much of their logic still lives in the plugin, not in `simply-cicd-core`.
- **`simply flow delete` / `flow version prune`.** When this doc was drafted there was no
  `simply-flow-core`. It has since shipped (simply-plugins-core's
  [0046](https://github.com/SimplySF/simply-plugins-core/blob/main/docs/design/0046-simply-flow-core.md),
  `@simplysf/simply-flow-core@0.1.0`, and [0048](0048-simply-flow-core.md) here), so these are
  unblocked. They become `simply_flow_delete` (`destructive`) and `simply_flow_version_prune`
  (`destructive`, with a `dry_run` argument), each a follow-up PR.
- **AT4DX `create`/`update`, `permissions build`, `schema generate`.** These write local source from
  structured input. Agents can already edit those files directly. Add them if usage shows a need.
- **`simply sobject deduplicate`, `permissions assignment delete`, `package version cleanup`,
  `community publish`, `settings *`, `project update api-version`.** These are destructive or rarely
  used. Each one can be added later, one per PR, once the tier gating has proven itself.

### Org resolution

Every tool that touches an org takes an optional `target_org` (alias or username) and an optional
`api_version`.

| `target_org` given? | Tier                   | Org used                                                                        |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| yes                 | any                    | That alias or username                                                          |
| no                  | `read`                 | The project's `target-org` config (`ConfigAggregator`, read from `--directory`) |
| no                  | `write`, `destructive` | Error: `target_org is required for tools that change an org.`                   |

Requiring an explicit org for any tool that changes an org means a changed default `target-org`
can't silently send a write to the wrong org.

The AEP tools also take `source_dir`. The CLI makes the caller pass exactly one of `--target-org` and
`--source-dir`. Here `source_dir` reads local source, `target_org` reads that org, and neither falls
back to the default org like any other `read` tool. Passing both is an error.

Auth comes from the same `~/.sfdx` / `~/.sf` state the CLI uses. The server never logs in. A user
who hasn't authorized an org runs `sf org login web` as usual.

**Connection cache.** The server keeps `Connection`s keyed by `username + apiVersion` for the life of
the process. If a call fails with `INVALID_SESSION_ID`, the server drops that entry, refreshes auth,
and retries the call once. If an alias can't be resolved, the server calls
`StateAggregator.clearInstance()` and retries once, so an org the user logs in to during the session
is found without restarting the server.

### Results

Each tool returns:

- `structuredContent`: the core function's result object, validated against the tool's
  `outputSchema`. The core result types are TypeScript types, not zod schemas, so each tool declares
  its `outputSchema` in zod. Row and issue shapes use `z.looseObject` with only their stable fields
  typed, so a field added in core doesn't break validation.
- one `text` block with a short summary of a few lines for clients that ignore structured content,
  for example `3 issue(s) in 41 binding(s) (2 error, 1 warning) (local).`

**Large results.** List tools take `limit` (default 200) and return `{ items, total, truncated }`.
The validate tools return their issues the same way, plus `recordCount`, `errorCount` and
`warningCount`. `simply_apex_logs_purge` lists only the failed deletions as `items`.
`simply_apex_execute` returns at most the last 100,000 characters of the debug log, with
`logsTruncated`; the end of the log is where execution finished or failed. Tools that produce files
(reports, CSV exports, downloads) return the absolute paths written and a row or file count, never
the file contents.

**Errors.** Core errors map to `isError: true` results whose text is the same message the CLI would
show, taken from the plugin's `messages/*.md` wording. Where that wording names a flag (`--end-date`),
it names the argument (`end_date`) instead. The error `code` goes in the result's
`_meta["simplysf/errorCode"]`, not in `structuredContent` as drafted: the SDK's client validates
`structuredContent` against the tool's `outputSchema` even on an error result, so an error shape there
would be rejected. Argument validation errors come from zod and name the argument. Unexpected
exceptions are reported the same way (code `unexpected-error`, stack on stderr) and never crash the
server. When `simply_apex_execute` fails at run time, the error text ends with the last 20,000
characters of the debug log, because the `System.debug` lines before an exception are usually what
the agent needs.

**Progress.** Long-running core calls send MCP progress notifications when the client provides a
progress token. Among the implemented tools, only `simply_apex_logs_purge` has a core progress
callback (`deleteApexLogsViaCollections`'s `onChunkComplete`), and it reports progress on the REST
path. The Bulk API path is one job with no intermediate progress. `files_download` and
`history_query` get progress when their toolsets land.

### Tool descriptions

Descriptions live in `packages/simply-sf-mcp/messages/*.md`, one file per toolset, and are written for
an agent, not copied from the CLI help. They say **when** to use the tool and what it returns, list
the related tools ("run `simply_aep_binding_list` first to see …"), and point generic work (deploy,
SOQL, tests) at `@salesforce/mcp`. The CLI help is written for people reading `--help`. A shared
source would serve neither audience well.

## Alternatives considered

- **A generic `run_sf_command` tool that shells out to `sf`.** This solves nothing: every call still
  pays the 11 s startup, and the agent still has to work out flags and parse text.
- **Contributing toolsets to `@salesforce/mcp`.** It is Salesforce's server with its own release
  cycle, and it has no supported way to load third-party toolsets (confirm). `simply`'s release
  cadence and AT4DX-specific tools don't belong there. Running both servers side by side is how MCP
  is meant to be used.
- **Generating one tool per oclif command by introspecting `static flags`.** This would cover all 82
  commands with no extra work per command. But it pulls oclif and every plugin into the server, ties
  tool arguments to `Flags.requiredOrg()` parsing, exposes CI-only commands, and uses help text
  written for people. Per-command wrappers over core are about 20–40 lines each, and every one is a
  deliberate decision.
- **Putting the server in `simply-plugins-core`.** That repo is meant to hold plain libraries with no
  front end (see 0026). An MCP server is a front end, like the plugins, so it belongs here. That also
  lets it use `simply-plugin-kit` where that helps.
- **Two meta tools (`search_tools`, `run_tool`) instead of registering every tool.** This keeps the
  tool list constant however many operations exist. But clients then can't show per-tool permission
  prompts or annotations, argument schemas are hidden until the agent searches, and every call costs
  an extra round-trip. Toolsets plus tiers keep the default list small (14 tools) without those
  costs. Revisit this if the list grows past about 40 tools.
- **Documentation only (a skill or an `AGENTS.md` section listing the commands).** This helps with
  discovery but does nothing for the startup cost, which is the main complaint.
- **Exposing `destructive` tools by default with a `confirm: true` argument.** Agents fill in
  `confirm: true` without hesitating, so it guards nothing. Not registering the tool is the only
  reliable gate. The client's own per-tool approval prompt handles the rest.

## Implementation plan

1. **Scaffold `packages/simply-sf-mcp`.** Copy the shape of `simply-plugin-kit`'s `package.json`
   (`type: module`, wireit scripts, `files: ["/lib", "/messages"]`), adding `bin: { "simply-sf-mcp":
"./bin/run.js" }`. Dependencies: `@modelcontextprotocol/sdk` (^1.32), `@salesforce/core`, `zod`,
   and the `-core` packages from the tools table. Add it to `pnpm-workspace.yaml`, the vitest
   projects and the lerna config. Do **not** add it to the `@simplysf/simply` orchestrator's
   `oclif.plugins`.
2. **`src/server.ts`**: parse CLI options, create an `McpServer`, call `registerToolsets(server,
options)`, and connect a `StdioServerTransport`. Nothing may write to stdout except the transport.
   Route all logging to stderr.
3. **`src/org/connectionCache.ts`**: `resolveConnection({ targetOrg, apiVersion, tier, directory })`,
   implementing the org resolution table, the cache and the retry-once rules.
4. **`src/tools/defineTool.ts`**: a helper that takes `{ name, toolset, tier, inputSchema,
outputSchema, summarize, run }`, applies the annotations from the tier table, and wraps `run` with
   error mapping and result shaping (`structuredContent` + summary text, `limit`/`truncated`).
5. **`src/tools/<toolset>.ts`**: one file per toolset (`apex`, `aep`, `sobject`, `permissions`,
   `package`, `schema`, `data`), each exporting its `defineTool` calls.
6. **`messages/simply.sf-mcp.<toolset>.md`**: the agent-facing descriptions.
7. **`test/tool-snapshot.json`**: the registered tool names, tiers and input schemas, checked in.
   The build regenerates it and CI's `git diff --exit-code` catches drift, as `command-snapshot.json`
   does for the plugins.
8. **Docs**: a package `README.md` with setup snippets for Claude Code, Codex and Cursor, the tier
   and toolset tables, and the tool list. Add a `site/` guide page and a sidebar entry in
   `site/astro.config.mjs`. It is not an oclif plugin, so `OTHER_PLUGIN_DIRS` does not apply. Add
   this doc to the index.

Any core function that needs a progress callback, or doesn't yet export the result type a tool
needs, gets that change in `simply-plugins-core` first, in its own PR and with its own version bump.

## Implementation notes

What implementing the first part taught us:

- **Five commands aren't thin wrappers yet.** The Problem section's premise holds for `apex`, `aep`
  and `package`, but not for these. Each keeps its orchestration in the plugin, and core has only a
  piece of it:

  | Command                 | Logic in the plugin                                                                  | What core has today                   |
  | ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------- |
  | `sobject history query` | ~200 lines: filter-file parsing, SOQL assembly, client-side filtering, CSV writing   | the filter schema and WHERE builder   |
  | `permissions analyze`   | ~290 lines: every query, package attribution, grouping                               | `buildPermissionsReportHtml` only     |
  | `schema visualize`      | ~740 lines: object and relationship discovery from source or org, CSV/HTML/MD output | `buildSchemaReportHtml` only          |
  | `data files download`   | ~160 lines: query, `p-queue` concurrency, API-budget check, CSV of results           | the single-file download/upload calls |
  | `data files upload`     | ~140 lines: CSV parsing, concurrency, API-budget check                               | the single-file download/upload calls |

  This doc's own rule applies: the logic moves into the `-core` package first, in its own
  simply-plugins-core PR with its own version bump, and the CLI command then becomes a thin wrapper.
  Only after that does the tool land here. Copying the logic into the server instead would leave two
  copies to keep in step, which is the problem splitting out the core packages was meant to solve.
  The `sobject`, `permissions`, `schema` and `data` toolsets are therefore not registered yet, and
  `--toolsets` rejects their names.

- **Plan steps that weren't needed.** `pnpm-workspace.yaml`, the root `vitest.config.ts` and
  `lerna.json` all glob `packages/*`, so the package needed no registration there. It did need adding
  to `eslint.config.mjs` (`allPackages` and `libraryPackages`), with a package-scoped
  `camelcase: { properties: 'never' }` override for the snake_case argument names. The site page is a
  top-level `mcp-server` page with its own sidebar entry; the site has no guides section outside
  `simply-cicd`.
- **Shape of the code.** `registerToolsets` became `selectTools(options)` (the filter) and
  `registerTool(server, tool, ...)` (the wrapper). The connection cache is a `ConnectionCache` class
  over an `OrgBackend` interface: `StateAggregator`, `Org` and `ConfigAggregator` in production, and
  an in-memory fake in tests. Both `ConfigAggregator` (for the default org) and `SfProject` (for
  `sfdx-project.json`) cache per path, so the server clears them before each read. A
  `sf config set target-org` or an edit to the project file made during a session is then seen
  without a restart.
- **The `INVALID_SESSION_ID` retry reruns the whole tool call**, not just the failing request,
  because the core functions take a `Connection` and make several calls. Every implemented `write`
  and `destructive` tool is safe to rerun: trace setup and silence find-or-update, and a log purge
  re-queries before deleting.
- **`simply_package_version_get` keeps the CLI's `directory` argument**, which means a package
  directory, while the server's `--directory` option means the project root. The tool description
  spells this out.
- **`simply_apex_execute` takes a `file`, as the CLI does.** The agent writes the script to a file
  first. An inline `code` argument would save that step; it's a candidate follow-up.

## Testing

Unit tests (`vitest`), using the SDK's in-memory transport with a real `Client` against the real
server and the core functions mocked:

- **Registration.** For each `--allow` tier and `--toolsets` combination, exactly the expected tools
  are listed, and each one has the right annotations. The tool snapshot pins names and schemas.
- **Org resolution.** An explicit `target_org` wins. A `read` tool falls back to the project config.
  A `write`/`destructive` tool without `target_org` returns the required-org error and never calls
  core.
- **Connection cache.** A second call reuses the connection. `INVALID_SESSION_ID` triggers exactly
  one refresh and retry. An unknown alias triggers exactly one `StateAggregator` reset.
- **Results.** Each tool's `structuredContent` passes its `outputSchema`. `limit` truncates and sets
  `truncated`. File-producing tools return paths and never file contents.
- **Errors.** Each core error class (`ApexExecuteError` `compile-failed`/`execute-failed`, AEP scan
  errors, …) becomes `isError` with the CLI's message text. An unexpected throw becomes `isError`,
  and the server keeps serving.
- **stdout hygiene.** Run the built `bin/run.js`, call one tool, and assert that every stdout line is
  valid JSON-RPC.

All of the above is implemented in `test/*.test.ts` (82 tests). `test/registration.test.ts` also
compares the listed tools with the committed `test/tool-snapshot.json`, so a stale snapshot fails
locally and not only in CI.

NUTs (`vitest.nuts.config.ts`, scratch org): spawn the built server over stdio and call
`simply_apex_execute` and `simply_aep_binding_list` against the scratch org. Two consecutive calls
show the second one skipping startup and auth: assert on wall time relative to the first call,
loosely, to avoid flakiness. (`simply_package_version_get` needs no org, and the stdout-hygiene unit
test already runs it through the built server.) **Not written yet**: they need a scratch org, and
they come with the next toolset.

## Open questions

- **Default `--allow` tier.** This doc proposes `read`. Defaulting to `write` would make
  `apex_execute`, the most useful single tool, available without configuration, at the cost of
  letting agents run DML in any org they name. Owner: maintainers.
- **Tool descriptions vs. CLI help.** This doc keeps them separate (see Tool descriptions). If they
  drift in substance (behavior, not wording), consider a lint that checks every tool's description
  mentions each of its arguments.
- **Remote (HTTP) transport.** It is out of scope. The server uses local auth state and local
  project files, so stdio is the right fit. Revisit only if there's a hosted use case.
