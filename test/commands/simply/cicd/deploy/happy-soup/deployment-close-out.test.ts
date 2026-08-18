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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deployHappySoup } from '../../../../../../src/common/deploy/deployHappySoup.js';
import DeployHappySoupDeploymentCloseOut from '../../../../../../src/commands/simply/cicd/deploy/happy-soup/deployment-close-out.js';

vi.mock('../../../../../../src/common/deploy/deployHappySoup.js', () => ({ deployHappySoup: vi.fn() }));

const requiredFlags = [
  '--ci-commit-ref-name',
  'main',
  '--ci-pipeline-id',
  '123',
  '--ci-project-path',
  'group/project',
  '--project-access-token',
  'tok',
];

describe('deploy happy-soup deployment-close-out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires the GitLab close-out flags', async () => {
    await expect(DeployHappySoupDeploymentCloseOut.run([])).rejects.toThrow(/ci-commit-ref-name/i);
  });

  it('wires flags through to deployHappySoup with the correct stage', async () => {
    vi.mocked(deployHappySoup).mockResolvedValue(undefined);

    await DeployHappySoupDeploymentCloseOut.run([...requiredFlags, '--deploy-release-date', '2026-01-15']);

    expect(deployHappySoup).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'deployment-close-out',
        ciCommitRefName: 'main',
        ciPipelineId: '123',
        ciProjectPath: 'group/project',
        projectAccessToken: 'tok',
        deployReleaseDate: '2026-01-15',
      }),
    );
  });
});
