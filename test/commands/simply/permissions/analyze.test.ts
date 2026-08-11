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
import { Readable } from 'node:stream';
import { Connection, SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import * as simplyCore from '@simplysf/simply-core';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import PermissionsAnalyze from '../../../../src/commands/simply/permissions/analyze.js';

vi.mock('@simplysf/simply-core', async () => {
  const actual = await vi.importActual<typeof import('@simplysf/simply-core')>('@simplysf/simply-core');
  return { ...actual, streamBulkQuery: vi.fn() };
});

describe('simply permissions analyze', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
    vi.mocked(simplyCore.streamBulkQuery).mockReset();
  });

  it('should error without a default target org', async () => {
    try {
      await PermissionsAnalyze.run([]);
      expect.fail('should have thrown NoDefaultOrgError');
    } catch (err) {
      const error = err as SfError;
      expect(error.message.toLowerCase()).to.include('org');
    }
  });

  it('should build a report using bulk-streamed object/field/group-component permissions', async () => {
    $$.SANDBOX.stub(Connection.prototype, 'autoFetchQuery').callsFake(
      async (soql: string, options?: { tooling?: boolean }) => {
        if (options?.tooling) {
          return { records: [], done: true, totalSize: 0 } as never;
        }
        if (soql.startsWith('SELECT Id, Name, Label')) {
          return {
            records: [
              { Id: '0PS000000000001', Name: 'RegularPS', Label: 'Regular PS', IsCustom: true, Type: 'Regular' },
              { Id: '0PS000000000002', Name: 'PSG1', Label: 'PSG1 Group', IsCustom: true, Type: 'Group' },
            ],
            done: true,
            totalSize: 2,
          } as never;
        }
        if (soql.startsWith('SELECT Id, DeveloperName')) {
          return {
            records: [{ Id: '0PSG00000000001', DeveloperName: 'PSG1', MasterLabel: 'PSG1 Label' }],
            done: true,
            totalSize: 1,
          } as never;
        }
        return { records: [], done: true, totalSize: 0 } as never;
      },
    );

    vi.mocked(simplyCore.streamBulkQuery).mockImplementation(async (_conn, soql) => {
      let csv: string;
      if (soql.includes('FROM ObjectPermissions')) {
        csv =
          'ParentId,SobjectType,PermissionsRead,PermissionsCreate,PermissionsEdit,PermissionsDelete,PermissionsViewAllRecords,PermissionsModifyAllRecords\n' +
          '0PS000000000001,Account,true,true,false,false,false,false\n';
      } else if (soql.includes('FROM FieldPermissions')) {
        csv =
          'ParentId,SobjectType,Field,PermissionsRead,PermissionsEdit\n0PS000000000001,Account,Account.Name,true,false\n';
      } else if (soql.includes('FROM PermissionSetGroupComponent')) {
        csv = 'PermissionSetGroupId,PermissionSetId\n0PSG00000000001,0PS000000000002\n';
      } else {
        csv = '';
      }

      return { jobId: '750xx0000000001AAA', numberRecordsProcessed: 1, stream: Readable.from([csv]) };
    });

    const outputFile = path.join(os.tmpdir(), `simply-permissions-analyze-${Date.now()}.html`);

    try {
      const result = await PermissionsAnalyze.run(['--target-org', testOrg.username, '--output', outputFile]);

      expect(result.permissionSetCount).to.equal(1);
      expect(result.permissionSetGroupCount).to.equal(1);

      const html = fs.readFileSync(outputFile, 'utf-8');
      expect(html).to.include('RegularPS');
      expect(html).to.include('Account');
      expect(html).to.include('true');
      expect(html).to.include('PSG1');

      // ObjectPermissions + FieldPermissions + PermissionSetGroupComponent, no PermissionSet/
      // PermissionSetGroup/Package2Member queries (those stay on autoFetchQuery).
      expect(vi.mocked(simplyCore.streamBulkQuery)).toHaveBeenCalledTimes(3);
    } finally {
      fs.rmSync(outputFile, { force: true });
    }
  });
});
