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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDependencies } from '@simplysf/simply-cicd-core';
import BuildInstallDependencies from '../../../../../src/commands/simply/cicd/build/install-dependencies.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  installDependencies: vi.fn(),
}));

describe('build install-dependencies', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    delete process.env.SIMPLY_CICD_PACKAGE_CHANGED;
    vi.mocked(installDependencies).mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
    delete process.env.SIMPLY_CICD_PACKAGE_CHANGED;
  });

  it('defaults --install-type to Upgrade and --upgrade-type to Mixed, and delegates to installDependencies', async () => {
    const result = await BuildInstallDependencies.run(['--jwt-key-file', 'key.file']);

    expect(result.skipped).toBe(false);
    expect(installDependencies).toHaveBeenCalledWith({
      jwtKeyFile: 'key.file',
      debug: false,
      installType: 'Upgrade',
      upgradeType: 'Mixed',
      retryAttempts: 0,
      retryBackoff: 2,
      packageRetryAttempts: undefined,
    });
  });

  it('accepts an explicit --upgrade-type', async () => {
    await BuildInstallDependencies.run(['--jwt-key-file', 'key.file', '--upgrade-type', 'DeprecateOnly']);

    expect(installDependencies).toHaveBeenCalledWith(expect.objectContaining({ upgradeType: 'DeprecateOnly' }));
  });

  it('rejects an unknown --upgrade-type', async () => {
    await expect(
      BuildInstallDependencies.run(['--jwt-key-file', 'key.file', '--upgrade-type', 'Purge']),
    ).rejects.toThrow(/Expected --upgrade-type=Purge to be one of: DeprecateOnly, Mixed, Delete/);
    expect(installDependencies).not.toHaveBeenCalled();
  });

  it('accepts an explicit --install-type', async () => {
    await BuildInstallDependencies.run(['--jwt-key-file', 'key.file', '--install-type', 'Delta']);

    expect(installDependencies).toHaveBeenCalledWith(expect.objectContaining({ installType: 'Delta' }));
  });

  it('accepts retry flags and forwards them to installDependencies', async () => {
    await BuildInstallDependencies.run([
      '--jwt-key-file',
      'key.file',
      '--retry-attempts',
      '3',
      '--retry-backoff',
      '4',
      '--package-retry-attempts',
      'MyPackageAlias:5',
      '--package-retry-attempts',
      '04t123456789012:2',
    ]);

    expect(installDependencies).toHaveBeenCalledWith(
      expect.objectContaining({
        retryAttempts: 3,
        retryBackoff: 4,
        packageRetryAttempts: ['MyPackageAlias:5', '04t123456789012:2'],
      }),
    );
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildInstallDependencies.run(['--jwt-key-file', 'key.file', '--disabled']);

    expect(result.skipped).toBe(true);
    expect(installDependencies).not.toHaveBeenCalled();
  });

  it('skips when SIMPLY_CICD_PACKAGE_CHANGED is FALSE', async () => {
    process.env.SIMPLY_CICD_PACKAGE_CHANGED = 'FALSE';

    const result = await BuildInstallDependencies.run(['--jwt-key-file', 'key.file']);

    expect(result.skipped).toBe(true);
    expect(installDependencies).not.toHaveBeenCalled();
  });
});
