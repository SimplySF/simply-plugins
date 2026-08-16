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

import { promises as fs } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../../../../src/common/logger.js';
import DeployProjectValidate from '../../../../../../src/commands/simply/cicd/deploy/project/validate.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn() } };
});
vi.mock('../../../../../../src/common/logger.js', () => ({
  logger: { success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('deploy project validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to config/deploy.json and warns that deploy-rules-file is unset', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      if (file === 'config/deploy.json') {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      throw new Error('unexpected read');
    });

    await DeployProjectValidate.run([]);

    expect(logger.success).toHaveBeenCalledWith('Validation successful for config/deploy.json');
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No deployment rules file'));
  });

  it('validates config/deploy-rules.json when given explicitly', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f === 'config/deploy.json') {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      if (f === 'config/deploy-rules.json') {
        return JSON.stringify({ rules: [] });
      }
      throw new Error('unexpected read');
    });

    await DeployProjectValidate.run(['--deploy-rules-file', 'config/deploy-rules.json']);

    expect(logger.success).toHaveBeenCalledWith('Validation successful for config/deploy.json');
    expect(logger.success).toHaveBeenCalledWith('Validation successful for config/deploy-rules.json');
  });
});
