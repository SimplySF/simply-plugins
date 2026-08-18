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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupScratchOrgs } from '../../../../../src/common/build/cleanupScratchOrgs.js';
import BuildCleanupScratchOrgs from '../../../../../src/commands/simply/cicd/build/cleanup-scratch-orgs.js';

vi.mock('../../../../../src/common/build/cleanupScratchOrgs.js', () => ({ cleanupScratchOrgs: vi.fn() }));

const baseArgs = [
  '--dev-hub-name',
  'main',
  '--dev-hub-username',
  'devhub@example.com',
  '--dev-hub-client-id',
  'id',
  '--dev-hub-instance-url',
  'https://login.salesforce.com',
  '--jwt-key-file',
  'key.file',
];

describe('build cleanup-scratch-orgs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(cleanupScratchOrgs).mockResolvedValue(undefined);
  });

  it('parses --dev-hub-* flags into Dev Hub configs and delegates to cleanupScratchOrgs', async () => {
    const result = await BuildCleanupScratchOrgs.run(baseArgs);

    expect(result.skipped).toBe(false);
    expect(cleanupScratchOrgs).toHaveBeenCalledWith({ jwtKeyFile: 'key.file', debug: false }, [
      { name: 'main', username: 'devhub@example.com', clientId: 'id', instanceUrl: 'https://login.salesforce.com' },
    ]);
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildCleanupScratchOrgs.run([...baseArgs, '--disabled']);

    expect(result.skipped).toBe(true);
    expect(cleanupScratchOrgs).not.toHaveBeenCalled();
  });
});
