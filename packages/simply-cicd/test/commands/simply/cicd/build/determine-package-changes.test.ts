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
import { determinePackageChanges } from '../../../../../src/common/build/determinePackageChanges.js';
import BuildDeterminePackageChanges from '../../../../../src/commands/simply/cicd/build/determine-package-changes.js';

vi.mock('../../../../../src/common/build/determinePackageChanges.js', () => ({ determinePackageChanges: vi.fn() }));

describe('build determine-package-changes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(determinePackageChanges).mockResolvedValue(undefined);
  });

  it('defaults --out to changes.env and delegates to determinePackageChanges', async () => {
    const result = await BuildDeterminePackageChanges.run([]);

    expect(result.skipped).toBe(false);
    expect(determinePackageChanges).toHaveBeenCalledWith({ out: 'changes.env', debug: false });
  });

  it('accepts an explicit --out', async () => {
    await BuildDeterminePackageChanges.run(['--out', 'custom.env']);

    expect(determinePackageChanges).toHaveBeenCalledWith(expect.objectContaining({ out: 'custom.env' }));
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildDeterminePackageChanges.run(['--disabled']);

    expect(result.skipped).toBe(true);
    expect(determinePackageChanges).not.toHaveBeenCalled();
  });
});
