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
import { pushToScratch } from '../../../../../src/common/build/pushScratch.js';
import BuildPushScratch from '../../../../../src/commands/simply/cicd/build/push-scratch.js';

vi.mock('../../../../../src/common/build/pushScratch.js', () => ({ pushToScratch: vi.fn() }));

describe('build push-scratch', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(pushToScratch).mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('delegates to pushToScratch with parsed flags', async () => {
    const result = await BuildPushScratch.run([
      '--jwt-key-file',
      'key.file',
      '--ignore-warnings',
      '--scratch-org-source-dir',
      'force-app',
    ]);

    expect(result.skipped).toBe(false);
    expect(pushToScratch).toHaveBeenCalledWith({
      jwtKeyFile: 'key.file',
      debug: false,
      ignoreWarnings: true,
      scratchOrgSourceDir: 'force-app',
    });
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildPushScratch.run(['--jwt-key-file', 'key.file', '--disabled']);

    expect(result.skipped).toBe(true);
    expect(pushToScratch).not.toHaveBeenCalled();
  });

  it('skips when PACKAGE_CHANGED is FALSE', async () => {
    process.env.PACKAGE_CHANGED = 'FALSE';

    const result = await BuildPushScratch.run(['--jwt-key-file', 'key.file']);

    expect(result.skipped).toBe(true);
    expect(pushToScratch).not.toHaveBeenCalled();
  });
});
