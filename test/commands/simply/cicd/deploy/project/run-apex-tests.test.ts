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
import DeployProjectRunApexTests from '../../../../../../src/commands/simply/cicd/deploy/project/run-apex-tests.js';

vi.mock('../../../../../../src/common/deploy/deployProject.js', () => ({ deployProject: vi.fn() }));

describe('deploy project run-apex-tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires --ci-job-token', async () => {
    await expect(DeployProjectRunApexTests.run([])).rejects.toThrow(/ci-job-token/i);
  });

  it('wires flags through to deployProject with the correct stage', async () => {
    vi.mocked(deployProject).mockResolvedValue(undefined);

    await DeployProjectRunApexTests.run(['--ci-job-token', 'tok', '--test-suite', 'MySuite']);

    expect(deployProject).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'run-apex-tests', ciJobToken: 'tok', testSuite: 'MySuite' }),
    );
  });
});
