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

import { promises as fsPromises } from 'node:fs';
import { execa } from 'execa';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from '../../../src/common/logger.js';
import { authenticateOrg } from '../../../src/common/sfAuth.js';
import { deleteScratchOrg } from '../../../src/common/build/deleteScratchOrg.js';

vi.mock('execa');
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, promises: { ...actual.promises, readFile: vi.fn() } };
});
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

const mockScratchOrgInfo = {
  authFields: {
    username: 'scratch@test',
    clientId: 'scratch-id',
    instanceUrl: 'scratch-url',
    devHubUsername: 'devhub@example.com',
  },
};
const devHubs = [
  { name: 'main', username: 'devhub@example.com', clientId: 'hub-id', instanceUrl: 'https://login.salesforce.com' },
];

describe('deleteScratchOrg', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fsPromises.readFile).mockResolvedValue(JSON.stringify(mockScratchOrgInfo));
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as never);
  });

  it('should authenticate to the owning Dev Hub and the scratch org, then delete it', async () => {
    await deleteScratchOrg({ jwtKeyFile: 'key.file' }, devHubs);

    expect(authenticateOrg).toHaveBeenCalledWith({
      username: 'devhub@example.com',
      clientId: 'hub-id',
      instanceUrl: 'https://login.salesforce.com',
      jwtKeyFile: 'key.file',
      setDefaultDevHub: true,
      debug: undefined,
    });
    expect(authenticateOrg).toHaveBeenCalledWith({
      username: 'scratch@test',
      clientId: 'scratch-id',
      instanceUrl: 'scratch-url',
      jwtKeyFile: 'key.file',
      setDefault: true,
      debug: undefined,
    });
    expect(execa).toHaveBeenCalledWith('sf', ['org', 'delete', 'scratch', '--no-prompt'], { stdio: 'inherit' });
    expect(logger.success).toHaveBeenCalledWith('Scratch org deleted.');
  });

  it('should log (not throw) when the owning Dev Hub configuration cannot be found', async () => {
    await expect(deleteScratchOrg({ jwtKeyFile: 'key.file' }, [])).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to delete scratch org. It may need to be deleted manually.',
      expect.stringContaining('Could not find Dev Hub configuration for username: devhub@example.com'),
    );
    expect(execa).not.toHaveBeenCalled();
  });

  it('should log (not throw) when the delete command fails', async () => {
    vi.mocked(execa).mockRejectedValue(new Error('delete failed'));

    await expect(deleteScratchOrg({ jwtKeyFile: 'key.file' }, devHubs)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      'Failed to delete scratch org. It may need to be deleted manually.',
      'delete failed',
    );
  });
});
