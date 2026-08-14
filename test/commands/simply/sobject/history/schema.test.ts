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
import { Connection } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import SObjectHistorySchema from '../../../../../src/commands/simply/sobject/history/schema.js';

describe('simply sobject history schema', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  it('should report no tracked objects when none are found', async () => {
    $$.SANDBOX.stub(Connection.prototype, 'autoFetchQuery').resolves({ records: [], done: true, totalSize: 0 } as never);

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-history-schema-'));

    try {
      const result = await SObjectHistorySchema.run([
        '--target-org',
        testOrg.username,
        '--output-dir',
        outputDir,
      ]);

      expect(result.trackedObjectCount).to.equal(0);
      expect(result.trackedFieldCount).to.equal(0);
      expect(fs.existsSync(result.csvPath)).to.be.true;
      expect(fs.existsSync(result.htmlPath)).to.be.true;
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should group tracked fields by package and resolve unlocked-package names', async () => {
    $$.SANDBOX.stub(Connection.prototype, 'autoFetchQuery').callsFake(async (soql: string) => {
      if (soql.startsWith('SELECT DurableId, QualifiedApiName, Label FROM EntityDefinition')) {
        return {
          records: [{ DurableId: '01I000000000001', QualifiedApiName: 'Account', Label: 'Account' }],
          done: true,
          totalSize: 1,
        } as never;
      }

      if (soql.startsWith('SELECT DurableId, Label, QualifiedApiName, NamespacePrefix, Publisher.Name')) {
        return {
          records: [
            {
              DurableId: '01I000000000001.00N000000000001',
              Label: 'Managed Field',
              QualifiedApiName: 'ns__Managed_Field__c',
              NamespacePrefix: 'ns',
              Publisher: { Name: 'ns' },
            },
            {
              DurableId: '01I000000000001.00N000000000002',
              Label: 'Unlocked Field',
              QualifiedApiName: 'Unlocked_Field__c',
              NamespacePrefix: undefined,
              Publisher: { Name: '<local>' },
            },
            {
              DurableId: '01I000000000001.00N000000000003',
              Label: 'Standard Field',
              QualifiedApiName: 'Name',
              NamespacePrefix: undefined,
              Publisher: { Name: 'Standard' },
            },
          ],
          done: true,
          totalSize: 3,
        } as never;
      }

      if (soql.startsWith('SELECT SubjectId, SubscriberPackage.Name FROM Package2Member')) {
        return {
          records: [{ SubjectId: '00N000000000002AAA', SubscriberPackage: { Name: 'My Unlocked Package' } }],
          done: true,
          totalSize: 1,
        } as never;
      }

      throw new Error(`Unexpected query: ${soql}`);
    });

    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-sobject-history-schema-'));

    try {
      const result = await SObjectHistorySchema.run([
        '--target-org',
        testOrg.username,
        '--output-dir',
        outputDir,
      ]);

      expect(result.trackedObjectCount).to.equal(1);
      expect(result.trackedFieldCount).to.equal(3);

      const csv = fs.readFileSync(result.csvPath, 'utf-8');
      expect(csv).to.include('ns__Managed_Field__c');
      expect(csv).to.include('My Unlocked Package');
      expect(csv).to.include('Standard');

      const html = fs.readFileSync(result.htmlPath, 'utf-8');
      expect(html).to.include('Managed Field');
      expect(html).to.include('My Unlocked Package');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
