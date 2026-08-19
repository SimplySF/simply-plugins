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

import { Connection, SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import sinon, { type SinonStub } from 'sinon';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ApexTraceSilence from '../../../../../src/commands/simply/apex/trace/silence.js';

type CapturedRequest = { method: string; url: string; body?: string };

const CLASS_ID = '01p000000000010AAA';

/**
 * Reconfigures the `Connection.prototype.request` stub that `TestContext` already installs
 * (jsforce's `Connection` can't be stubbed a second time on the prototype), routing calls to
 * fake ApexClass/DebugLevel/TraceFlag responses based on the request URL, and returning every
 * request made so tests can assert on the generated SOQL and record bodies.
 */
function stubOrgRequests(
  options: {
    debugLevelRecords?: Array<{ Id: string }>;
    classRecords?: Array<{ Id: string; Name: string }>;
    traceFlagRecords?: Array<{ Id: string; TracedEntityId: string }>;
  } = {},
): CapturedRequest[] {
  const calls: CapturedRequest[] = [];
  const debugLevelRecords = options.debugLevelRecords ?? [{ Id: '01p000000000001AAA' }];
  const classRecords = options.classRecords ?? [{ Id: CLASS_ID, Name: 'NoisyClass' }];
  const traceFlagRecords = options.traceFlagRecords ?? [];

  (Connection.prototype.request as unknown as SinonStub).callsFake(async (request: string | CapturedRequest) => {
    const normalized: CapturedRequest = typeof request === 'string' ? { method: 'GET', url: request } : request;
    calls.push(normalized);

    const { method, url } = normalized;

    if (url.includes('FROM%20Organization')) {
      return { records: [], done: true, totalSize: 0 };
    }
    if (method === 'GET' && url.includes('FROM%20DebugLevel')) {
      return { records: debugLevelRecords, done: true, totalSize: debugLevelRecords.length };
    }
    if (method === 'GET' && url.includes('FROM%20ApexClass')) {
      return { records: classRecords, done: true, totalSize: classRecords.length };
    }
    if (method === 'GET' && url.includes('FROM%20TraceFlag')) {
      return { records: traceFlagRecords, done: true, totalSize: traceFlagRecords.length };
    }
    if (method === 'POST' && url.endsWith('/tooling/sobjects/DebugLevel')) {
      return { id: '01p000000000001AAA', success: true, errors: [] };
    }
    if (method === 'POST' && url.endsWith('/tooling/sobjects/TraceFlag')) {
      return { id: '7tf000000000001AAA', success: true, errors: [] };
    }
    if (method === 'PATCH' && url.includes('/tooling/sobjects/TraceFlag/')) {
      return { success: true, errors: [] };
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  return calls;
}

describe('simply apex trace silence', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  it('should error when neither --classes nor --classes-file is provided', async () => {
    try {
      await ApexTraceSilence.run(['--target-org', testOrg.username]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('No Apex classes specified');
    }
  });

  it('should create a new trace flag for a class that does not have one', async () => {
    const calls = stubOrgRequests({ traceFlagRecords: [] });

    const results = await ApexTraceSilence.run(['--target-org', testOrg.username, '--classes', 'NoisyClass']);

    expect(results).to.have.lengthOf(1);
    expect(results[0].traceFlagId).to.equal('7tf000000000001AAA');
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/TraceFlag'))).to.be.true;
    expect(calls.some((c) => c.method === 'PATCH' && c.url.includes('/tooling/sobjects/TraceFlag/'))).to.be.false;
  });

  it('should extend the expiration of an existing trace flag instead of creating a duplicate', async () => {
    const calls = stubOrgRequests({
      traceFlagRecords: [{ Id: '7tf000000000009AAA', TracedEntityId: CLASS_ID }],
    });

    const results = await ApexTraceSilence.run(['--target-org', testOrg.username, '--classes', 'NoisyClass']);

    expect(results).to.have.lengthOf(1);
    expect(results[0].traceFlagId).to.equal('7tf000000000009AAA');
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/TraceFlag'))).to.be.false;

    const traceFlagUpdate = calls.find(
      (c) => c.method === 'PATCH' && c.url.endsWith('/tooling/sobjects/TraceFlag/7tf000000000009AAA'),
    );
    expect(traceFlagUpdate).to.not.be.undefined;
    const body = JSON.parse(traceFlagUpdate!.body ?? '{}') as { StartDate: string; ExpirationDate: string };
    expect(body.StartDate).to.not.be.undefined;
    expect(body.ExpirationDate).to.not.be.undefined;
  });
});
