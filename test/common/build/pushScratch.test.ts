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
import { pushToScratch } from '../../../src/common/build/pushScratch.js';

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

const mockScratchOrgInfo = { authFields: { username: 'test', clientId: 'id', instanceUrl: 'url' } };

describe('pushToScratch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fsPromises.readFile).mockImplementation(async (filePath) => {
      if ((filePath as string).includes('SCRATCH_ORG_INFO.json')) {
        return JSON.stringify(mockScratchOrgInfo);
      }
      return JSON.stringify({ packageDirectories: [{ default: true }] });
    });
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as never);
  });

  it('should authenticate, strip incompatible metadata, and push source to the scratch org', async () => {
    await pushToScratch({ jwtKeyFile: 'key.file' });

    expect(authenticateOrg).toHaveBeenCalledWith({
      username: mockScratchOrgInfo.authFields.username,
      clientId: mockScratchOrgInfo.authFields.clientId,
      instanceUrl: mockScratchOrgInfo.authFields.instanceUrl,
      jwtKeyFile: 'key.file',
      setDefault: true,
      debug: undefined,
    });
    expect(execa).toHaveBeenCalledWith('find', expect.arrayContaining(['-name', '*.eca-meta.xml', '-delete']));
    expect(execa).toHaveBeenCalledWith('sf', ['project', 'deploy', 'start', '--ignore-conflicts', '--wait', '120'], {
      stdio: 'inherit',
    });
    expect(logger.success).toHaveBeenCalledWith('Source pushed to scratch org.');
  });

  it('should append --ignore-warnings when requested', async () => {
    await pushToScratch({ jwtKeyFile: 'key.file', ignoreWarnings: true });

    expect(execa).toHaveBeenCalledWith('sf', expect.arrayContaining(['--ignore-warnings']), { stdio: 'inherit' });
  });

  it('should push scratchOrgSourceDir and the default package directory seedMetadata path, when declared', async () => {
    vi.mocked(fsPromises.readFile).mockImplementation(async (filePath) => {
      if ((filePath as string).includes('SCRATCH_ORG_INFO.json')) {
        return JSON.stringify(mockScratchOrgInfo);
      }
      return JSON.stringify({ packageDirectories: [{ default: true, seedMetadata: { path: 'seed-app' } }] });
    });

    await pushToScratch({ jwtKeyFile: 'key.file', scratchOrgSourceDir: 'force-app' });

    expect(execa).toHaveBeenCalledWith(
      'sf',
      [
        'project',
        'deploy',
        'start',
        '--ignore-conflicts',
        '--wait',
        '120',
        '--source-dir',
        'force-app',
        '--source-dir',
        'seed-app',
      ],
      { stdio: 'inherit' },
    );
  });

  it('should not append a seedMetadata source-dir when none is declared', async () => {
    await pushToScratch({ jwtKeyFile: 'key.file', scratchOrgSourceDir: 'force-app' });

    expect(execa).toHaveBeenCalledWith(
      'sf',
      ['project', 'deploy', 'start', '--ignore-conflicts', '--wait', '120', '--source-dir', 'force-app'],
      { stdio: 'inherit' },
    );
  });
});
