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
import { logger } from '../logger.js';

/** Where `runLwcJest` writes the JUnit report, mirroring `runApexTests`'s `./test-results/apex`. */
export const LWC_JEST_RESULTS_DIR = './test-results/lwc';
export const LWC_JEST_RESULTS_FILE = 'test-result.xml';

export type RunLwcJestOptions = { disabled?: boolean; failOnTestFailure?: boolean };
export type RunLwcJestResult = { skipped: boolean; success: boolean };

/**
 * Installs the LWC Jest test libraries and runs the project's LWC Jest tests with coverage, writing
 * a JUnit report to `./test-results/lwc/test-result.xml`. A failure is logged and returned, unless
 * `failOnTestFailure` is set, in which case it throws.
 */
export async function runLwcJest(options: RunLwcJestOptions): Promise<RunLwcJestResult> {
  if (options.disabled) {
    logger.warn('lwc-jest is disabled. Skipping.');
    return { skipped: true, success: false };
  }

  logger.info('Running LWC Jest tests...');
  try {
    await execa('npm', ['install', '@salesforce/sfdx-lwc-jest', '@sa11y/jest', 'jest-junit'], { stdio: 'pipe' });
    await execa(
      'npx',
      ['sfdx-lwc-jest', '--coverage', '--', '--passWithNoTests', '--reporters=default', '--reporters=jest-junit'],
      {
        stdio: 'inherit',
        env: { JEST_JUNIT_OUTPUT_DIR: LWC_JEST_RESULTS_DIR, JEST_JUNIT_OUTPUT_NAME: LWC_JEST_RESULTS_FILE },
      },
    );
    logger.success('LWC Jest tests completed.');
    return { skipped: false, success: true };
  } catch (error) {
    if (options.failOnTestFailure) {
      throw new Error('LWC Jest tests failed.', { cause: error });
    }

    logger.error('LWC Jest tests failed.');
    return { skipped: false, success: false };
  }
}
