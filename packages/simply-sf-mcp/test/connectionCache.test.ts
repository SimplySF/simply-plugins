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

import { describe, expect, it } from 'vitest';
import { ConnectionCache } from '../src/org/connectionCache.js';
import { ToolError } from '../src/toolError.js';
import { fakeBackend } from './helpers.js';

const DIRECTORY = '/project';

describe('ConnectionCache: org resolution', () => {
  const backend = fakeBackend({
    aliases: { dev: 'dev@example.com', other: 'other@example.com' },
    orgs: ['dev@example.com', 'other@example.com'],
    defaultOrg: 'other',
  });

  it('uses an explicit target_org for any tier', async () => {
    const cache = new ConnectionCache(DIRECTORY, backend);
    const resolved = await Promise.all(
      (['read', 'write', 'destructive'] as const).map((tier) => cache.resolve({ targetOrg: 'dev', tier })),
    );
    for (const { connection } of resolved) {
      expect(connection.getUsername()).toBe('dev@example.com');
    }
  });

  it("falls back to the project's target-org for a read tool", async () => {
    const { connection } = await new ConnectionCache(DIRECTORY, backend).resolve({ tier: 'read' });
    expect(connection.getUsername()).toBe('other@example.com');
  });

  it.each(['write', 'destructive'] as const)('requires target_org for a %s tool', async (tier) => {
    const isolated = fakeBackend({ orgs: ['other@example.com'], defaultOrg: 'other@example.com' });
    const cache = new ConnectionCache(DIRECTORY, isolated);
    await expect(cache.resolve({ tier })).rejects.toThrow(
      new ToolError('target-org-required', 'target_org is required for tools that change an org.'),
    );
    expect(isolated.loadOrg).not.toHaveBeenCalled();
  });

  it('says how to fix a missing default org', async () => {
    const cache = new ConnectionCache(DIRECTORY, fakeBackend({ orgs: [] }));
    await expect(cache.resolve({ tier: 'read' })).rejects.toMatchObject({
      code: 'no-default-org',
      message: expect.stringContaining('sf config set target-org') as unknown,
    });
  });
});

describe('ConnectionCache: caching', () => {
  it('reuses one connection per username and API version', async () => {
    const backend = fakeBackend({ aliases: { dev: 'dev@example.com' }, orgs: ['dev@example.com'] });
    const cache = new ConnectionCache(DIRECTORY, backend);

    const first = await cache.resolve({ targetOrg: 'dev', tier: 'read' });
    const byUsername = await cache.resolve({ targetOrg: 'dev@example.com', tier: 'write' });
    const otherVersion = await cache.resolve({ targetOrg: 'dev', apiVersion: '61.0', tier: 'read' });

    expect(byUsername.connection).toBe(first.connection);
    expect(otherVersion.connection).not.toBe(first.connection);
    expect(backend.loadOrg).toHaveBeenCalledTimes(2);
  });

  it('refreshes auth exactly once for an invalidated entry', async () => {
    const backend = fakeBackend({ orgs: ['dev@example.com'] });
    const cache = new ConnectionCache(DIRECTORY, backend);

    const first = await cache.resolve({ targetOrg: 'dev@example.com', tier: 'read' });
    cache.invalidate(first.key);
    const second = await cache.resolve({ targetOrg: 'dev@example.com', tier: 'read' });
    await cache.resolve({ targetOrg: 'dev@example.com', tier: 'read' });

    expect(second.connection).not.toBe(first.connection);
    expect(backend.refreshAuth).toHaveBeenCalledTimes(1);
    expect(backend.loadOrg).toHaveBeenCalledTimes(2);
  });

  it('does not cache a failed connection', async () => {
    const state = { orgs: [] as string[] };
    const backend = fakeBackend(state);
    const cache = new ConnectionCache(DIRECTORY, backend);

    await expect(cache.resolve({ targetOrg: 'late@example.com', tier: 'read' })).rejects.toThrow(ToolError);
    state.orgs.push('late@example.com');
    const { connection } = await cache.resolve({ targetOrg: 'late@example.com', tier: 'read' });
    expect(connection.getUsername()).toBe('late@example.com');
  });
});

describe('ConnectionCache: unknown orgs', () => {
  it('resets the auth state exactly once, then finds an org logged in to since startup', async () => {
    const state = { aliases: {} as Record<string, string>, orgs: [] as string[] };
    const backend = fakeBackend(state);
    backend.resetState.mockImplementation(async () => {
      // What `sf org login web --alias new` does while the server is running.
      state.aliases.new = 'new@example.com';
      state.orgs.push('new@example.com');
    });

    const { connection } = await new ConnectionCache(DIRECTORY, backend).resolve({ targetOrg: 'new', tier: 'read' });

    expect(connection.getUsername()).toBe('new@example.com');
    expect(backend.resetState).toHaveBeenCalledTimes(1);
  });

  it('gives up after one reset with the login command to run', async () => {
    const backend = fakeBackend();
    const resolving = new ConnectionCache(DIRECTORY, backend).resolve({ targetOrg: 'ghost', tier: 'read' });

    await expect(resolving).rejects.toMatchObject({
      code: 'org-not-found',
      message: expect.stringContaining('sf org login web --alias ghost') as unknown,
    });
    expect(backend.resetState).toHaveBeenCalledTimes(1);
    expect(backend.loadOrg).toHaveBeenCalledTimes(2);
  });

  it('passes through errors other than a missing org without resetting', async () => {
    const backend = fakeBackend();
    backend.loadOrg.mockRejectedValueOnce(new Error('disk on fire'));

    await expect(
      new ConnectionCache(DIRECTORY, backend).resolve({ targetOrg: 'x@example.com', tier: 'read' }),
    ).rejects.toThrow('disk on fire');
    expect(backend.resetState).not.toHaveBeenCalled();
  });
});
