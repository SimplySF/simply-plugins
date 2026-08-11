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

import { SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ApexTraceSetup from '../../../../../src/commands/simply/apex/trace/setup.js';

describe('simply apex trace setup', () => {
  const $$ = new TestContext();
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  it('should error without a default target org', async () => {
    try {
      await ApexTraceSetup.run([]);
      expect.fail('should have thrown NoDefaultOrgError');
    } catch (err) {
      const error = err as SfError;
      expect(error.message.toLowerCase()).to.include('org');
    }
  });
});
