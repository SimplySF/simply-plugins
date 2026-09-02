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
import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installPackageDependencies, resolveUpgradedPackages } from '../../src/common/sfPackages.js';

vi.mock('execa');
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn() } };
});
vi.mock('../../src/common/logger.js', () => ({
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

const devhubConfig = { packagingDevhub: 'packaging-devhub' };

describe('installPackageDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as never);
  });

  it('passes --output-file only when provided', async () => {
    await installPackageDependencies({ outputFile: '/tmp/report.json' });

    expect(execa).toHaveBeenCalledWith(
      'sf',
      expect.arrayContaining(['--output-file', '/tmp/report.json']),
      expect.any(Object),
    );

    vi.mocked(execa).mockClear();
    await installPackageDependencies({});

    const [, args] = vi.mocked(execa).mock.calls[0];
    expect(args).not.toContain('--output-file');
  });
});

describe('resolveUpgradedPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function stubReport(entries: unknown[]): void {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(entries));
  }

  it('returns an empty array when nothing in the report upgraded an existing package', async () => {
    stubReport([
      { PackageName: 'A', ExistingSubscriberPackageVersionId: '', SubscriberPackageVersionId: '04t1', Status: '' },
      {
        PackageName: 'B',
        ExistingSubscriberPackageVersionId: '04t2',
        SubscriberPackageVersionId: '04t2',
        Status: 'Skipped',
      },
    ]);

    const result = await resolveUpgradedPackages('/tmp/report.json', devhubConfig);

    expect(result).toEqual([]);
  });

  it('returns an empty array and warns when no packaging DevHub alias is given', async () => {
    stubReport([
      {
        PackageName: 'A',
        ExistingSubscriberPackageVersionId: '04t1',
        SubscriberPackageVersionId: '04t2',
        Status: 'Installed',
      },
    ]);

    const result = await resolveUpgradedPackages('/tmp/report.json', {});

    expect(result).toEqual([]);
  });

  it('builds an UpgradedPackage entry from the prev/target version reports', async () => {
    stubReport([
      {
        PackageName: 'MyDependency',
        ExistingSubscriberPackageVersionId: '04t1',
        SubscriberPackageVersionId: '04t2',
        Status: 'Installed',
      },
    ]);
    vi.mocked(execa).mockImplementation((async (_cmd: string, args: string[] = []) => {
      const packageId = args[args.indexOf('--package') + 1];
      const reports: Record<string, unknown> = {
        '04t1': { Version: '1.0.0.1', Tag: 'sha-prev' },
        '04t2': { Version: '1.1.0.1', Tag: 'sha-target', Description: 'https://gitlab.com/g/p/-/pipelines/1' },
      };
      return { stdout: JSON.stringify({ result: reports[packageId] }) };
    }) as never);

    const result = await resolveUpgradedPackages('/tmp/report.json', devhubConfig);

    expect(execa).toHaveBeenCalledWith('sf', expect.arrayContaining(['--target-dev-hub', 'packaging-devhub']));
    expect(result).toEqual([
      {
        packageName: 'MyDependency',
        prevVersionId: '04t1',
        prevVersionNumber: '1.0.0.1',
        prevTag: 'sha-prev',
        targetVersionId: '04t2',
        targetVersionNumber: '1.1.0.1',
        targetTag: 'sha-target',
        targetDescription: 'https://gitlab.com/g/p/-/pipelines/1',
      },
    ]);
  });

  it('skips a package whose version report could not be resolved', async () => {
    stubReport([
      {
        PackageName: 'Broken',
        ExistingSubscriberPackageVersionId: '04t1',
        SubscriberPackageVersionId: '04t2',
        Status: 'Installed',
      },
    ]);
    vi.mocked(execa).mockRejectedValue(new Error('package not found'));

    const result = await resolveUpgradedPackages('/tmp/report.json', devhubConfig);

    expect(result).toEqual([]);
  });
});
