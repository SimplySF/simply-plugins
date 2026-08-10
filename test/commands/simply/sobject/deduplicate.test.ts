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
import { expect } from 'chai';
import SObjectDeduplicate from '../../../../src/commands/simply/sobject/deduplicate.js';

describe('simply sobject deduplicate', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  before(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
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
});
