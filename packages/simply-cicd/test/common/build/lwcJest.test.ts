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

import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../src/common/logger.js';
import { runLwcJest } from '../../../src/common/build/lwcJest.js';

vi.mock('execa');
vi.mock('../../../src/common/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    log: vi.fn(),
    raw: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('runLwcJest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as never);
  });

  it('should install LWC Jest libraries and run tests with coverage', async () => {
    const result = await runLwcJest({});

    expect(result).toEqual({ skipped: false, success: true });
    expect(logger.info).toHaveBeenCalledWith('Running LWC Jest tests...');
    expect(execa).toHaveBeenCalledWith('npm', ['install', '@salesforce/sfdx-lwc-jest', '@sa11y/jest', 'jest-junit'], {
      stdio: 'pipe',
    });
    expect(execa).toHaveBeenCalledWith(
      'npx',
      ['sfdx-lwc-jest', '--coverage', '--', '--passWithNoTests', '--reporters=default', '--reporters=jest-junit'],
      {
        stdio: 'inherit',
        env: { JEST_JUNIT_OUTPUT_DIR: './test-results/lwc', JEST_JUNIT_OUTPUT_NAME: 'test-result.xml' },
      },
    );
    expect(logger.success).toHaveBeenCalledWith('LWC Jest tests completed.');
  });

  it('should skip lwc-jest if disabled, even with failOnTestFailure', async () => {
    const result = await runLwcJest({ disabled: true, failOnTestFailure: true });

    expect(result).toEqual({ skipped: true, success: false });
    expect(logger.warn).toHaveBeenCalledWith('lwc-jest is disabled. Skipping.');
    expect(execa).not.toHaveBeenCalled();
  });

  it('should log an error (not throw) when the tests fail', async () => {
    vi.mocked(execa).mockRejectedValue(new Error('jest failed'));

    const result = await runLwcJest({});

    expect(result).toEqual({ skipped: false, success: false });
    expect(logger.error).toHaveBeenCalledWith('LWC Jest tests failed.');
  });

  it('should throw when the tests fail and failOnTestFailure is set', async () => {
    vi.mocked(execa).mockRejectedValue(new Error('jest failed'));

    await expect(runLwcJest({ failOnTestFailure: true })).rejects.toThrow('LWC Jest tests failed.');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should throw when the install fails and failOnTestFailure is set', async () => {
    vi.mocked(execa).mockRejectedValueOnce(new Error('npm install failed'));

    await expect(runLwcJest({ failOnTestFailure: true })).rejects.toThrow('LWC Jest tests failed.');
    expect(execa).toHaveBeenCalledTimes(1);
  });
});
