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

import { promises as fsPromises } from 'node:fs';
import { execa } from 'execa';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readSfdxProject } from '@simplysf/simply-core';
import { appendToEnvFile } from '../../../../../src/common/env.js';
import NotifyProject from '../../../../../src/commands/simply/cicd/notify/project.js';

vi.mock('execa');
vi.mock('@simplysf/simply-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@simplysf/simply-core')>();
  return { ...actual, readSfdxProject: vi.fn() };
});
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn(), writeFile: vi.fn() } };
});
vi.mock('../../../../../src/common/env.js', () => ({ appendToEnvFile: vi.fn() }));

function okResponse(): Response {
  return { ok: true, status: 200, statusText: 'OK' } as Response;
}

describe('notify project', () => {
  let fetchMock: ReturnType<typeof vi.fn<(url: string, options?: RequestInit) => Promise<Response>>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined);
    fetchMock = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>().mockResolvedValue(okResponse());
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does nothing if disabled', async () => {
    const result = await NotifyProject.run(['--before-script']);
    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws if no teams webhook URL is provided', async () => {
    await expect(NotifyProject.run(['--enabled', '--after-script'])).rejects.toThrow(/teams-webhook-url/i);
  });

  it('throws if neither before-script nor after-script is specified', async () => {
    await expect(NotifyProject.run(['--enabled', '--teams-webhook-url', 'http://mock-webhook'])).rejects.toThrow(
      /before-script.*after-script/,
    );
  });

  describe('before-script', () => {
    it('does nothing outside the pre-destructive stage', async () => {
      await NotifyProject.run([
        '--enabled',
        '--before-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-stage',
        'post-deploy',
      ]);

      expect(fsPromises.writeFile).not.toHaveBeenCalled();
      expect(appendToEnvFile).not.toHaveBeenCalled();
    });

    it('does nothing when the job was canceled', async () => {
      await NotifyProject.run([
        '--enabled',
        '--before-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-stage',
        'pre-destructive',
        '--ci-job-status',
        'canceled',
      ]);

      expect(fsPromises.writeFile).not.toHaveBeenCalled();
    });

    it('records N/A versions when org credentials are missing', async () => {
      vi.mocked(execa).mockResolvedValue({ stdout: '' } as never);

      await NotifyProject.run([
        '--enabled',
        '--before-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-stage',
        'pre-destructive',
      ]);

      expect(fsPromises.writeFile).toHaveBeenCalledWith(
        'project-build.env',
        expect.stringContaining('CREATED_BY_JOB_NAME='),
      );
      expect(appendToEnvFile).toHaveBeenCalledWith(
        'project-build.env',
        { PREV_INSTALLED_PACKAGE_VERSION: 'N/A', TARGET_PACKAGE_VERSION: 'N/A' },
        expect.anything(),
      );
    });

    it('queries the pre-authenticated alias/packaging DevHub and resolves both package versions on success', async () => {
      vi.mocked(readSfdxProject).mockResolvedValue({ packageDirectories: [{ default: true, package: 'my-pkg' }] });
      vi.mocked(execa).mockImplementation((async (command: string, args: string[] = []) => {
        if (command === 'sf' && args[0] === 'package' && args[1] === 'installed') {
          return {
            stdout: JSON.stringify({
              result: [{ SubscriberPackageName: 'my-pkg', SubscriberPackageVersionNumber: '2.40.0.10' }],
            }),
          };
        }
        if (command === 'sf' && args[0] === 'package' && args[1] === 'version') {
          return { stdout: JSON.stringify({ result: { Version: '2.41.0.1' } }) };
        }
        throw new Error(`Unexpected execa call: ${command} ${args.join(' ')}`);
      }) as never);

      await NotifyProject.run([
        '--enabled',
        '--before-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-stage',
        'pre-destructive',
        '--alias',
        'my-org',
        '--packaging-devhub',
        'packaging-devhub',
        '--subscriber-package-version-id',
        '04tSJ000000AKwjYAG',
      ]);

      expect(execa).toHaveBeenCalledWith(
        'sf',
        expect.arrayContaining(['package', 'installed', 'list', '--target-org', 'my-org']),
      );
      expect(execa).toHaveBeenCalledWith('sf', expect.arrayContaining(['--target-dev-hub', 'packaging-devhub']));
      expect(execa).not.toHaveBeenCalledWith(expect.stringContaining('sf login org jwt'), expect.anything());
      expect(appendToEnvFile).toHaveBeenCalledWith(
        'project-build.env',
        { PREV_INSTALLED_PACKAGE_VERSION: 'v2.40.0.10', TARGET_PACKAGE_VERSION: 'v2.41.0.1' },
        expect.anything(),
      );
    });
  });

  describe('after-script', () => {
    it('sends a success card on post-destructive success', async () => {
      const result = await NotifyProject.run([
        '--enabled',
        '--after-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-stage',
        'post-destructive',
        '--ci-job-status',
        'success',
        '--ci-project-title',
        'My Project',
      ]);

      expect(result.sent).toBe(true);
      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options?.body as string) as { content: string };
      expect(body.content).toContain('My Project: Completed');
      expect(body.content).toContain('Deployment');
    });

    it('sends a failure card on a failed status', async () => {
      const result = await NotifyProject.run([
        '--enabled',
        '--after-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-stage',
        'post-destructive',
        '--ci-job-status',
        'failed',
        '--ci-project-title',
        'My Project',
      ]);

      expect(result.sent).toBe(true);
      const [, options] = fetchMock.mock.calls[0];
      const body = JSON.parse(options?.body as string) as { content: string };
      expect(body.content).toContain('My Project: Failed');
      expect(body.content).toContain('Deployment');
    });

    it('does nothing for a status with no notification logic', async () => {
      const result = await NotifyProject.run([
        '--enabled',
        '--after-script',
        '--teams-webhook-url',
        'http://mock-webhook',
        '--ci-job-stage',
        'deploy-unpackaged',
        '--ci-job-status',
        'running',
      ]);

      expect(result.sent).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
