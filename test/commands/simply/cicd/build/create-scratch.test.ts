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
import { createScratchOrg } from '../../../../../src/common/build/createScratchOrg.js';
import BuildCreateScratch from '../../../../../src/commands/simply/cicd/build/create-scratch.js';

vi.mock('../../../../../src/common/build/createScratchOrg.js', () => ({ createScratchOrg: vi.fn() }));

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

describe('build create-scratch', () => {
  const originalPackageChanged = process.env.PACKAGE_CHANGED;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PACKAGE_CHANGED;
    vi.mocked(createScratchOrg).mockResolvedValue({ username: 'scratch@test' });
  });

  afterEach(() => {
    process.env.PACKAGE_CHANGED = originalPackageChanged;
  });

  it('parses Dev Hub flags and delegates to createScratchOrg', async () => {
    const result = await BuildCreateScratch.run([...baseArgs, '--scratch-duration-days', '2']);

    expect(result.skipped).toBe(false);
    expect(result.scratchOrg).toEqual({ username: 'scratch@test' });
    expect(createScratchOrg).toHaveBeenCalledWith(
      { jwtKeyFile: 'key.file', debug: false, scratchDefinitionFile: undefined, scratchDurationDays: '2' },
      [{ name: 'main', username: 'devhub@example.com', clientId: 'id', instanceUrl: 'https://login.salesforce.com' }],
    );
  });

  it('skips when --disabled is passed', async () => {
    const result = await BuildCreateScratch.run([...baseArgs, '--disabled']);

    expect(result.skipped).toBe(true);
    expect(createScratchOrg).not.toHaveBeenCalled();
  });

  it('skips when PACKAGE_CHANGED is FALSE', async () => {
    process.env.PACKAGE_CHANGED = 'FALSE';

    const result = await BuildCreateScratch.run(baseArgs);

    expect(result.skipped).toBe(true);
    expect(createScratchOrg).not.toHaveBeenCalled();
  });
});
