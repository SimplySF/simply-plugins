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
import DeployHappySoupPostDestructive from '../../../../../../src/commands/simply/cicd/deploy/happy-soup/post-destructive.js';

vi.mock('../../../../../../src/common/deploy/deployHappySoup.js', () => ({ deployHappySoup: vi.fn() }));

describe('deploy happy-soup post-destructive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires --ci-job-token', async () => {
    await expect(DeployHappySoupPostDestructive.run([])).rejects.toThrow(/ci-job-token/i);
  });

  it('wires flags through to deployHappySoup with the correct stage', async () => {
    vi.mocked(deployHappySoup).mockResolvedValue(undefined);

    await DeployHappySoupPostDestructive.run(['--ci-job-token', 'tok', '--debug']);

    expect(deployHappySoup).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'post-destructive', ciJobToken: 'tok', debug: true }),
    );
  });
});
