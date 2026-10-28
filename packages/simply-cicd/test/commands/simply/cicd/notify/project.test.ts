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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { projectNotifyAfterScript, projectNotifyBeforeScript } from '@simplysf/simply-cicd-core';
import NotifyProject from '../../../../../src/commands/simply/cicd/notify/project.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  projectNotifyBeforeScript: vi.fn(),
  projectNotifyAfterScript: vi.fn(),
}));

// The before/after-script behavior itself (stage gating, version resolution, card contents) is
// tested in @simplysf/simply-cicd-core; these tests cover the command's own flag handling.
describe('notify project', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(projectNotifyAfterScript).mockResolvedValue({ sent: true });
  });

  it('does nothing if disabled', async () => {
    const result = await NotifyProject.run(['--before-script']);
    expect(result.sent).toBe(false);
    expect(projectNotifyBeforeScript).not.toHaveBeenCalled();
  });

  it('throws if no teams webhook URL is provided', async () => {
    await expect(NotifyProject.run(['--enabled', '--after-script'])).rejects.toThrow(/teams-webhook-url/i);
  });

  it('throws if neither before-script nor after-script is specified', async () => {
    await expect(NotifyProject.run(['--enabled', '--teams-webhook-url', 'http://mock-webhook'])).rejects.toThrow(
      /before-script.*after-script/,
    );
  });

  it('maps flags onto the before-script options and reports nothing sent', async () => {
    const result = await NotifyProject.run([
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

    expect(result.sent).toBe(false);
    expect(projectNotifyBeforeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        teamsWebhookUrl: ['http://mock-webhook'],
        ciJobStage: 'pre-destructive',
        alias: 'my-org',
        packagingDevhub: 'packaging-devhub',
        subscriberPackageVersionId: '04tSJ000000AKwjYAG',
        almProvider: 'jira',
        debug: false,
      }),
    );
    expect(projectNotifyAfterScript).not.toHaveBeenCalled();
  });

  it('maps flags onto the after-script options and returns its result', async () => {
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
    expect(projectNotifyAfterScript).toHaveBeenCalledWith(
      expect.objectContaining({
        ciJobStage: 'post-destructive',
        ciJobStatus: 'success',
        ciProjectTitle: 'My Project',
      }),
    );
  });

  it('rethrows a failure from the after-script', async () => {
    vi.mocked(projectNotifyAfterScript).mockRejectedValue(new Error('webhook down'));

    await expect(
      NotifyProject.run(['--enabled', '--after-script', '--teams-webhook-url', 'http://mock-webhook']),
    ).rejects.toThrow('webhook down');
  });
});
