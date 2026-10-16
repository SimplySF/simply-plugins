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

// Writes test/tool-snapshot.json: every tool's name, toolset, tier, annotations and input schema,
// exactly as a client lists them with every toolset and tier allowed. The build runs this and CI's
// `git diff --exit-code` catches an uncommitted change, as command-snapshot.json does for the plugins.

import fs from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ALL_TOOLS, createServer, TOOLSETS } from '../lib/index.js';

const server = createServer({ directory: process.cwd(), toolsets: [...TOOLSETS], allow: 'destructive' });
const client = new Client({ name: 'tool-snapshot', version: '0' });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

const { tools } = await client.listTools();
await client.close();

const byName = new Map(ALL_TOOLS.map((tool) => [tool.name, tool]));
const snapshot = tools
  .map((tool) => ({
    name: tool.name,
    toolset: byName.get(tool.name).toolset,
    tier: byName.get(tool.name).tier,
    annotations: tool.annotations,
    inputSchema: tool.inputSchema,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(new URL('../test/tool-snapshot.json', import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
