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
    expect(execa).toHaveBeenCalledWith('npm', ['install', '@salesforce/sfdx-lwc-jest', '@sa11y/jest'], {
      stdio: 'pipe',
    });
    expect(execa).toHaveBeenCalledWith('npx', ['sfdx-lwc-jest', '--coverage', '--', '--passWithNoTests'], {
      stdio: 'inherit',
    });
    expect(logger.success).toHaveBeenCalledWith('LWC Jest tests completed.');
  });

  it('should skip lwc-jest if disabled', async () => {
    const result = await runLwcJest({ disabled: true });

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
});
