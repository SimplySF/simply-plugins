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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteScratchOrg } from '../../../../../src/common/build/deleteScratchOrg.js';
import BuildDeleteScratch from '../../../../../src/commands/simply/cicd/build/delete-scratch.js';

vi.mock('../../../../../src/common/build/deleteScratchOrg.js', () => ({ deleteScratchOrg: vi.fn() }));

const baseArgs = ['--dev-hub', 'main', '--jwt-key-file', 'key.file'];

describe('build delete-scratch', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(deleteScratchOrg).mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('parses the --dev-hub alias and delegates to deleteScratchOrg', async () => {
    const result = await BuildDeleteScratch.run(baseArgs);

    expect(result.skipped).toBe(false);
    expect(deleteScratchOrg).toHaveBeenCalledWith({ jwtKeyFile: 'key.file', debug: false }, 'main');
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildDeleteScratch.run([...baseArgs, '--disabled']);

    expect(result.skipped).toBe(true);
    expect(deleteScratchOrg).not.toHaveBeenCalled();
  });

  it('skips when PACKAGE_CHANGED is FALSE', async () => {
    process.env.PACKAGE_CHANGED = 'FALSE';

    const result = await BuildDeleteScratch.run(baseArgs);

    expect(result.skipped).toBe(true);
    expect(deleteScratchOrg).not.toHaveBeenCalled();
  });
});
