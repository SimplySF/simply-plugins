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
import { ExecuteAnonymousResponse, ExecuteService } from '@salesforce/apex-node';
import { SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ApexExecute from '../../../../src/commands/simply/apex/execute.js';

describe('simply apex execute', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  it('should error without required --file flag', async () => {
    try {
      await ApexExecute.run(['--target-org', testOrg.username]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('file');
    }
  });

  it('should execute anonymous apex and return the result', async () => {
    const tmpFile = path.join(os.tmpdir(), `simply-apex-execute-test-${Date.now()}.apex`);
    fs.writeFileSync(tmpFile, "System.debug('hello');");

    const response: ExecuteAnonymousResponse = {
      success: true,
      compiled: true,
      logs: 'test logs',
      diagnostic: [
        {
          compileProblem: '',
          exceptionMessage: '',
          exceptionStackTrace: '',
          lineNumber: -1,
          columnNumber: -1,
        },
      ],
    };

    $$.SANDBOX.stub(ExecuteService.prototype, 'executeAnonymous').resolves(response);

    try {
      const result = await ApexExecute.run(['--target-org', testOrg.username, '--file', tmpFile]);
      expect(result.success).to.be.true;
      expect(result.compiled).to.be.true;
      expect(result.logs).to.equal('test logs');
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });
});
