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
import { createScratchOrg } from '../../../../../src/common/build/createScratchOrg.js';
import BuildCreateScratch from '../../../../../src/commands/simply/cicd/build/create-scratch.js';

vi.mock('../../../../../src/common/build/createScratchOrg.js', () => ({ createScratchOrg: vi.fn() }));

const baseArgs = ['--dev-hub', 'main'];

describe('build create-scratch', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(createScratchOrg).mockResolvedValue({ username: 'scratch@test' });
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('parses --dev-hub aliases and delegates to createScratchOrg', async () => {
    const result = await BuildCreateScratch.run([
      '--dev-hub',
      'main',
      '--dev-hub',
      'backup',
      '--scratch-duration-days',
      '2',
    ]);

    expect(result.skipped).toBe(false);
    expect(result.scratchOrg).toEqual({ username: 'scratch@test' });
    expect(createScratchOrg).toHaveBeenCalledWith(
      { debug: false, scratchDefinitionFile: undefined, scratchDurationDays: '2' },
      ['main', 'backup'],
    );
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildCreateScratch.run([...baseArgs, '--disabled']);

    expect(result.skipped).toBe(true);
    expect(createScratchOrg).not.toHaveBeenCalled();
  });

  it('skips when PACKAGE_CHANGED is FALSE', async () => {
    process.env.PACKAGE_CHANGED = 'FALSE';

    const result = await BuildCreateScratch.run(baseArgs);

    expect(result.skipped).toBe(true);
    expect(createScratchOrg).not.toHaveBeenCalled();
  });
});
