# @simplysf/simply-sf-mcp

An [MCP](https://modelcontextprotocol.io) server that gives coding agents (Claude Code, Codex, Cursor and others) direct access to SimplySF's Salesforce tooling. The tools call the same `simply-plugins-core` libraries as the `sf simply` CLI plugins, without starting `sf` for every call.

The server is one long-running process per agent session. It starts once and reuses org connections between calls, so it skips the ~10 s CLI startup and auth lookup that every `sf simply ...` command pays.

It complements Salesforce's own DX MCP server, [`@salesforce/mcp`](https://www.npmjs.com/package/@salesforce/mcp), which covers generic org work (deploy, retrieve, SOQL, running tests). Run both side by side.

## Setup

The server uses the same org authorizations as the Salesforce CLI. Log in with `sf org login web` as usual; the server never logs in itself.

### Claude Code

```sh
claude mcp add simply -- npx -y @simplysf/simply-sf-mcp
```

Or commit a `.mcp.json` at the project root:

```json
{
  "mcpServers": {
    "simply": { "command": "npx", "args": ["-y", "@simplysf/simply-sf-mcp", "--toolsets", "apex,aep"] }
  }
}
```

### Codex

In `~/.codex/config.toml`:

```toml
[mcp_servers.simply]
command = "npx"
args = ["-y", "@simplysf/simply-sf-mcp", "--directory", "/path/to/project"]
```

### Cursor

In `.cursor/mcp.json` at the project root, or `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "simply": { "command": "npx", "args": ["-y", "@simplysf/simply-sf-mcp"] }
  }
}
```

On Windows, some clients can't start `npx` directly because it's a `.cmd` shim. If the server doesn't start, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "@simplysf/simply-sf-mcp"]`.

## Options

```
simply-sf-mcp [--directory <project>] [--toolsets <a,b,...>] [--allow <tier>]
```

| Option        | Default                         | Meaning                                                                                                   |
| ------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--directory` | the process's working directory | The Salesforce DX project root. Relative path arguments resolve against it, and so does the default org.  |
| `--toolsets`  | all toolsets                    | Comma-separated list from the table below. Only tools in these toolsets are registered.                   |
| `--allow`     | `read`                          | Highest permission tier to register: `read`, `write` or `destructive`. Tools above it are not registered. |

If the client configuration is user-wide rather than in the project, pass `--directory`. Otherwise the server reads whatever directory the client happens to start it in.

Tools that are filtered out are not registered at all. An agent never sees a tool it can't use, and unused tools don't take up its context.

## Permission tiers

The tier describes what a tool does to the org. Writing local files (a generated test suite, for example) doesn't raise it, because those changes show up in the agent's diff and are easy to undo.

| Tier          | Meaning                                                                     |
| ------------- | --------------------------------------------------------------------------- |
| `read`        | Reads the org and/or the local project only.                                |
| `write`       | Changes the org, but adds or updates rather than removing (or is undoable). |
| `destructive` | Deletes or overwrites data or metadata in the org.                          |

Tools are annotated for the client to match (`readOnlyHint`, `destructiveHint`), so a client that asks before risky calls can do so.

`--allow write` is a real trust decision: it registers `simply_apex_execute`, and anonymous Apex can insert, update and delete records in any org the agent names.

## Choosing the org

Every tool that touches an org takes an optional `target_org` (alias or username) and `api_version`.

- An explicit `target_org` always wins.
- A `read` tool without one uses the project's `target-org` config (`sf config set target-org ...`), read from `--directory`.
- A `write` or `destructive` tool without one fails with `target_org is required for tools that change an org.` A changed default org can't silently send a write to the wrong org.

An org the user logs in to while the server runs is found without restarting it. An expired session is refreshed and the call retried once.

## Tools

| Toolset   | Tool                                              | Tier        | Org? |
| --------- | ------------------------------------------------- | ----------- | ---- |
| `apex`    | `simply_apex_execute`                             | write       | yes  |
| `apex`    | `simply_apex_trace_setup`                         | write       | yes  |
| `apex`    | `simply_apex_trace_silence`                       | write       | yes  |
| `apex`    | `simply_apex_logs_purge`                          | destructive | yes  |
| `apex`    | `simply_apex_test_suite_generate`                 | read        | no   |
| `aep`     | `simply_aep_binding_list`                         | read        | yes¹ |
| `aep`     | `simply_aep_binding_validate`                     | read        | yes¹ |
| `aep`     | `simply_aep_domain_process_binding_list`          | read        | yes¹ |
| `aep`     | `simply_aep_domain_process_binding_validate`      | read        | yes¹ |
| `aep`     | `simply_aep_field_set_inclusion_list`             | read        | yes¹ |
| `aep`     | `simply_aep_field_set_inclusion_validate`         | read        | yes¹ |
| `aep`     | `simply_aep_platform_event_subscription_list`     | read        | yes¹ |
| `aep`     | `simply_aep_platform_event_subscription_validate` | read        | yes¹ |
| `package` | `simply_package_version_get`                      | read        | no   |

¹ Or local source, with `source_dir` instead of `target_org`.

With the defaults (`--allow read`, every toolset) that is 10 tools.

Each tool returns its result as structured content, plus a one-line summary for clients that ignore structured content. List results are capped by `limit` (default 200) and report `total` and `truncated`. Errors come back as error results with the same wording as the CLI, and a stable code under `_meta["simplysf/errorCode"]`.

## Issues

Please report bugs or request features by [opening an issue](https://github.com/SimplySF/simply-plugins/issues).
