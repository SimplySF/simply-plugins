/*
 * Copyright (c) 2026, Clay Chipps; Copyright (c) 2026 Salesforce, Inc.
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import NotifyTeams from '../../../../../src/commands/simply/cicd/notify/teams.js';

describe('notify teams', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: string, options?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi
      .fn<(url: string, options?: RequestInit) => Promise<Response>>()
      .mockResolvedValue({ ok: true, status: 200, statusText: 'OK' } as Response);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing if disabled', async () => {
    const result = await NotifyTeams.run(['--payload', '{"text":"hi"}', '--webhook-url', 'http://mock-webhook']);
    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires --payload and --webhook-url to take real values (not bare presence flags)', async () => {
    await expect(NotifyTeams.run(['--enabled', '--webhook-url', 'http://mock-webhook'])).rejects.toThrow(/payload/i);
    await expect(NotifyTeams.run(['--enabled', '--payload', '{}'])).rejects.toThrow(/webhook-url/i);
  });

  it('sends the raw payload as-is to the webhook URL', async () => {
    const result = await NotifyTeams.run([
      '--enabled',
      '--payload',
      '{"text":"hello"}',
      '--webhook-url',
      'http://mock-webhook',
    ]);

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://mock-webhook');
    expect(options?.body).toBe('{"text":"hello"}');
    expect(options?.method).toBe('POST');
  });

  it('throws when the webhook responds with a non-OK status', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' } as Response);

    await expect(
      NotifyTeams.run(['--enabled', '--payload', '{}', '--webhook-url', 'http://mock-webhook']),
    ).rejects.toThrow(/Failed to send 1 notification/);
  });
});
