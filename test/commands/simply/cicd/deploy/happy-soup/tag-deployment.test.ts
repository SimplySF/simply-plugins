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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployHappySoup } from '../../../../../../src/common/deploy/deployHappySoup.js';
import DeployHappySoupTagDeployment from '../../../../../../src/commands/simply/cicd/deploy/happy-soup/tag-deployment.js';

vi.mock('../../../../../../src/common/deploy/deployHappySoup.js', () => ({ deployHappySoup: vi.fn() }));

const requiredFlags = [
  '--ci-merge-request-iid',
  '45',
  '--ci-merge-request-project-url',
  'https://gitlab.example.com/group/project',
  '--ci-pipeline-id',
  '123',
  '--ci-pipeline-url',
  'https://gitlab.example.com/group/project/-/pipelines/123',
  '--ci-project-path',
  'group/project',
  '--project-access-token',
  'tok',
];

describe('deploy happy-soup tag-deployment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires the GitLab tagging flags', async () => {
    await expect(DeployHappySoupTagDeployment.run([])).rejects.toThrow(/ci-pipeline-id/i);
  });

  it('wires flags through to deployHappySoup with the correct stage', async () => {
    vi.mocked(deployHappySoup).mockResolvedValue(undefined);

    await DeployHappySoupTagDeployment.run([...requiredFlags, '--alias', 'my-org']);

    expect(deployHappySoup).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'tag-deployment',
        ciMergeRequestIid: '45',
        ciMergeRequestProjectUrl: 'https://gitlab.example.com/group/project',
        ciPipelineId: '123',
        ciPipelineUrl: 'https://gitlab.example.com/group/project/-/pipelines/123',
        ciProjectPath: 'group/project',
        projectAccessToken: 'tok',
        alias: 'my-org',
      }),
    );
  });
});
