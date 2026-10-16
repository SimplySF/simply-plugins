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

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { tempDir } from './helpers.js';

const runJs = fileURLToPath(new URL('../bin/run.js', import.meta.url));

/** Sends `messages` to the built server, closes stdin, and collects what it wrote. */
async function exchange(
  args: string[],
  messages: unknown[],
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  const child = spawn(process.execPath, [runJs, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
  child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));

  const responded = new Promise<void>((resolve) => {
    child.stdout.on('data', () => {
      if (stdout.includes('"id":2')) resolve();
    });
  });
  for (const message of messages) child.stdin.write(`${JSON.stringify(message)}\n`);
  await responded;
  child.stdin.end();

  const code = await new Promise<number | null>((resolve) => child.on('close', resolve));
  return { stdout, stderr, code };
}

describe('the built server over stdio', () => {
  let dir: string;
  let cleanup: () => void;

  beforeEach(() => ({ dir, cleanup } = tempDir()));
  afterEach(() => cleanup());

  it('writes nothing but JSON-RPC to stdout', async () => {
    fs.writeFileSync(
      path.join(dir, 'sfdx-project.json'),
      JSON.stringify({
        packageDirectories: [{ path: 'force-app', package: 'app', versionNumber: '1.0.0.NEXT', default: true }],
      }),
    );

    const { stdout, stderr } = await exchange(
      ['--directory', dir, '--toolsets', 'package'],
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
        },
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'simply_package_version_get', arguments: { package: 'app' } },
        },
      ],
    );

    const lines = stdout.split('\n').filter((line) => line.length > 0);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    for (const line of lines) {
      expect(JSON.parse(line)).toMatchObject({ jsonrpc: '2.0' });
    }
    const call = lines.map((line) => JSON.parse(line) as { id?: number; result?: unknown }).find((m) => m.id === 2);
    expect(call?.result).toMatchObject({ structuredContent: { package: 'app', packageDirectory: 'force-app' } });
    expect(stderr).toContain('simply-sf-mcp');
  }, 60_000);

  it('rejects a bad option on stderr with exit code 2', async () => {
    const child = spawn(process.execPath, [runJs, '--allow', 'everything'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
    const code = await new Promise<number | null>((resolve) => child.on('close', resolve));

    expect(code).toBe(2);
    expect(stdout).toBe('');
    expect(stderr).toContain('Unknown --allow tier: everything');
  }, 60_000);
});
