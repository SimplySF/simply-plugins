/*
 * Copyright (c) 2026, Clay Chipps.
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
import NotifyHappySoup from '../../../../../src/commands/simply/cicd/notify/happy-soup.js';

function okResponse(): Response {
  return { ok: true, status: 200, statusText: 'OK' } as Response;
}

function failResponse(status = 500, statusText = 'Internal Server Error'): Response {
  return { ok: false, status, statusText } as Response;
}

describe('notify happy-soup', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: string, options?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    fetchMock = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing if disabled', async () => {
    const result = await NotifyHappySoup.run([]);
    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a starting notification on before-script in default mode', async () => {
    await NotifyHappySoup.run([
      '--enabled',
      '--before-script',
      '--teams-webhook-url',
      'http://mock-webhook',
      '--ci-job-stage',
      'pre-destructive',
      '--ci-environment-name',
      'UAT',
      '--ci-commit-ref-name',
      'main',
      '--ci-pipeline-id',
      '123',
      '--ci-pipeline-url',
      'http://pipeline',
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('http://mock-webhook');
    const body = JSON.parse(options?.body as string) as { content: string };
    expect(body.content).toContain('Starting Stage');
    expect(body.content).toContain('pre-destructive');
  });

  it('sends a success notification on after-script in default mode', async () => {
    await NotifyHappySoup.run([
      '--enabled',
      '--after-script',
      '--teams-webhook-url',
      'http://mock-webhook',
      '--ci-job-stage',
      'post-deploy',
      '--ci-job-status',
      'success',
    ]);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options?.body as string) as { content: string };
    expect(body.content).toContain('Completed Stage');
    expect(body.content).toContain('post-deploy');
  });

  it('sends a failure notification on after-script in default mode', async () => {
    await NotifyHappySoup.run([
      '--enabled',
      '--after-script',
      '--teams-webhook-url',
      'http://mock-webhook',
      '--ci-job-stage',
      'post-deploy',
      '--ci-job-status',
      'failed',
    ]);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options?.body as string) as { content: string };
    expect(body.content).toContain('Failed Stage');
    expect(body.content).toContain('post-deploy');
  });

  it('skips an intermediate after-script notification when notify-on-completion is set but is-final-job is not', async () => {
    const result = await NotifyHappySoup.run([
      '--enabled',
      '--notify-on-completion',
      '--after-script',
      '--teams-webhook-url',
      'http://mock-webhook',
    ]);

    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips a before-script notification when notify-on-completion is set', async () => {
    const result = await NotifyHappySoup.run([
      '--enabled',
      '--notify-on-completion',
      '--is-final-job',
      '--before-script',
      '--teams-webhook-url',
      'http://mock-webhook',
    ]);

    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends a final success notification on completion', async () => {
    await NotifyHappySoup.run([
      '--enabled',
      '--notify-on-completion',
      '--is-final-job',
      '--after-script',
      '--teams-webhook-url',
      'http://mock-webhook',
      '--ci-job-stage',
      'deployment-close-out',
      '--ci-job-status',
      'success',
    ]);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options?.body as string) as { content: string };
    expect(body.content).toContain('Happy Soup Deployment');
    expect(body.content).toContain('Completed');
  });

  it('sends a final failure notification on completion', async () => {
    await NotifyHappySoup.run([
      '--enabled',
      '--notify-on-completion',
      '--is-final-job',
      '--after-script',
      '--teams-webhook-url',
      'http://mock-webhook',
      '--ci-job-stage',
      'deployment-close-out',
      '--ci-job-status',
      'failed',
    ]);

    const [, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options?.body as string) as { content: string };
    expect(body.content).toContain('Happy Soup Deployment');
    expect(body.content).toContain('Failed');
  });

  it('throws if sending fails during after-script', async () => {
    fetchMock.mockResolvedValueOnce(failResponse());

    await expect(
      NotifyHappySoup.run([
        '--enabled',
        '--after-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-status',
        'failed',
      ]),
    ).rejects.toThrow(/Failed to send 1 notification/);
  });

  it('throws if neither before-script nor after-script is specified', async () => {
    await expect(NotifyHappySoup.run(['--enabled'])).rejects.toThrow(/before-script.*after-script/);
  });

  it('sends notifications to multiple webhooks successfully', async () => {
    await NotifyHappySoup.run([
      '--enabled',
      '--after-script',
      '--teams-webhook-url',
      'http://mock-webhook-1',
      '--teams-webhook-url',
      'http://mock-webhook-2',
      '--ci-job-status',
      'success',
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith('http://mock-webhook-1', expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith('http://mock-webhook-2', expect.any(Object));
  });

  it('throws describing the failed webhook when one of several fails', async () => {
    fetchMock.mockImplementation((url) =>
      Promise.resolve(url === 'http://mock-webhook-2' ? failResponse() : okResponse()),
    );

    await expect(
      NotifyHappySoup.run([
        '--enabled',
        '--after-script',
        '--teams-webhook-url',
        'http://mock-webhook-1',
        '--teams-webhook-url',
        'http://mock-webhook-2',
        '--ci-job-status',
        'success',
      ]),
    ).rejects.toThrow(/http:\/\/mock-webhook-2/);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
