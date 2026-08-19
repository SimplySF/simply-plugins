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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Connection, SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import * as simplyCore from '@simplysf/simply-core';
import sinon, { type SinonStub } from 'sinon';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import SObjectBackup from '../../../../src/commands/simply/sobject/backup.js';

vi.mock('@simplysf/simply-core', async () => {
  const actual = await vi.importActual<typeof import('@simplysf/simply-core')>('@simplysf/simply-core');
  return { ...actual, queryRecords: vi.fn() };
});

describe('simply sobject backup', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
    vi.mocked(simplyCore.queryRecords).mockReset();
  });

  it('should error without required --sobject flag', async () => {
    try {
      await SObjectBackup.run(['--target-org', testOrg.username]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('sobject');
    }
  });

  it('should describe the sobject, stream results to a CSV, and report the record count', async () => {
    // Connection#describe wraps Connection.prototype.describe in a per-instance memoizing
    // cache at construction time (jsforce's Connection constructor), so it can't be stubbed
    // reliably on the prototype or on a separately-obtained instance. @salesforce/core's
    // TestContext already stubs Connection.prototype.request() (which describe() calls
    // internally) as part of its default setup, so reconfigure that existing stub instead of
    // wrapping it a second time.
    (Connection.prototype.request as unknown as SinonStub).resolves({
      fields: [{ name: 'Id' }, { name: 'Name' }],
    });

    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* () {
      yield { Id: '001', Name: 'Foo' };
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-backup-'));

    try {
      const result = await SObjectBackup.run([
        '--target-org',
        testOrg.username,
        '--sobject',
        'Account',
        '--output-dir',
        outputDir,
      ]);

      expect(result.sobject).to.equal('Account');
      expect(result.recordCount).to.equal(1);
      expect(result.path.startsWith(outputDir)).to.be.true;
      expect(fs.readFileSync(result.path, 'utf-8')).to.equal('Id,Name\n001,Foo\n');

      const [, soqlArg] = vi.mocked(simplyCore.queryRecords).mock.calls[0];
      expect(soqlArg).to.equal('SELECT Id,Name FROM Account');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('discovers and includes parent relationship fields when --include-relationship-fields is set', async () => {
    (Connection.prototype.request as unknown as SinonStub).callsFake(async (request: unknown) => {
      const url = typeof request === 'string' ? request : (request as { url: string }).url;

      if (url.includes('/sobjects/RecordType/describe')) {
        return {
          fields: [{ name: 'Id' }, { name: 'Name', nameField: true }, { name: 'DeveloperName', nameField: false }],
        };
      }

      return {
        fields: [
          { name: 'Id' },
          { name: 'Name' },
          {
            name: 'RecordTypeId',
            type: 'reference',
            relationshipName: 'RecordType',
            referenceTo: ['RecordType'],
          },
        ],
      };
    });

    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* () {
      yield {
        Id: '001',
        Name: 'Foo',
        RecordTypeId: '012',
        'RecordType.Name': 'Master',
        'RecordType.DeveloperName': 'Master',
      };
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-backup-'));

    try {
      const result = await SObjectBackup.run([
        '--target-org',
        testOrg.username,
        '--sobject',
        'Account',
        '--output-dir',
        outputDir,
        '--include-relationship-fields',
      ]);

      expect(result.recordCount).to.equal(1);

      const [, soqlArg] = vi.mocked(simplyCore.queryRecords).mock.calls[0];
      expect(soqlArg).to.equal('SELECT Id,Name,RecordTypeId,RecordType.Name,RecordType.DeveloperName FROM Account');

      const csvContent = fs.readFileSync(result.path, 'utf-8');
      expect(csvContent).to.equal(
        'Id,Name,RecordTypeId,RecordType.Name,RecordType.DeveloperName\n001,Foo,012,Master,Master\n',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('does not discover relationship fields when --include-relationship-fields is not set', async () => {
    (Connection.prototype.request as unknown as SinonStub).resolves({
      fields: [
        { name: 'Id' },
        {
          name: 'RecordTypeId',
          type: 'reference',
          relationshipName: 'RecordType',
          referenceTo: ['RecordType'],
        },
      ],
    });

    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* () {
      yield { Id: '001', RecordTypeId: '012' };
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-backup-'));

    try {
      await SObjectBackup.run(['--target-org', testOrg.username, '--sobject', 'Account', '--output-dir', outputDir]);

      const [, soqlArg] = vi.mocked(simplyCore.queryRecords).mock.calls[0];
      expect(soqlArg).to.equal('SELECT Id,RecordTypeId FROM Account');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
