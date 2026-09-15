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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { publishUtamPageObjects } from '../../../../../src/common/build/publishUtamPageObjects.js';
import BuildPublishUtamPageObjects from '../../../../../src/commands/simply/cicd/build/publish-utam-page-objects.js';

vi.mock('../../../../../src/common/build/publishUtamPageObjects.js', () => ({ publishUtamPageObjects: vi.fn() }));

const published = {
  skipped: false,
  published: true,
  packageName: '@acme/my-package-pageobjects',
  version: '1.2.3-4',
  distTag: 'latest',
};

describe('build publish-utam-page-objects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(publishUtamPageObjects).mockResolvedValue(published);
  });

  it('should delegate with the defaults every pipeline gets', async () => {
    const result = await BuildPublishUtamPageObjects.run(['--packaging-devhub', 'packaging-devhub']);

    expect(result).toEqual(published);
    expect(publishUtamPageObjects).toHaveBeenCalledWith({
      packagingDevhub: 'packaging-devhub',
      subscriberPackageVersionId: undefined,
      npmPackageName: undefined,
      npmRegistry: undefined,
      npmToken: undefined,
      npmAccess: undefined,
      npmDistTag: undefined,
      ciCommitRefName: undefined,
      packageReleaseBranchPrefix: undefined,
      utamVersion: '^3',
      dryRun: false,
      out: 'subscriberPackageVersionId.env',
      envFile: 'subscriberPackageVersionId.env',
      debug: false,
      disabled: false,
    });
  });

  it('should pass every flag through', async () => {
    await BuildPublishUtamPageObjects.run([
      '--packaging-devhub',
      'packaging-devhub',
      '--subscriber-package-version-id',
      '04t000000000000AAA',
      '--npm-package-name',
      '@acme/pageobjects',
      '--npm-registry',
      'https://registry.example.com/',
      '--npm-token',
      'secret',
      '--npm-access',
      'public',
      '--npm-dist-tag',
      'next',
      '--ci-commit-ref-name',
      'release/1.2',
      '--package-release-branch-prefix',
      'release/',
      '--utam-version',
      '3.2.2',
      '--dry-run',
      '--out',
      'out.env',
      '--env-file',
      'in.env',
      '--debug',
    ]);

    expect(publishUtamPageObjects).toHaveBeenCalledWith({
      packagingDevhub: 'packaging-devhub',
      subscriberPackageVersionId: '04t000000000000AAA',
      npmPackageName: '@acme/pageobjects',
      npmRegistry: 'https://registry.example.com/',
      npmToken: 'secret',
      npmAccess: 'public',
      npmDistTag: 'next',
      ciCommitRefName: 'release/1.2',
      packageReleaseBranchPrefix: 'release/',
      utamVersion: '3.2.2',
      dryRun: true,
      out: 'out.env',
      envFile: 'in.env',
      debug: true,
      disabled: false,
    });
  });

  it('should reject an unsupported --npm-access', async () => {
    await expect(
      BuildPublishUtamPageObjects.run(['--packaging-devhub', 'packaging-devhub', '--npm-access', 'internal']),
    ).rejects.toThrow();
  });

  it('should return the skip result unchanged', async () => {
    vi.mocked(publishUtamPageObjects).mockResolvedValue({ skipped: true, published: false });

    const result = await BuildPublishUtamPageObjects.run(['--packaging-devhub', 'packaging-devhub', '--disabled']);

    expect(result).toEqual({ skipped: true, published: false });
    expect(publishUtamPageObjects).toHaveBeenCalledWith(expect.objectContaining({ disabled: true }));
  });
});
