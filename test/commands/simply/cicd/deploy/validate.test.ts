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
import { logger } from '../../../../../src/common/logger.js';
import DeployValidate from '../../../../../src/commands/simply/cicd/deploy/validate.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn() } };
});
vi.mock('../../../../../src/common/logger.js', () => ({
  logger: { success: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

describe('deploy validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should validate both files successfully', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f.includes('deploy.json')) {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      if (f.includes('deploy-rules.json')) {
        return JSON.stringify({ rules: [] });
      }
      throw new Error('File not found');
    });

    await DeployValidate.run(['--deploy-config-file', 'deploy.json', '--deploy-rules-file', 'deploy-rules.json']);

    expect(logger.success).toHaveBeenCalledWith('Validation successful for deploy.json');
    expect(logger.success).toHaveBeenCalledWith('Validation successful for deploy-rules.json');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should validate using --source-branch-name to resolve the config file', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f.includes('deployment-configs') && f.includes('my-branch.json')) {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      if (f.includes('deploy-rules.json')) {
        return JSON.stringify({ rules: [] });
      }
      throw new Error(`File not found: ${f}`);
    });

    await DeployValidate.run(['--source-branch-name', 'feature/my-branch', '--deploy-rules-file', 'deploy-rules.json']);

    expect(logger.success).toHaveBeenCalledWith('Validation successful for deployment-configs/my-branch.json');
    expect(logger.success).toHaveBeenCalledWith('Validation successful for deploy-rules.json');
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('should fail validation for an invalid deploy config file', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f.includes('deploy.json')) {
        return JSON.stringify({ deployments: [{ slug: 'invalid' }] });
      }
      if (f.includes('deploy-rules.json')) {
        return JSON.stringify({ rules: [] });
      }
      throw new Error('File not found');
    });

    await expect(
      DeployValidate.run(['--deploy-config-file', 'deploy.json', '--deploy-rules-file', 'deploy-rules.json']),
    ).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed for deploy.json:'));
  });

  it('should fail validation for an invalid deploy rules file', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f.includes('deploy.json')) {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      if (f.includes('deploy-rules.json')) {
        return JSON.stringify({ invalid: 'rules' });
      }
      throw new Error('File not found');
    });

    await expect(
      DeployValidate.run(['--deploy-config-file', 'deploy.json', '--deploy-rules-file', 'deploy-rules.json']),
    ).rejects.toThrow();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Validation failed for deploy-rules.json:'));
  });

  it('should warn if the deploy config file is not found', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f.includes('deploy.json')) {
        throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
      }
      if (f.includes('deploy-rules.json')) {
        return JSON.stringify({ rules: [] });
      }
      throw new Error('File not found');
    });

    await DeployValidate.run(['--deploy-config-file', 'deploy.json', '--deploy-rules-file', 'deploy-rules.json']);

    expect(logger.warn).toHaveBeenCalledWith('Skipping validation for deploy.json as it was not found.');
    expect(logger.success).toHaveBeenCalledWith('Validation successful for deploy-rules.json');
  });

  it('should warn if the deploy rules file is not found', async () => {
    vi.mocked(fs.readFile).mockImplementation(async (file) => {
      const f = file as string;
      if (f.includes('deploy.json')) {
        return JSON.stringify({ deployments: [{ name: 'local', unpackagedDeploy: true }] });
      }
      if (f.includes('deploy-rules.json')) {
        throw Object.assign(new Error('Not found'), { code: 'ENOENT' });
      }
      throw new Error('File not found');
    });

    await DeployValidate.run(['--deploy-config-file', 'deploy.json', '--deploy-rules-file', 'deploy-rules.json']);

    expect(logger.warn).toHaveBeenCalledWith('Skipping validation for deploy-rules.json as it was not found.');
    expect(logger.success).toHaveBeenCalledWith('Validation successful for deploy.json');
  });

  it('should warn (not throw) if neither file is specified and no source-branch-name is given', async () => {
    await DeployValidate.run([]);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No deployment config file'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No deployment rules file'));
    expect(fs.readFile).not.toHaveBeenCalled();
  });
});
