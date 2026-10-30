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
import { sendBuildNotification } from '@simplysf/simply-cicd-core';
import NotifyBuild from '../../../../../src/commands/simply/cicd/notify/build.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  sendBuildNotification: vi.fn(),
}));

describe('notify build', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendBuildNotification).mockResolvedValue({ sent: true });
  });

  it('does nothing if disabled', async () => {
    const result = await NotifyBuild.run(['--ci-job-status', 'failed', '--teams-webhook-url', 'http://mock']);

    expect(result.sent).toBe(false);
    expect(sendBuildNotification).not.toHaveBeenCalled();
  });

  it('throws if no teams webhook URL is provided', async () => {
    await expect(NotifyBuild.run(['--enabled', '--ci-job-status', 'failed'])).rejects.toThrow(/teams-webhook-url/i);
    expect(sendBuildNotification).not.toHaveBeenCalled();
  });

  it('maps its flags to the notification options', async () => {
    const result = await NotifyBuild.run([
      '--enabled',
      '--ci-commit-ref-name',
      'main',
      '--ci-job-name',
      'create-package-version',
      '--ci-job-stage',
      'package',
      '--ci-job-status',
      'success',
      '--ci-pipeline-id',
      '42',
      '--ci-pipeline-url',
      'https://gitlab.com/g/p/-/pipelines/42',
      '--ci-project-title',
      'My Project',
      '--subscriber-package-version-id',
      '04t000000000001AAA',
      '--alm-base-url',
      'https://jira.example.com/browse',
      '--alm-project-key',
      'ABC',
      '--teams-webhook-url',
      'http://one',
      '--teams-webhook-url',
      'http://two',
    ]);

    expect(result.sent).toBe(true);
    expect(sendBuildNotification).toHaveBeenCalledWith({
      ciCommitRefName: 'main',
      ciJobName: 'create-package-version',
      ciJobStage: 'package',
      ciJobStatus: 'success',
      ciPipelineId: '42',
      ciPipelineUrl: 'https://gitlab.com/g/p/-/pipelines/42',
      ciProjectTitle: 'My Project',
      subscriberPackageVersionId: '04t000000000001AAA',
      almBaseUrl: 'https://jira.example.com/browse',
      almProjectKey: 'ABC',
      almProvider: 'jira',
      teamsWebhookUrl: ['http://one', 'http://two'],
      debug: false,
    });
  });

  it('rethrows a failed send', async () => {
    vi.mocked(sendBuildNotification).mockRejectedValue(new Error('Failed to send 1 notification(s)'));

    await expect(
      NotifyBuild.run(['--enabled', '--ci-job-status', 'failed', '--teams-webhook-url', 'http://mock']),
    ).rejects.toThrow(/Failed to send/);
  });
});
