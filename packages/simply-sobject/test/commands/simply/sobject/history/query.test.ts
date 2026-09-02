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
import { SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import * as simplyCore from '@simplysf/simply-core';
import sinon from 'sinon';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import SObjectHistoryQuery from '../../../../../src/commands/simply/sobject/history/query.js';

vi.mock('@simplysf/simply-core', async () => {
  const actual = await vi.importActual<typeof import('@simplysf/simply-core')>('@simplysf/simply-core');
  return { ...actual, queryRecords: vi.fn() };
});

describe('simply sobject history query', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
    vi.mocked(simplyCore.queryRecords).mockReset();
  });

  it('should error without required --object flag', async () => {
    try {
      await SObjectHistoryQuery.run(['--target-org', testOrg.username]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('object');
    }
  });

  it('should error when the filters flag is not valid JSON', async () => {
    try {
      await SObjectHistoryQuery.run([
        '--target-org',
        testOrg.username,
        '--object',
        'Account',
        '--filters',
        '{not json',
      ]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Invalid filter configuration');
    }
  });

  it('should error when the filters flag fails schema validation', async () => {
    try {
      await SObjectHistoryQuery.run([
        '--target-org',
        testOrg.username,
        '--object',
        'Account',
        '--filters',
        '{"logic":"AND","filters":[{"field":"Field"}]}',
      ]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Filter configuration failed validation');
    }
  });

  it('should query without filters and write every record to CSV', async () => {
    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* () {
      yield {
        Id: 'h001',
        AccountId: '001xx0000000001',
        CreatedDate: '2026-01-15T10:00:00.000Z',
        CreatedById: '005xx0000000001',
        Field: 'Name',
        OldValue: 'Old Co',
        NewValue: 'New Co',
      };
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-history-query-'));

    try {
      const result = await SObjectHistoryQuery.run([
        '--target-org',
        testOrg.username,
        '--object',
        'Account',
        '--output-dir',
        outputDir,
      ]);

      expect(result.object).to.equal('Account');
      expect(result.historyObject).to.equal('AccountHistory');
      expect(result.totalQueried).to.equal(1);
      expect(result.totalWritten).to.equal(1);
      expect(fs.readFileSync(result.path, 'utf-8')).to.equal(
        'Id,ParentId,Field,OldValue,NewValue,CreatedById,CreatedDate\n' +
          'h001,001xx0000000001,Name,Old Co,New Co,005xx0000000001,2026-01-15T10:00:00.000Z\n',
      );

      const [, soqlArg] = vi.mocked(simplyCore.queryRecords).mock.calls[0];
      expect(soqlArg).to.equal(
        'SELECT CreatedById, CreatedDate, Field, Id, NewValue, OldValue, AccountId FROM AccountHistory ORDER BY CreatedDate DESC',
      );
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should push SOQL-filterable conditions into the WHERE clause and apply the rest client-side', async () => {
    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* () {
      yield {
        Id: 'h001',
        AccountId: '001xx0000000001',
        CreatedDate: '2026-01-15T10:00:00.000Z',
        CreatedById: '005xx0000000001',
        Field: 'Status__c',
        OldValue: 'Transmit to NFC',
        NewValue: 'Queued for NFC',
      };
      yield {
        Id: 'h002',
        AccountId: '001xx0000000002',
        CreatedDate: '2026-01-16T10:00:00.000Z',
        CreatedById: '005xx0000000001',
        Field: 'Status__c',
        OldValue: 'Something else',
        NewValue: 'Not a match',
      };
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-history-query-'));

    try {
      const result = await SObjectHistoryQuery.run([
        '--target-org',
        testOrg.username,
        '--object',
        'Account',
        '--output-dir',
        outputDir,
        '--filters',
        JSON.stringify({
          logic: 'AND',
          filters: [
            { field: 'Field', operator: '=', value: 'Status__c' },
            { field: 'NewValue', operator: '=', value: 'Queued for NFC' },
          ],
        }),
      ]);

      expect(result.totalQueried).to.equal(2);
      expect(result.totalWritten).to.equal(1);

      const csv = fs.readFileSync(result.path, 'utf-8');
      expect(csv).to.include('h001');
      expect(csv).not.to.include('h002');

      const [, soqlArg] = vi.mocked(simplyCore.queryRecords).mock.calls[0];
      // NewValue isn't SOQL-filterable, so the WHERE clause must contain only the Field
      // condition — nothing appended for the NewValue condition (it's applied client-side).
      expect(soqlArg).to.include("WHERE Field = 'Status__c' ORDER BY");
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
