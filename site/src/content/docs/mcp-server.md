---
title: MCP Server
description: simply-sf-mcp, an MCP server that gives coding agents direct access to Simply's Salesforce tooling.
---

`@simplysf/simply-sf-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server for coding agents such as Claude Code, Codex and Cursor. Its tools call the same libraries as the `sf simply` commands, without starting the Salesforce CLI for every call. The server starts once per agent session and reuses org connections between calls.

It complements Salesforce's own DX MCP server, [`@salesforce/mcp`](https://www.npmjs.com/package/@salesforce/mcp), which covers generic org work such as deploy, retrieve, SOQL and running tests. Run both side by side.

## Set it up

The server uses your Salesforce CLI org authorizations; log in with `sf org login web` as usual.

For Claude Code:

```sh
claude mcp add simply -- npx -y @simplysf/simply-sf-mcp
```

For any client that reads an `mcpServers` JSON file (Claude Code's `.mcp.json`, Cursor's `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "simply": { "command": "npx", "args": ["-y", "@simplysf/simply-sf-mcp", "--toolsets", "apex,aep"] }
  }
}
```

For a user-wide configuration, add `--directory /path/to/project` so the server knows which project to read.

## Options

| Option        | Default                         | Meaning                                                                                                   |
| ------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--directory` | the process's working directory | The Salesforce DX project root. Relative paths and the default org resolve against it.                    |
| `--toolsets`  | all toolsets                    | Comma-separated: `apex`, `aep`, `package`.                                                                |
| `--allow`     | `read`                          | Highest permission tier to register: `read`, `write` or `destructive`. Tools above it are not registered. |

The tier describes what a tool does to the org. `read` tools only read. `write` tools add or update, and `simply_apex_execute` is among them because anonymous Apex can change data. `destructive` tools delete. Tools that change an org always need an explicit `target_org`, so a changed default org can't receive a write by accident. Read-only tools fall back to the project's default org.

## Tools

| Toolset   | Tools                                                                                                                                                                        | Tier                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `apex`    | `simply_apex_execute`, `simply_apex_trace_setup`, `simply_apex_trace_silence`, `simply_apex_logs_purge`, `simply_apex_test_suite_generate`                                   | write, write, write, destructive, read |
| `aep`     | `simply_aep_binding_*`, `simply_aep_domain_process_binding_*`, `simply_aep_field_set_inclusion_*`, `simply_aep_platform_event_subscription_*` (each `_list` and `_validate`) | read                                   |
| `package` | `simply_package_version_get`                                                                                                                                                 | read                                   |

With the defaults that is 10 read-only tools. See the [package README](https://github.com/SimplySF/simply-plugins/tree/main/packages/simply-sf-mcp#readme) for the full reference.
