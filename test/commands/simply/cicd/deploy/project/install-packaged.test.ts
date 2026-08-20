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
import { deployProject } from '../../../../../../src/common/deploy/deployProject.js';
import DeployProjectInstallPackaged from '../../../../../../src/commands/simply/cicd/deploy/project/install-packaged.js';

vi.mock('../../../../../../src/common/deploy/deployProject.js', () => ({ deployProject: vi.fn() }));

describe('deploy project install-packaged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires --ci-job-token', async () => {
    await expect(DeployProjectInstallPackaged.run([])).rejects.toThrow(/ci-job-token/i);
  });

  it('wires flags through to deployProject, defaulting install-type to Upgrade', async () => {
    vi.mocked(deployProject).mockResolvedValue(undefined);

    await DeployProjectInstallPackaged.run([
      '--ci-job-token',
      'tok',
      '--alias',
      'my-org',
      '--subscriber-package-version-id',
      '04tXXX',
    ]);

    expect(deployProject).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'install-packaged',
        ciJobToken: 'tok',
        alias: 'my-org',
        subscriberPackageVersionId: '04tXXX',
        installType: 'Upgrade',
      }),
    );
  });

  it('accepts an explicit --install-type', async () => {
    vi.mocked(deployProject).mockResolvedValue(undefined);

    await DeployProjectInstallPackaged.run(['--ci-job-token', 'tok', '--alias', 'my-org', '--install-type', 'Delta']);

    expect(deployProject).toHaveBeenCalledWith(expect.objectContaining({ installType: 'Delta' }));
  });
});
