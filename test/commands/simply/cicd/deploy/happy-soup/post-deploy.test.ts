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
import DeployHappySoupPostDeploy from '../../../../../../src/commands/simply/cicd/deploy/happy-soup/post-deploy.js';

vi.mock('../../../../../../src/common/deploy/deployHappySoup.js', () => ({ deployHappySoup: vi.fn() }));

describe('deploy happy-soup post-deploy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires --ci-job-token', async () => {
    await expect(DeployHappySoupPostDeploy.run([])).rejects.toThrow(/ci-job-token/i);
  });

  it('wires flags through to deployHappySoup with the correct stage', async () => {
    vi.mocked(deployHappySoup).mockResolvedValue(undefined);

    await DeployHappySoupPostDeploy.run(['--ci-job-token', 'tok', '--alias', 'my-org', '--vcs-provider', 'gitlab']);

    expect(deployHappySoup).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'post-deploy', ciJobToken: 'tok', alias: 'my-org', vcsProvider: 'gitlab' }),
    );
  });
});
