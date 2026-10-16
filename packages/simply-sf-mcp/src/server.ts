/*
 * Copyright (c) 2026, SimplySF.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConnectionCache, type OrgBackend } from './org/connectionCache.js';
import { OptionsError, parseOptions, USAGE, type ServerOptions } from './options.js';
import { registerTool } from './tools/defineTool.js';
import { selectTools } from './tools/index.js';

export const SERVER_NAME = 'simply-sf-mcp';

/** @returns This package's version, for the MCP handshake and `--version`. */
export function serverVersion(): string {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  return packageJson.version;
}

const INSTRUCTIONS =
  'Tools for SimplySF Salesforce work: anonymous Apex, debug log trace flags, AT4DX (Apex Enterprise ' +
  'Patterns) custom metadata, and sfdx-project.json package versions. For generic Salesforce DX work ' +
  "(deploy, retrieve, SOQL queries, running tests) use Salesforce's own DX MCP server, @salesforce/mcp. " +
  'Tools that change an org require an explicit target_org.';

/**
 * @param options - What the server was started with.
 * @param orgBackend - Replaces the real `~/.sf` auth and config state, for tests.
 * @returns A server with the selected tools registered, not yet connected to a transport.
 */
export function createServer(options: ServerOptions, orgBackend?: OrgBackend): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: serverVersion() }, { instructions: INSTRUCTIONS });
  const connections = new ConnectionCache(options.directory, orgBackend);
  for (const tool of selectTools(options)) {
    registerTool(server, tool, { directory: options.directory, connections });
  }
  return server;
}

/**
 * Runs the server over stdio. stdout carries only JSON-RPC, so everything else, including stray
 * `console.log` calls from dependencies, goes to stderr.
 *
 * @returns The process exit code when the server doesn't start; otherwise it runs until stdin closes.
 */
export async function main(argv: string[]): Promise<number | undefined> {
  let options: ReturnType<typeof parseOptions>;
  try {
    options = parseOptions(argv);
  } catch (error) {
    if (!(error instanceof OptionsError)) throw error;
    process.stderr.write(`${error.message}\n\n${USAGE}\n`);
    return 2;
  }
  if (options === 'help') {
    process.stderr.write(`${USAGE}\n`);
    return 0;
  }
  if (options === 'version') {
    process.stderr.write(`${serverVersion()}\n`);
    return 0;
  }

  /* eslint-disable no-console -- rerouted, not called */
  console.log = console.error;
  console.info = console.error;
  console.debug = console.error;
  /* eslint-enable no-console */

  const server = createServer(options);
  await server.connect(new StdioServerTransport());
  process.stderr.write(
    `${SERVER_NAME} ${serverVersion()} serving ${options.directory} ` +
      `(toolsets: ${options.toolsets.join(', ')}; allow: ${options.allow})\n`,
  );
  return undefined;
}
