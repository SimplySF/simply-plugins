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

import { Org, type Connection, type SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import sinon from 'sinon';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { requireConnection } from '../../src/org/requireConnection.js';

describe('requireConnection', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  it('returns the connection for the target org', async () => {
    const org = await Org.create({ aliasOrUsername: testOrg.username });
    const connection = org.getConnection();

    expect(requireConnection({ 'target-org': org })).to.equal(connection);
  });

  it('passes the requested api version through to getConnection', async () => {
    const org = await Org.create({ aliasOrUsername: testOrg.username });
    const stub = $$.SANDBOX.stub(Org.prototype, 'getConnection').returns({} as Connection);

    requireConnection({ 'target-org': org, 'api-version': '62.0' });

    expect(stub.firstCall.args[0]).to.equal('62.0');
  });

  it('throws when there is no target org', () => {
    expect(() => requireConnection({})).to.throw('Unable to establish connection to the org.');
  });

  it('throws an error named TargetOrgConnectionFailedError, matching the per-plugin errors it replaces', () => {
    try {
      requireConnection({});
      expect.fail('should have thrown');
    } catch (error) {
      expect((error as SfError).name).to.equal('TargetOrgConnectionFailedError');
    }
  });

  it('throws when the org yields no connection', async () => {
    const org = await Org.create({ aliasOrUsername: testOrg.username });
    $$.SANDBOX.stub(Org.prototype, 'getConnection').returns(undefined as unknown as Connection);

    expect(() => requireConnection({ 'target-org': org })).to.throw('Unable to establish connection to the org.');
  });
});
