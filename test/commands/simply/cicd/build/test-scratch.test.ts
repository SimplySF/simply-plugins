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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runScratchApexTests } from '../../../../../src/common/build/testScratch.js';
import BuildTestScratch from '../../../../../src/commands/simply/cicd/build/test-scratch.js';

vi.mock('../../../../../src/common/build/testScratch.js', () => ({ runScratchApexTests: vi.fn() }));

describe('build test-scratch', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(runScratchApexTests).mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('delegates to runScratchApexTests with parsed flags', async () => {
    const result = await BuildTestScratch.run(['--jwt-key-file', 'key.file']);

    expect(result.skipped).toBe(false);
    expect(runScratchApexTests).toHaveBeenCalledWith({ jwtKeyFile: 'key.file', debug: false, disableApexTests: false });
  });

  it('passes --disable-apex-tests through without skipping the whole job', async () => {
    await BuildTestScratch.run(['--jwt-key-file', 'key.file', '--disable-apex-tests']);

    expect(runScratchApexTests).toHaveBeenCalledWith(expect.objectContaining({ disableApexTests: true }));
  });

  it('should skip test-scratch if disabled', async () => {
    const result = await BuildTestScratch.run(['--jwt-key-file', 'key.file', '--disabled']);

    expect(result.skipped).toBe(true);
    expect(runScratchApexTests).not.toHaveBeenCalled();
  });

  it('skips when PACKAGE_CHANGED is FALSE', async () => {
    process.env.PACKAGE_CHANGED = 'FALSE';

    const result = await BuildTestScratch.run(['--jwt-key-file', 'key.file']);

    expect(result.skipped).toBe(true);
    expect(runScratchApexTests).not.toHaveBeenCalled();
  });
});
