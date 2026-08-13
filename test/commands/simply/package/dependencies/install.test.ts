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

import { NamedPackageDir, SfProject } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { InstalledPackages, PackagingSObjects, SubscriberPackageVersion, VersionNumber } from '@salesforce/packaging';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import PackageDependenciesInstall from '../../../../../src/commands/simply/package/dependencies/install.js';

const SUBSCRIBER_PACKAGE_ID_A = '0330000000000AAA';
const SUBSCRIBER_PACKAGE_ID_B = '0330000000001AAA';

// Currently installed in the org: version 1.0.0.1 of package A.
const INSTALLED_VERSION_ID = '04t100000000000AAA';
// Same version as what's installed (1.0.0.1) but resolved via a different SubscriberPackageVersionId.
const SAME_VERSION_ID = '04t100000000004AAA';
// A newer version (1.1.0.1) of the same installed package.
const NEWER_VERSION_ID = '04t100000000001AAA';
// A package that isn't installed in the org at all.
const NOT_INSTALLED_VERSION_ID = '04t100000000003AAA';

const subscriberPackageIdByVersionId: Record<string, string> = {
  [SAME_VERSION_ID]: SUBSCRIBER_PACKAGE_ID_A,
  [NEWER_VERSION_ID]: SUBSCRIBER_PACKAGE_ID_A,
  [NOT_INSTALLED_VERSION_ID]: SUBSCRIBER_PACKAGE_ID_B,
};

const versionNumberByVersionId: Record<string, VersionNumber> = {
  [SAME_VERSION_ID]: new VersionNumber(1, 0, 0, 1),
  [NEWER_VERSION_ID]: new VersionNumber(1, 1, 0, 1),
};

const mockInstalledPackages: InstalledPackages[] = [
  {
    Id: 'installed-1',
    SubscriberPackageId: SUBSCRIBER_PACKAGE_ID_A,
    SubscriberPackageVersionId: INSTALLED_VERSION_ID,
    MinPackageVersionId: '',
    SubscriberPackageVersion: {
      Id: INSTALLED_VERSION_ID,
      MajorVersion: 1,
      MinorVersion: 0,
      PatchVersion: 0,
      BuildNumber: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as PackagingSObjects.SubscriberPackageVersion,
  },
];

function buildMockPackageDirectories(dependencyIds: string[]): NamedPackageDir[] {
  return [
    {
      path: 'force-app',
      name: 'force-app',
      fullPath: '/test/force-app',
      default: true,
      dependencies: dependencyIds.map((id) => ({ package: id })),
    },
  ];
}

describe('simply package dependencies install', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  function stubGetSubscriberPackageId() {
    $$.SANDBOX.stub(SubscriberPackageVersion.prototype, 'getSubscriberPackageId').callsFake(async function (this: {
      id: string;
    }) {
      return subscriberPackageIdByVersionId[this.id] ?? '0330000000009ZZZ';
    });
  }

  function stubGetVersionNumber() {
    $$.SANDBOX.stub(SubscriberPackageVersion.prototype, 'getVersionNumber').callsFake(async function (this: {
      id: string;
    }) {
      return versionNumberByVersionId[this.id];
    });
  }

  function stubInstallChain() {
    $$.SANDBOX.stub(SubscriberPackageVersion.prototype, 'getId').callsFake(async function (this: { id: string }) {
      return this.id;
    });
    $$.SANDBOX.stub(SubscriberPackageVersion.prototype, 'install').resolves({
      Id: 'install-request-1',
      Status: 'SUCCESS',
    } as never);
  }

  it('installs newer versions and skips packages that are not newer with --install-type Update', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(
      buildMockPackageDirectories([INSTALLED_VERSION_ID, SAME_VERSION_ID, NEWER_VERSION_ID, NOT_INSTALLED_VERSION_ID]),
    );
    $$.SANDBOX.stub(SubscriberPackageVersion, 'installedList').resolves(mockInstalledPackages);
    stubGetSubscriberPackageId();
    stubGetVersionNumber();
    stubInstallChain();

    const results = await PackageDependenciesInstall.run([
      '--target-org',
      testOrg.username,
      '--install-type',
      'Update',
      '--no-prompt',
    ]);

    const statusFor = (id: string): string | undefined =>
      results.find((result) => result.SubscriberPackageVersionId === id)?.Status;

    expect(statusFor(INSTALLED_VERSION_ID)).to.equal('Skipped');
    expect(statusFor(SAME_VERSION_ID)).to.equal('Skipped');
    expect(statusFor(NEWER_VERSION_ID)).to.equal('Installed');
    expect(statusFor(NOT_INSTALLED_VERSION_ID)).to.equal('Installed');
  });

  it('does not skip an installable version that merely has the same version number with the default --install-type Delta', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(
      buildMockPackageDirectories([SAME_VERSION_ID]),
    );
    $$.SANDBOX.stub(SubscriberPackageVersion, 'installedList').resolves(mockInstalledPackages);
    stubGetSubscriberPackageId();
    stubGetVersionNumber();
    stubInstallChain();

    const results = await PackageDependenciesInstall.run(['--target-org', testOrg.username, '--no-prompt']);

    expect(results).to.have.length(1);
    expect(results[0].Status).to.equal('Installed');
  });
});
