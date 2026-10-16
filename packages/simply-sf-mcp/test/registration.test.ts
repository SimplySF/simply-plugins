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
import { describe, expect, it } from 'vitest';
import { TOOLSETS, type Tier, type Toolset } from '../src/tiers.js';
import { connect } from './helpers.js';

type SnapshotEntry = {
  name: string;
  toolset: Toolset;
  tier: Tier;
  annotations: Record<string, unknown>;
  inputSchema: unknown;
};

const snapshot = JSON.parse(fs.readFileSync(new URL('tool-snapshot.json', import.meta.url), 'utf8')) as SnapshotEntry[];

async function listedNames(options: { toolsets?: Toolset[]; allow?: Tier }): Promise<string[]> {
  const harness = await connect(options);
  const { tools } = await harness.client.listTools();
  await harness.close();
  return tools.map((tool) => tool.name).sort();
}

describe('tool registration', () => {
  it('lists exactly the snapshot, with its annotations and input schemas, when everything is allowed', async () => {
    const harness = await connect({ allow: 'destructive' });
    const { tools } = await harness.client.listTools();
    await harness.close();

    const listed = tools
      .map((tool) => ({ name: tool.name, annotations: tool.annotations, inputSchema: tool.inputSchema }))
      .sort((a, b) => a.name.localeCompare(b.name));
    // A failure here means a tool changed: run `pnpm run build` to regenerate the snapshot and commit it.
    expect(listed).toStrictEqual(
      snapshot.map(({ name, annotations, inputSchema }) => ({ name, annotations, inputSchema })),
    );
  });

  const tiers: Tier[] = ['read', 'write', 'destructive'];
  const rank = (tier: Tier): number => tiers.indexOf(tier);

  it.each(tiers)('--allow %s registers every tool at or below that tier and nothing above it', async (allow) => {
    const expected = snapshot
      .filter((tool) => rank(tool.tier) <= rank(allow))
      .map((tool) => tool.name)
      .sort();
    expect(await listedNames({ allow })).toStrictEqual(expected);
  });

  it.each(TOOLSETS.map((toolset) => [toolset]))('--toolsets %s registers only that toolset', async (toolset) => {
    const expected = snapshot
      .filter((tool) => tool.toolset === toolset)
      .map((tool) => tool.name)
      .sort();
    expect(await listedNames({ toolsets: [toolset], allow: 'destructive' })).toStrictEqual(expected);
  });

  it('combines the filters', async () => {
    expect(await listedNames({ toolsets: ['apex'], allow: 'read' })).toStrictEqual(['simply_apex_test_suite_generate']);
  });

  it('registers ten read-only tools by default', async () => {
    expect(await listedNames({ allow: 'read' })).toHaveLength(10);
  });

  it.each([
    ['read', { readOnlyHint: true }],
    ['write', { readOnlyHint: false, destructiveHint: false }],
    ['destructive', { readOnlyHint: false, destructiveHint: true }],
  ] as const)('annotates %s tools from the tier table', (tier, hints) => {
    for (const tool of snapshot.filter((entry) => entry.tier === tier)) {
      expect(tool.annotations).toMatchObject(hints);
    }
  });

  it('names every tool simply_<toolset>_<action> in snake_case', () => {
    for (const tool of snapshot) {
      expect(tool.name).toMatch(new RegExp(`^simply_${tool.toolset}_[a-z0-9_]+$`));
    }
  });

  it('gives every org tool optional target_org and api_version arguments', () => {
    for (const tool of snapshot) {
      const schema = tool.inputSchema as { properties: Record<string, unknown>; required?: string[] };
      if (!('target_org' in schema.properties)) continue;
      expect(schema.properties).toHaveProperty('api_version');
      expect(schema.required ?? []).not.toContain('target_org');
    }
  });
});
