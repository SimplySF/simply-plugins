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

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

// Every dependency's SubscriberPackageVersionId resolves to its parent SubscriberPackageId, since
// the command always resolves this (regardless of --install-type) to report the existing package.
const subscriberPackageIdByVersionId: Record<string, string> = {
  [INSTALLED_VERSION_ID]: SUBSCRIBER_PACKAGE_ID_A,
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

  it('installs newer versions and skips packages that are not newer with --install-type Upgrade', async () => {
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
      'Upgrade',
      '--no-prompt',
    ]);

    const resultFor = (id: string) => results.find((result) => result.SubscriberPackageVersionId === id);

    expect(resultFor(INSTALLED_VERSION_ID)?.Status).to.equal('Skipped');
    expect(resultFor(INSTALLED_VERSION_ID)?.ExistingSubscriberPackageVersionId).to.equal(INSTALLED_VERSION_ID);

    expect(resultFor(SAME_VERSION_ID)?.Status).to.equal('Skipped');
    expect(resultFor(SAME_VERSION_ID)?.ExistingSubscriberPackageVersionId).to.equal(INSTALLED_VERSION_ID);

    expect(resultFor(NEWER_VERSION_ID)?.Status).to.equal('Installed');
    expect(resultFor(NEWER_VERSION_ID)?.ExistingSubscriberPackageVersionId).to.equal(INSTALLED_VERSION_ID);

    expect(resultFor(NOT_INSTALLED_VERSION_ID)?.Status).to.equal('Installed');
    expect(resultFor(NOT_INSTALLED_VERSION_ID)?.ExistingSubscriberPackageVersionId).to.equal('');
  });

  it('does not skip an installable version that merely has the same version number with --install-type Delta', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(
      buildMockPackageDirectories([SAME_VERSION_ID]),
    );
    $$.SANDBOX.stub(SubscriberPackageVersion, 'installedList').resolves(mockInstalledPackages);
    stubGetSubscriberPackageId();
    stubGetVersionNumber();
    stubInstallChain();

    const results = await PackageDependenciesInstall.run([
      '--target-org',
      testOrg.username,
      '--install-type',
      'Delta',
      '--no-prompt',
    ]);

    expect(results).to.have.length(1);
    expect(results[0].Status).to.equal('Installed');
    expect(results[0].ExistingSubscriberPackageVersionId).to.equal(INSTALLED_VERSION_ID);
  });

  it('does not skip anything, but still reports the existing package, with --install-type All', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(
      buildMockPackageDirectories([INSTALLED_VERSION_ID]),
    );
    $$.SANDBOX.stub(SubscriberPackageVersion, 'installedList').resolves(mockInstalledPackages);
    stubGetSubscriberPackageId();
    stubGetVersionNumber();
    stubInstallChain();

    const results = await PackageDependenciesInstall.run([
      '--target-org',
      testOrg.username,
      '--install-type',
      'All',
      '--no-prompt',
    ]);

    expect(results).to.have.length(1);
    expect(results[0].Status).to.equal('Installed');
    expect(results[0].ExistingSubscriberPackageVersionId).to.equal(INSTALLED_VERSION_ID);
  });

  it('defaults --install-type to Upgrade when not specified', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(
      buildMockPackageDirectories([SAME_VERSION_ID, NEWER_VERSION_ID]),
    );
    $$.SANDBOX.stub(SubscriberPackageVersion, 'installedList').resolves(mockInstalledPackages);
    stubGetSubscriberPackageId();
    stubGetVersionNumber();
    stubInstallChain();

    const results = await PackageDependenciesInstall.run(['--target-org', testOrg.username, '--no-prompt']);

    const statusFor = (id: string): string | undefined =>
      results.find((result) => result.SubscriberPackageVersionId === id)?.Status;

    expect(statusFor(SAME_VERSION_ID)).to.equal('Skipped');
    expect(statusFor(NEWER_VERSION_ID)).to.equal('Installed');
  });

  it('writes a JSON install report to --output-file, including the existing package', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(
      buildMockPackageDirectories([NEWER_VERSION_ID, NOT_INSTALLED_VERSION_ID]),
    );
    $$.SANDBOX.stub(SubscriberPackageVersion, 'installedList').resolves(mockInstalledPackages);
    stubGetSubscriberPackageId();
    stubGetVersionNumber();
    stubInstallChain();

    const outputFile = path.join(os.tmpdir(), `simply-package-install-report-${Date.now()}.json`);

    try {
      const results = await PackageDependenciesInstall.run([
        '--target-org',
        testOrg.username,
        '--install-type',
        'Upgrade',
        '--no-prompt',
        '--output-file',
        outputFile,
      ]);

      expect(fs.existsSync(outputFile)).to.be.true;
      const reportContents: unknown = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      expect(reportContents).to.deep.equal(results);

      const newerResult = results.find((result) => result.SubscriberPackageVersionId === NEWER_VERSION_ID);
      expect(newerResult?.ExistingSubscriberPackageVersionId).to.equal(INSTALLED_VERSION_ID);

      const notInstalledResult = results.find(
        (result) => result.SubscriberPackageVersionId === NOT_INSTALLED_VERSION_ID,
      );
      expect(notInstalledResult?.ExistingSubscriberPackageVersionId).to.equal('');
    } finally {
      fs.rmSync(outputFile, { force: true });
    }
  });

  it('writes a report even when there are no packages to install', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(buildMockPackageDirectories([]));

    const outputFile = path.join(os.tmpdir(), `simply-package-install-report-${Date.now()}.json`);

    try {
      const results = await PackageDependenciesInstall.run([
        '--target-org',
        testOrg.username,
        '--output-file',
        outputFile,
      ]);

      expect(results).to.deep.equal([]);
      expect(fs.existsSync(outputFile)).to.be.true;
      expect(JSON.parse(fs.readFileSync(outputFile, 'utf-8'))).to.deep.equal([]);
    } finally {
      fs.rmSync(outputFile, { force: true });
    }
  });

  it('does not write a report when --output-file is not specified', async () => {
    $$.SANDBOX.stub(SfProject.prototype, 'getPackageDirectories').returns(buildMockPackageDirectories([]));
    const writeFileSpy = $$.SANDBOX.spy(fsPromises, 'writeFile');

    await PackageDependenciesInstall.run(['--target-org', testOrg.username]);

    expect(writeFileSpy.called).to.be.false;
  });
});
