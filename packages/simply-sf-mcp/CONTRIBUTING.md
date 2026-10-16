# Contributing to @simplysf/simply-sf-mcp

The MCP server over the `simply-plugins-core` libraries. This package is part of the [`simply-plugins`](https://github.com/SimplySF/simply-plugins) monorepo, and its design is [0047](../../docs/design/0047-simply-sf-mcp-server.md).

**Start with the [root CONTRIBUTING.md](https://github.com/SimplySF/simply-plugins/blob/main/CONTRIBUTING.md).** It covers repository structure, environment setup, commit conventions, versioning and publishing, CI, git hooks, and the pull request process, all of which apply here. This file covers only what is specific to this package.

## Working on this package

Run from this directory to target just this package:

```sh
pnpm run build       # compile, regenerate test/tool-snapshot.json, lint
pnpm test            # the full gate CI runs
pnpm run test:only   # just the unit tests
```

To try the server by hand, build it and point an MCP client (or the [MCP Inspector](https://github.com/modelcontextprotocol/inspector)) at `node bin/run.js --directory <a DX project>`.

## This is not an oclif plugin

There are no commands, no `command-snapshot.json` and no generated README command reference. It isn't in the `@simplysf/simply` orchestrator's `oclif.plugins`. The README is written by hand and is the reference for the tools.

## Adding a tool

1. The work belongs in a `-core` package in `simply-plugins-core`. If the CLI command still keeps its logic in the plugin, move it to core first, in its own PR with its own version bump. A tool here should be a thin wrapper, like the CLI command.
2. Add a `defineTool(...)` to `src/tools/<toolset>.ts`. Pick the tier from what the tool does to the org (see the README); local file writes don't count. Name arguments after the CLI flags in snake_case.
3. Write the agent-facing description in `messages/simply.sf-mcp.<toolset>.md`, under the tool's name. Say when to use the tool and what it returns; don't copy the CLI help. Error wording goes under `error.*` and should match the CLI's.
4. A new toolset also needs an entry in `TOOLSETS` in `src/tiers.ts`, a messages file, and a line in `src/tools/index.ts`.
5. Run `pnpm run build` and commit the regenerated `test/tool-snapshot.json`. CI fails when it's stale.
6. Add tests against a real `Client` over the in-memory transport, with the core functions mocked (see `test/apex.test.ts`), and update the README's tool table.

## stdout is the protocol

Over stdio, stdout carries JSON-RPC and nothing else. Never write to it: log to stderr. `main` reroutes `console.log` to stderr to protect against dependencies, and `test/stdio.test.ts` runs the built server to check every stdout line parses.
