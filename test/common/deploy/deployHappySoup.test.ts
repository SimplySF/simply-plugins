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
import chalk from 'chalk';
import { execa } from 'execa';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addGitRemote } from '../../../src/common/git.js';
import { logger } from '../../../src/common/logger.js';
import { authenticateOrg } from '../../../src/common/sfAuth.js';
import {
  determineDeployConfigFile,
  installPackageDependencies,
  printDeploymentSummary,
  runDeploymentSteps,
} from '../../../src/common/deploy/deployCommon.js';
import { deployHappySoup } from '../../../src/common/deploy/deployHappySoup.js';

chalk.level = 0;

vi.mock('execa');
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    promises: { ...actual.promises, access: vi.fn(), copyFile: vi.fn(), readFile: vi.fn(), writeFile: vi.fn() },
  };
});
vi.mock('../../../src/common/git.js', () => ({ addGitRemote: vi.fn() }));
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
vi.mock('../../../src/common/sfAuth.js', () => ({ authenticateOrg: vi.fn() }));
vi.mock('../../../src/common/sfPlugins.js', () => ({ installDeploymentPlugins: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../../../src/common/deploy/deployCommon.js', () => ({
  determineDeployConfigFile: vi.fn(),
  installPackageDependencies: vi.fn(),
  runDeploymentSteps: vi.fn(),
  printDeploymentSummary: vi.fn(),
}));

const baseOptions = { vcsHost: 'gitlab.com', vcsProvider: 'gitlab' as const };

describe('deployHappySoup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(addGitRemote).mockResolvedValue('test-remote');
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call installPackageDependencies for the 'install-packaged' stage", async () => {
    await deployHappySoup({ ...baseOptions, stage: 'install-packaged' });

    expect(installPackageDependencies).toHaveBeenCalledOnce();
    expect(logger.success).toHaveBeenCalledWith(
      expect.stringMatching(/Completed Stage: install-packaged in \d+(\.\d+)?s/),
    );
  });

  describe("'tag-deployment' stage", () => {
    const baseTagOptions = {
      ...baseOptions,
      stage: 'tag-deployment',
      alias: 'my-org',
      ciPipelineId: '123',
      ciProjectPath: 'proj/path',
      projectAccessToken: 'token',
    };

    beforeEach(() => {
      const orgDisplayResult = { result: { instanceUrl: 'https://my-instance.salesforce.com' } };
      vi.mocked(execa).mockImplementation((async (command: string, args: string[] = []) => {
        if (command === 'sf' && args.includes('org') && args.includes('display')) {
          return { stdout: JSON.stringify(orgDisplayResult) };
        }
        return { stdout: '' };
      }) as never);

      vi.useFakeTimers();
      vi.setSystemTime(new Date('2023-10-27T10:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create a simple git tag', async () => {
      await deployHappySoup(baseTagOptions);

      expect(authenticateOrg).toHaveBeenCalled();
      expect(execa).toHaveBeenCalledWith('git', [
        'tag',
        '-m',
        expect.stringContaining('deployed to org my-instance'),
        'deployed--my-instance-20231027.0600',
      ]);
      expect(execa).toHaveBeenCalledWith('git', ['push', 'test-remote', '--tags']);
      expect(logger.success).toHaveBeenCalledWith(
        expect.stringMatching(/Completed Stage: tag-deployment in \d+(\.\d+)?s/),
      );
    });

    it('should create a git tag with pipeline and MR info', async () => {
      await deployHappySoup({
        ...baseTagOptions,
        ciPipelineUrl: 'http://pipeline.url',
        ciMergeRequestProjectUrl: 'http://mr.url',
        ciMergeRequestIid: '456',
      });

      const expectedMessage =
        'deployed to org my-instance at 20231027.0600 Associated pipeline - http://pipeline.url Associated merge request - http://mr.url/-/merge_requests/456';
      expect(execa).toHaveBeenCalledWith('git', ['tag', '-m', expectedMessage, 'deployed--my-instance-20231027.0600']);
    });
  });

  describe("'deployment-close-out' stage", () => {
    const baseCloseoutOptions = {
      ...baseOptions,
      stage: 'deployment-close-out',
      sourceBranchName: 'feature/T-123-my-feature',
      ciCommitRefName: 'feature/T-123-my-feature',
      ciPipelineId: '123',
      ciProjectPath: 'proj/path',
      projectAccessToken: 'token',
    };

    it('should archive release-specific deployment config', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await deployHappySoup({ ...baseCloseoutOptions, deployReleaseDate: '2023-10-27' });

      expect(fs.access).toHaveBeenCalledWith('deployment-configs/2023-10-27.json');
      expect(fs.copyFile).toHaveBeenCalledWith('deployment-configs/2023-10-27.json', 'config/deploy.json');
      expect(execa).toHaveBeenCalledWith('git', [
        'commit',
        '-m',
        'Archiving deploy.json [skip ci]',
        'config/deploy.json',
      ]);
      expect(execa).toHaveBeenCalledWith('git', ['push', 'test-remote']);
    });

    it('should archive branch-specific deployment config', async () => {
      vi.mocked(determineDeployConfigFile).mockReturnValue('deployment-configs/T-123-my-feature.json');
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await deployHappySoup(baseCloseoutOptions);

      expect(determineDeployConfigFile).toHaveBeenCalledWith('feature/T-123-my-feature', undefined);
      expect(fs.access).toHaveBeenCalledWith('deployment-configs/T-123-my-feature.json');
      expect(fs.copyFile).toHaveBeenCalledWith('deployment-configs/T-123-my-feature.json', 'config/deploy.json');
      expect(execa).toHaveBeenCalledWith('git', [
        'commit',
        '-m',
        'Archiving deploy.json [skip ci]',
        'config/deploy.json',
      ]);
    });

    it('should remove obsolete config/deploy.json if no other config is found', async () => {
      vi.mocked(determineDeployConfigFile).mockReturnValue(undefined);
      vi.mocked(fs.access).mockImplementation(async (p) => {
        if (String(p).startsWith('deployment-configs')) {
          throw new Error('ENOENT');
        }
        return undefined;
      });

      await deployHappySoup(baseCloseoutOptions);

      expect(fs.copyFile).not.toHaveBeenCalled();
      expect(execa).toHaveBeenCalledWith('git', ['rm', 'config/deploy.json']);
      expect(execa).toHaveBeenCalledWith('git', [
        'commit',
        '-m',
        'Removing obsolete config/deploy.json [skip ci]',
        'config/deploy.json',
      ]);
    });

    it('should warn if no deploy.json is found to archive', async () => {
      vi.mocked(determineDeployConfigFile).mockReturnValue(undefined);
      vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

      await deployHappySoup(baseCloseoutOptions);

      expect(fs.copyFile).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Unable to find a deploy.json to archive.');
    });
  });

  describe('generic deployment stages', () => {
    beforeEach(() => {
      vi.mocked(runDeploymentSteps).mockResolvedValue({ deployProgress: { durations: {} } });
    });

    it('should call runDeploymentSteps with a derived config path', async () => {
      vi.mocked(determineDeployConfigFile).mockReturnValue('deployment-configs/T-123.json');

      await deployHappySoup({ ...baseOptions, stage: 'pre-destructive', sourceBranchName: 'feature/T-123' });

      expect(runDeploymentSteps).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'pre-destructive', deployConfigFile: 'deployment-configs/T-123.json' }),
      );
      expect(printDeploymentSummary).toHaveBeenCalled();
    });

    it('should use the explicit deployConfigFile if provided', async () => {
      vi.mocked(determineDeployConfigFile).mockImplementation((_sourceBranch, configFile) => configFile);

      await deployHappySoup({
        ...baseOptions,
        stage: 'post-deploy',
        sourceBranchName: 'feature/T-123',
        deployConfigFile: 'my-special-config.json',
      });

      expect(runDeploymentSteps).toHaveBeenCalledWith(
        expect.objectContaining({ stage: 'post-deploy', deployConfigFile: 'my-special-config.json' }),
      );
    });
  });

  it('should rethrow (with a job-context banner) on failure', async () => {
    const error = Object.assign(new Error('Deployment failed'), { job: 'MY-JOB' });
    vi.mocked(runDeploymentSteps).mockRejectedValue(error);
    vi.mocked(determineDeployConfigFile).mockReturnValue(undefined);

    await expect(deployHappySoup({ ...baseOptions, stage: 'deploy-unpackaged' })).rejects.toThrow(error);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringMatching(/Failed stage deploy-unpackaged for MY-JOB after \d+(\.\d+)?s/),
    );
    expect(logger.raw).toHaveBeenCalledWith(error.message);
  });
});
