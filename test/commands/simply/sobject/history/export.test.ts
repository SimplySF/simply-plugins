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
import os from 'node:os';
import path from 'node:path';
import { SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import * as simplyCore from '@simplysf/simply-core';
import sinon from 'sinon';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import SObjectHistoryExport from '../../../../../src/commands/simply/sobject/history/export.js';

vi.mock('@simplysf/simply-core', async () => {
  const actual = await vi.importActual<typeof import('@simplysf/simply-core')>('@simplysf/simply-core');
  return { ...actual, queryRecords: vi.fn() };
});

describe('simply sobject history export', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
    vi.mocked(simplyCore.queryRecords).mockReset();
  });

  it('should error without required flags', async () => {
    try {
      await SObjectHistoryExport.run(['--target-org', testOrg.username]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('sobject');
      expect(error.message).to.include('start-date');
      expect(error.message).to.include('end-date');
    }
  });

  it('should reject a malformed date', async () => {
    try {
      await SObjectHistoryExport.run([
        '--target-org',
        testOrg.username,
        '--sobject',
        'Account',
        '--start-date',
        '01-01-2026',
        '--end-date',
        '2026-01-31',
      ]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('start-date');
    }
  });

  it('should query the standard-object history table and write a mapped CSV', async () => {
    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* () {
      yield {
        Id: 'h001',
        AccountId: '001xx0000000001',
        CreatedDate: '2026-01-15T10:00:00.000Z',
        CreatedById: '005xx0000000001',
        'CreatedBy.Name': 'Jane Doe',
        Field: 'Name',
        OldValue: 'Old Co',
        NewValue: 'New Co',
      };
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-history-export-'));

    try {
      const result = await SObjectHistoryExport.run([
        '--target-org',
        testOrg.username,
        '--sobject',
        'Account',
        '--start-date',
        '2026-01-01',
        '--end-date',
        '2026-01-31',
        '--output-dir',
        outputDir,
      ]);

      expect(result.sobject).to.equal('Account');
      expect(result.historyObject).to.equal('AccountHistory');
      expect(result.recordCount).to.equal(1);
      expect(result.path.startsWith(outputDir)).to.be.true;
      expect(fs.readFileSync(result.path, 'utf-8')).to.equal(
        'HISTORY_ID,PARENT_ID,CREATED_DATE,CREATED_BY_ID,CREATED_BY_NAME,FIELD_API_NAME,OLD_VALUE,NEW_VALUE\n' +
          'h001,001xx0000000001,2026-01-15T10:00:00.000Z,005xx0000000001,Jane Doe,Name,Old Co,New Co\n',
      );

      const [, soqlArg] = vi.mocked(simplyCore.queryRecords).mock.calls[0];
      expect(soqlArg).to.equal(
        'SELECT Id, AccountId, CreatedDate, CreatedById, CreatedBy.Name, Field, OldValue, NewValue ' +
          'FROM AccountHistory WHERE CreatedDate >= 2026-01-01T00:00:00Z AND CreatedDate <= 2026-01-31T23:59:59Z ORDER BY CreatedDate DESC',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should use OpportunityFieldHistory for the Opportunity sobject', async () => {
    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* () {
      // no records
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-history-export-'));

    try {
      const result = await SObjectHistoryExport.run([
        '--target-org',
        testOrg.username,
        '--sobject',
        'Opportunity',
        '--start-date',
        '2026-01-01',
        '--end-date',
        '2026-01-31',
        '--output-dir',
        outputDir,
      ]);

      expect(result.historyObject).to.equal('OpportunityFieldHistory');

      const [, soqlArg] = vi.mocked(simplyCore.queryRecords).mock.calls[0];
      expect(soqlArg).to.include('FROM OpportunityFieldHistory');
      expect(soqlArg).to.include('OpportunityId');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
