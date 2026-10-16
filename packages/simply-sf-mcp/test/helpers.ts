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
import os from 'node:os';
import path from 'node:path';
import type { Connection } from '@salesforce/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { vi, type Mock } from 'vitest';
import type { OrgBackend, OrgHandle } from '../src/org/connectionCache.js';
import { createServer } from '../src/server.js';
import { TOOLSETS, type Tier, type Toolset } from '../src/tiers.js';
import { ERROR_CODE_META_KEY } from '../src/tools/defineTool.js';

/** A stand-in `Connection`: tests only ever compare it by identity or read its username. */
export function fakeConnection(username: string, apiVersion?: string): Connection {
  return { getUsername: () => username, apiVersion } as unknown as Connection;
}

/**
 * A backend over an in-memory auth state. `aliases` maps alias to username; `orgs` lists the
 * usernames with auth. `defaultOrg` is the project's `target-org`.
 */
export function fakeBackend(
  state: { aliases?: Record<string, string>; orgs?: string[]; defaultOrg?: string } = {},
): OrgBackend & {
  loadOrg: Mock<(username: string) => Promise<OrgHandle>>;
  resetState: Mock<() => Promise<void>>;
  refreshAuth: Mock<() => Promise<unknown>>;
} {
  const refreshAuth = vi.fn(async (): Promise<unknown> => undefined);
  const loadOrg = vi.fn(async (username: string): Promise<OrgHandle> => {
    if (!(state.orgs ?? []).includes(username)) {
      throw Object.assign(new Error(`No authorization information found for ${username}.`), {
        name: 'NamedOrgNotFoundError',
      });
    }
    return { getConnection: (apiVersion?: string) => fakeConnection(username, apiVersion), refreshAuth };
  });
  return {
    resolveUsername: async (aliasOrUsername) => state.aliases?.[aliasOrUsername] ?? aliasOrUsername,
    loadOrg,
    defaultTargetOrg: async () => state.defaultOrg,
    resetState: vi.fn(async (): Promise<void> => undefined),
    refreshAuth,
  };
}

export type Harness = {
  client: Client;
  /** @returns The tool's result; never throws for an `isError` result. */
  call(name: string, args?: Record<string, unknown>, onProgress?: (progress: number) => void): Promise<CallToolResult>;
  close(): Promise<void>;
};

/** Connects a real MCP client to a real server over the SDK's in-memory transport. */
export async function connect(
  options: { directory?: string; toolsets?: Toolset[]; allow?: Tier; backend?: OrgBackend } = {},
): Promise<Harness> {
  const server = createServer(
    {
      directory: options.directory ?? process.cwd(),
      toolsets: options.toolsets ?? [...TOOLSETS],
      allow: options.allow ?? 'destructive',
    },
    options.backend ?? fakeBackend(),
  );
  const client = new Client({ name: 'test', version: '0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    async call(name, args = {}, onProgress) {
      return (await client.callTool(
        { name, arguments: args },
        undefined,
        onProgress ? { onprogress: ({ progress }) => onProgress(progress) } : undefined,
      )) as CallToolResult;
    },
    close: () => client.close(),
  };
}

/** @returns The text of a result's single text block. */
export function textOf(result: CallToolResult): string {
  const block = result.content[0];
  return block?.type === 'text' ? block.text : '';
}

/** @returns An error result's code, from `_meta`. */
export function errorCodeOf(result: CallToolResult): unknown {
  // eslint-disable-next-line no-underscore-dangle -- `_meta` is the MCP protocol's own field name
  return result._meta?.[ERROR_CODE_META_KEY];
}

/** @returns A new empty directory, removed by the returned cleanup. */
export function tempDir(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sf-mcp-'));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
