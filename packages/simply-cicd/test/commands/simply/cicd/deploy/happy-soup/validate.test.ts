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

import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../../../../src/common/logger.js';
import DeployHappySoupValidate from '../../../../../../src/commands/simply/cicd/deploy/happy-soup/validate.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn() } };
});
vi.mock('../../../../../../src/common/logger.js', () => ({
  logger: { success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('deploy happy-soup validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('derives the deploy config file from --source-branch-name and defaults the rules file', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f === 'deployment-configs/uat.json') {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      if (f === 'config/deploy-rules.json') {
        throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
      }
      throw new Error('unexpected read');
    });

    await DeployHappySoupValidate.run(['--source-branch-name', 'release/uat']);

    expect(logger.success).toHaveBeenCalledWith('Validation successful for deployment-configs/uat.json');
    expect(logger.warn).toHaveBeenCalledWith('Skipping validation for config/deploy-rules.json as it was not found.');
  });

  it('prefers an explicit --deploy-config-file over --source-branch-name', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f === 'deployment-configs/custom.json') {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      if (f === 'config/deploy-rules.json') {
        return JSON.stringify({ rules: [] });
      }
      throw new Error('unexpected read');
    });

    await DeployHappySoupValidate.run([
      '--deploy-config-file',
      'deployment-configs/custom.json',
      '--source-branch-name',
      'release/uat',
    ]);

    expect(logger.success).toHaveBeenCalledWith('Validation successful for deployment-configs/custom.json');
  });
});
