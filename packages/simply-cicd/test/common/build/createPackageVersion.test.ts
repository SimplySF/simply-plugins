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

import { promises as fsPromises } from 'node:fs';
import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readSfdxProject } from '@simplysf/simply-core';
import { addGitRemote } from '../../../src/common/git.js';
import { logger } from '../../../src/common/logger.js';
import { createPackageVersion } from '../../../src/common/build/createPackageVersion.js';

vi.mock('execa');
vi.mock('@simplysf/simply-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@simplysf/simply-core')>();
  return { ...actual, readSfdxProject: vi.fn() };
});
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn(), writeFile: vi.fn() } };
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

const baseOptions = {
  ciCommitRefName: 'release/1.0',
  ciCommitSha: 'abc123',
  ciPipelineId: '999',
  ciPipelineUrl: 'https://gitlab.example.com/pipelines/999',
  ciProjectPath: 'group/project',
  projectAccessToken: 'secret-token',
  packagingDevhub: 'packaging-devhub',
  packageReleaseBranchPrefix: 'release/',
  vcsHost: 'gitlab.com',
  vcsProvider: 'gitlab' as const,
};

const sfdxProjectJson = {
  packageDirectories: [{ default: true, definitionFile: 'config/scratch-def.json', package: 'MyPackage' }],
};

function mockHappyPath(overrides: { coverage?: number; version?: string } = {}): void {
  vi.mocked(readSfdxProject).mockResolvedValue(sfdxProjectJson);
  vi.mocked(addGitRemote).mockResolvedValue('origin-alias');
  vi.mocked(execa).mockImplementation((async (cmd: string, args: readonly string[] = []) => {
    if (
      cmd === 'sf' &&
      args[0] === 'package' &&
      args[1] === 'version' &&
      args[2] === 'create' &&
      args[3] === 'report'
    ) {
      return {
        stdout: JSON.stringify({ result: [{ Status: 'Success', SubscriberPackageVersionId: '04t000000000001' }] }),
      };
    }
    if (cmd === 'sf' && args[0] === 'package' && args[1] === 'version' && args[2] === 'create') {
      return { stdout: JSON.stringify({ result: { Id: '08c000000000001' } }) };
    }
    if (cmd === 'sf' && args[0] === 'package' && args[1] === 'version' && args[2] === 'report') {
      return {
        stdout: JSON.stringify({
          result: {
            Version: overrides.version ?? '1.0.0.1',
            CodeCoverage: { apexCodeCoveragePercentage: overrides.coverage ?? 90 },
          },
        }),
      };
    }
    return { stdout: '' };
  }) as never);
}

describe('createPackageVersion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should skip when the pipeline was triggered by a merge request', async () => {
    await createPackageVersion({ ...baseOptions, ciPipelineSource: 'merge_request_event' });

    expect(logger.info).toHaveBeenCalledWith('Not a release branch build. Skipping package creation.');
    expect(execa).not.toHaveBeenCalled();
  });

  it('should skip when not a release branch and alwaysCreatePackage is not set', async () => {
    await createPackageVersion({ ...baseOptions, ciCommitRefName: 'feature/foo', alwaysCreatePackage: false });

    expect(logger.info).toHaveBeenCalledWith(
      'Not a release branch build and alwaysCreatePackage is not TRUE. Skipping package creation.',
    );
    expect(execa).not.toHaveBeenCalled();
  });

  it('should proceed on a non-release branch when alwaysCreatePackage is true', async () => {
    mockHappyPath();

    await createPackageVersion({ ...baseOptions, ciCommitRefName: 'feature/foo', alwaysCreatePackage: true });

    expect(execa).toHaveBeenCalledWith('sf', expect.arrayContaining(['--target-dev-hub', baseOptions.packagingDevhub]));
    expect(execa).toHaveBeenCalledWith('git', ['tag', '-a', 'v1.0.0.1-feature/foo', '-m', '04t000000000001']);
  });

  it('should create a package version, poll to completion, verify coverage, and tag/push on a release branch', async () => {
    mockHappyPath();

    await createPackageVersion(baseOptions);

    expect(addGitRemote).toHaveBeenCalledWith('999', 'secret-token', 'group/project', expect.anything());
    expect(execa).toHaveBeenCalledWith(
      'sf',
      expect.arrayContaining([
        'package',
        'version',
        'create',
        '--package',
        'MyPackage',
        '--definition-file',
        'config/scratch-def.json',
      ]),
    );
    expect(fsPromises.writeFile).toHaveBeenCalledWith(
      'subscriberPackageVersionId.env',
      'SUBSCRIBER_PACKAGE_VERSION_ID=04t000000000001',
    );
    expect(execa).toHaveBeenCalledWith('git', ['tag', '-a', 'v1.0.0.1', '-m', '04t000000000001']);
    expect(execa).toHaveBeenCalledWith('git', ['push', 'origin-alias', 'v1.0.0.1']);
    expect(logger.success).toHaveBeenCalledWith('Successfully created and pushed git tag: v1.0.0.1');
  });

  it('should suffix the version tag with the branch attribute for branched packages', async () => {
    vi.mocked(readSfdxProject).mockResolvedValue({
      packageDirectories: [
        { default: true, definitionFile: 'config/scratch-def.json', package: 'MyPackage', branch: 'feature-branch' },
      ],
    });
    vi.mocked(addGitRemote).mockResolvedValue('origin-alias');
    vi.mocked(execa).mockImplementation((async (cmd: string, args: readonly string[] = []) => {
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create' && args[3] === 'report') {
        return {
          stdout: JSON.stringify({ result: [{ Status: 'Success', SubscriberPackageVersionId: '04t000000000001' }] }),
        };
      }
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create') {
        return { stdout: JSON.stringify({ result: { Id: '08c000000000001' } }) };
      }
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'report') {
        return {
          stdout: JSON.stringify({ result: { Version: '1.0.0.1', CodeCoverage: { apexCodeCoveragePercentage: 90 } } }),
        };
      }
      return { stdout: '' };
    }) as never);

    await createPackageVersion(baseOptions);

    expect(execa).toHaveBeenCalledWith('sf', expect.arrayContaining(['--branch', 'feature-branch']));
    expect(execa).toHaveBeenCalledWith('git', ['tag', '-a', 'v1.0.0.1-feature-branch', '-m', '04t000000000001']);
  });

  it('should poll until the report status is no longer InProgress', async () => {
    vi.mocked(readSfdxProject).mockResolvedValue(sfdxProjectJson);
    vi.mocked(addGitRemote).mockResolvedValue('origin-alias');
    let reportCalls = 0;
    vi.useFakeTimers();
    vi.mocked(execa).mockImplementation((async (cmd: string, args: readonly string[] = []) => {
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create' && args[3] === 'report') {
        reportCalls += 1;
        if (reportCalls < 2) return { stdout: JSON.stringify({ result: [{ Status: 'InProgress' }] }) };
        return {
          stdout: JSON.stringify({ result: [{ Status: 'Success', SubscriberPackageVersionId: '04t000000000001' }] }),
        };
      }
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create') {
        return { stdout: JSON.stringify({ result: { Id: '08c000000000001' } }) };
      }
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'report') {
        return {
          stdout: JSON.stringify({ result: { Version: '1.0.0.1', CodeCoverage: { apexCodeCoveragePercentage: 90 } } }),
        };
      }
      return { stdout: '' };
    }) as never);

    const promise = createPackageVersion(baseOptions);
    await vi.runAllTimersAsync();
    await promise;
    vi.useRealTimers();

    expect(reportCalls).toBe(2);
  });

  it('should throw when the package version creation report status is Error', async () => {
    vi.mocked(readSfdxProject).mockResolvedValue(sfdxProjectJson);
    vi.mocked(addGitRemote).mockResolvedValue('origin-alias');
    vi.mocked(execa).mockImplementation((async (cmd: string, args: readonly string[] = []) => {
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create' && args[3] === 'report') {
        return { stdout: JSON.stringify({ result: [{ Status: 'Error', Error: 'boom' }] }) };
      }
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create') {
        return { stdout: JSON.stringify({ result: { Id: '08c000000000001' } }) };
      }
      return { stdout: '' };
    }) as never);

    await expect(createPackageVersion(baseOptions)).rejects.toThrow('Package creation failed: boom');
  });

  it('should throw when code coverage is below the required minimum', async () => {
    mockHappyPath({ coverage: 50 });

    await expect(createPackageVersion({ ...baseOptions, codeCoverageMinimum: '75' })).rejects.toThrow(
      'Code coverage of 50% is less than the required minimum of 75%.',
    );
    expect(execa).not.toHaveBeenCalledWith('git', expect.arrayContaining(['tag']));
  });

  it("should prefer the project's own minimum coverage requirement over --code-coverage-minimum", async () => {
    vi.mocked(readSfdxProject).mockResolvedValue({
      ...sfdxProjectJson,
      plugins: { simply: { coverageRequirement: { minimumCoverageRequired: '95' } } },
    });
    vi.mocked(addGitRemote).mockResolvedValue('origin-alias');
    vi.mocked(execa).mockImplementation((async (cmd: string, args: readonly string[] = []) => {
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create' && args[3] === 'report') {
        return {
          stdout: JSON.stringify({ result: [{ Status: 'Success', SubscriberPackageVersionId: '04t000000000001' }] }),
        };
      }
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'create') {
        return { stdout: JSON.stringify({ result: { Id: '08c000000000001' } }) };
      }
      if (args[0] === 'package' && args[1] === 'version' && args[2] === 'report') {
        return {
          stdout: JSON.stringify({ result: { Version: '1.0.0.1', CodeCoverage: { apexCodeCoveragePercentage: 90 } } }),
        };
      }
      return { stdout: '' };
    }) as never);

    await expect(createPackageVersion({ ...baseOptions, codeCoverageMinimum: '75' })).rejects.toThrow(
      'Code coverage of 90% is less than the required minimum of 95%.',
    );
  });

  it('should throw when the default package directory is missing package or definitionFile', async () => {
    vi.mocked(readSfdxProject).mockResolvedValue({ packageDirectories: [{ default: true }] });
    vi.mocked(addGitRemote).mockResolvedValue('origin-alias');

    await expect(createPackageVersion(baseOptions)).rejects.toThrow(
      '`package` and `definitionFile` must be specified in the default package directory in sfdx-project.json',
    );
  });
});
