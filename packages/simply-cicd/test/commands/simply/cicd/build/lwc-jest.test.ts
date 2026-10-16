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
import { runLwcJest } from '../../../../../src/common/build/lwcJest.js';
import BuildLwcJest from '../../../../../src/commands/simply/cicd/build/lwc-jest.js';

vi.mock('../../../../../src/common/build/lwcJest.js', () => ({ runLwcJest: vi.fn() }));

describe('build lwc-jest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runLwcJest).mockResolvedValue({ skipped: false, success: true });
  });

  it('delegates to runLwcJest', async () => {
    const result = await BuildLwcJest.run([]);

    expect(result).toEqual({ skipped: false, success: true });
    expect(runLwcJest).toHaveBeenCalledWith({ disabled: false, failOnTestFailure: false });
  });

  it('should skip lwc-jest if disabled', async () => {
    vi.mocked(runLwcJest).mockResolvedValue({ skipped: true, success: false });

    const result = await BuildLwcJest.run(['--disabled']);

    expect(result).toEqual({ skipped: true, success: false });
    expect(runLwcJest).toHaveBeenCalledWith({ disabled: true, failOnTestFailure: false });
  });

  it('passes --lwc-jest-fail-on-test-failure through', async () => {
    await BuildLwcJest.run(['--lwc-jest-fail-on-test-failure']);

    expect(runLwcJest).toHaveBeenCalledWith({ disabled: false, failOnTestFailure: true });
  });

  it('reads --lwc-jest-fail-on-test-failure from SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE', async () => {
    vi.stubEnv('SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE', 'true');
    try {
      await BuildLwcJest.run([]);
    } finally {
      vi.unstubAllEnvs();
    }

    expect(runLwcJest).toHaveBeenCalledWith({ disabled: false, failOnTestFailure: true });
  });

  it('defaults --lwc-jest-fail-on-test-failure to false when SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE is unset', async () => {
    vi.stubEnv('SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE', undefined);
    try {
      await BuildLwcJest.run([]);
    } finally {
      vi.unstubAllEnvs();
    }

    expect(runLwcJest).toHaveBeenCalledWith({ disabled: false, failOnTestFailure: false });
  });

  it('treats SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE=false as false', async () => {
    vi.stubEnv('SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE', 'false');
    try {
      await BuildLwcJest.run([]);
    } finally {
      vi.unstubAllEnvs();
    }

    expect(runLwcJest).toHaveBeenCalledWith({ disabled: false, failOnTestFailure: false });
  });

  it('fails the command when runLwcJest throws', async () => {
    vi.mocked(runLwcJest).mockRejectedValue(new Error('LWC Jest tests failed.'));

    await expect(BuildLwcJest.run(['--lwc-jest-fail-on-test-failure'])).rejects.toThrow('LWC Jest tests failed.');
  });
});
