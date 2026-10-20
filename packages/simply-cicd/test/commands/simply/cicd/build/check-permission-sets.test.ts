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
import { runCheckPermissionSets } from '../../../../../src/common/build/checkPermissionSets.js';
import BuildCheckPermissionSets from '../../../../../src/commands/simply/cicd/build/check-permission-sets.js';

vi.mock('../../../../../src/common/build/checkPermissionSets.js', () => ({ runCheckPermissionSets: vi.fn() }));

describe('build check-permission-sets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runCheckPermissionSets).mockResolvedValue({ skipped: false, files: [] });
  });

  it('delegates to runCheckPermissionSets', async () => {
    const result = await BuildCheckPermissionSets.run([]);

    expect(result).toEqual({ skipped: false, files: [] });
    expect(runCheckPermissionSets).toHaveBeenCalledWith({ disabled: false });
  });

  it('passes --disabled through', async () => {
    await BuildCheckPermissionSets.run(['--disabled']);

    expect(runCheckPermissionSets).toHaveBeenCalledWith({ disabled: true });
  });

  it('reads --disabled from SIMPLY_CICD_DISABLED', async () => {
    vi.stubEnv('SIMPLY_CICD_DISABLED', 'true');
    try {
      await BuildCheckPermissionSets.run([]);
    } finally {
      vi.unstubAllEnvs();
    }

    expect(runCheckPermissionSets).toHaveBeenCalledWith({ disabled: true });
  });
});
