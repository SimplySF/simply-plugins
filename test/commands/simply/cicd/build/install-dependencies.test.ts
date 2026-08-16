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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDependencies } from '../../../../../src/common/build/installDependencies.js';
import BuildInstallDependencies from '../../../../../src/commands/simply/cicd/build/install-dependencies.js';

vi.mock('../../../../../src/common/build/installDependencies.js', () => ({ installDependencies: vi.fn() }));

describe('build install-dependencies', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(installDependencies).mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('defaults --install-type to Upgrade and delegates to installDependencies', async () => {
    const result = await BuildInstallDependencies.run(['--jwt-key-file', 'key.file']);

    expect(result.skipped).toBe(false);
    expect(installDependencies).toHaveBeenCalledWith({ jwtKeyFile: 'key.file', debug: false, installType: 'Upgrade' });
  });

  it('accepts an explicit --install-type', async () => {
    await BuildInstallDependencies.run(['--jwt-key-file', 'key.file', '--install-type', 'Delta']);

    expect(installDependencies).toHaveBeenCalledWith(expect.objectContaining({ installType: 'Delta' }));
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildInstallDependencies.run(['--jwt-key-file', 'key.file', '--disabled']);

    expect(result.skipped).toBe(true);
    expect(installDependencies).not.toHaveBeenCalled();
  });

  it('skips when PACKAGE_CHANGED is FALSE', async () => {
    process.env.PACKAGE_CHANGED = 'FALSE';

    const result = await BuildInstallDependencies.run(['--jwt-key-file', 'key.file']);

    expect(result.skipped).toBe(true);
    expect(installDependencies).not.toHaveBeenCalled();
  });
});
