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
import SObjectDeduplicate from '../../../../src/commands/simply/sobject/deduplicate.js';

vi.mock('@simplysf/simply-core', async () => {
  const actual = await vi.importActual<typeof import('@simplysf/simply-core')>('@simplysf/simply-core');
  return { ...actual, queryRecords: vi.fn() };
});

describe('simply sobject deduplicate', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
    vi.mocked(simplyCore.queryRecords).mockReset();
  });

  it('should error without required --config flag', async () => {
    try {
      await SObjectDeduplicate.run(['--target-org', testOrg.username]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('config');
    }
  });

  it('should error when the config file fails schema validation', async () => {
    const tmpFile = path.join(os.tmpdir(), `simply-sobject-deduplicate-test-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify({ primaryObjectApiName: 'Account' }));

    try {
      await SObjectDeduplicate.run(['--target-org', testOrg.username, '--config', tmpFile]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('invalid');
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });

  it('should identify duplicates and replace lookups on associated objects using the bulk stream', async () => {
    const configFile = path.join(os.tmpdir(), `simply-sobject-deduplicate-config-${Date.now()}.json`);
    fs.writeFileSync(
      configFile,
      JSON.stringify({
        primaryObjectApiName: 'Contact',
        primaryObjectCompositeKeyField: 'DuplicateKey',
        primaryObjectCompositeKeyFields: ['Email'],
        primaryObjectFields: ['Id', 'Email'],
        associatedObjects: { Case: ['ContactId'] },
      }),
    );

    vi.mocked(simplyCore.queryRecords).mockImplementation(async function* (_conn, soql): AsyncGenerator<
      Record<string, string>
    > {
      if (soql.includes('FROM Case')) {
        yield { Id: 'c1', ContactId: '002', 'ContactId.Email': 'a@example.com' };
      } else {
        yield { Id: '001', Email: 'a@example.com' };
        yield { Id: '002', Email: 'a@example.com' };
        yield { Id: '003', Email: 'b@example.com' };
      }
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-deduplicate-'));

    try {
      const result = await SObjectDeduplicate.run([
        '--target-org',
        testOrg.username,
        '--config',
        configFile,
        '--output-dir',
        outputDir,
      ]);

      expect(result.totalRecords).to.equal(3);
      expect(result.duplicateCount).to.equal(1);
      expect(result.uniqueCount).to.equal(2);
      expect(result.modifiedFiles).to.deep.equal([path.join(outputDir, 'Case_Modified.csv')]);

      const deleteContent = fs.readFileSync(result.deleteFile, 'utf-8');
      expect(deleteContent).to.include('002');
      expect(deleteContent).to.include('a@example.com');

      const modifiedContent = fs.readFileSync(path.join(outputDir, 'Case_Modified.csv'), 'utf-8');
      expect(modifiedContent).to.include('c1');
      expect(modifiedContent).to.include('001');

      expect(vi.mocked(simplyCore.queryRecords)).toHaveBeenCalledTimes(2);
    } finally {
      fs.rmSync(configFile, { force: true });
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
