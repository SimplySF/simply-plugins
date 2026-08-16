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
import DeployHappySoupInstallPackaged from '../../../../../../src/commands/simply/cicd/deploy/happy-soup/install-packaged.js';

vi.mock('../../../../../../src/common/deploy/deployHappySoup.js', () => ({ deployHappySoup: vi.fn() }));

describe('deploy happy-soup install-packaged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not require --ci-job-token', async () => {
    vi.mocked(deployHappySoup).mockResolvedValue(undefined);

    await DeployHappySoupInstallPackaged.run(['--alias', 'my-org']);

    expect(deployHappySoup).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'install-packaged', alias: 'my-org', installType: 'Upgrade' }),
    );
  });

  it('accepts an explicit --install-type', async () => {
    vi.mocked(deployHappySoup).mockResolvedValue(undefined);

    await DeployHappySoupInstallPackaged.run(['--install-type', 'All']);

    expect(deployHappySoup).toHaveBeenCalledWith(expect.objectContaining({ installType: 'All' }));
  });
});
