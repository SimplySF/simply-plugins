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

import { Connection, SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { escapeSoqlLiteral } from '@simplysf/simply-core';
import sinon, { type SinonStub } from 'sinon';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import ApexTraceSetup from '../../../../../src/commands/simply/apex/trace/setup.js';

type CapturedRequest = { method: string; url: string; body?: string };

/**
 * Reconfigures the `Connection.prototype.request` stub that `TestContext` already installs
 * (jsforce's `Connection` can't be stubbed a second time on the prototype), routing calls to
 * fake User/DebugLevel/TraceFlag responses based on the request URL, and returning every
 * request made so tests can assert on the generated SOQL and record bodies.
 */
function stubOrgRequests(
  options: {
    userRecords?: Array<{ Id: string }>;
    debugLevelRecords?: Array<{ Id: string }>;
    traceFlagRecords?: Array<{ Id: string }>;
  } = {},
): CapturedRequest[] {
  const calls: CapturedRequest[] = [];
  const userRecords = options.userRecords ?? [{ Id: '005000000000001AAA' }];
  const debugLevelRecords = options.debugLevelRecords ?? [];
  const traceFlagRecords = options.traceFlagRecords ?? [];

  (Connection.prototype.request as unknown as SinonStub).callsFake(async (request: string | CapturedRequest) => {
    const normalized: CapturedRequest = typeof request === 'string' ? { method: 'GET', url: request } : request;
    calls.push(normalized);

    const { method, url } = normalized;

    if (url.includes('FROM%20Organization')) {
      return { records: [], done: true, totalSize: 0 };
    }
    if (method === 'GET' && url.includes('/tooling/query') && url.includes('FROM%20DebugLevel')) {
      return { records: debugLevelRecords, done: true, totalSize: debugLevelRecords.length };
    }
    if (method === 'GET' && url.includes('/tooling/query') && url.includes('FROM%20TraceFlag')) {
      return { records: traceFlagRecords, done: true, totalSize: traceFlagRecords.length };
    }
    if (method === 'GET' && url.includes('FROM%20User')) {
      return { records: userRecords, done: true, totalSize: userRecords.length };
    }
    if (method === 'POST' && url.endsWith('/tooling/sobjects/DebugLevel')) {
      return { id: '01p000000000001AAA', success: true, errors: [] };
    }
    if (method === 'POST' && url.endsWith('/tooling/sobjects/TraceFlag')) {
      return { id: '7tf000000000001AAA', success: true, errors: [] };
    }
    if (method === 'PATCH' && url.includes('/tooling/sobjects/TraceFlag/')) {
      return {};
    }

    throw new Error(`Unexpected request: ${method} ${url}`);
  });

  return calls;
}

function decodedQuery(request: CapturedRequest): string {
  return new URL(request.url, 'https://example.com').searchParams.get('q') ?? '';
}

describe('simply apex trace setup', () => {
  const $$ = new TestContext({ sinon });
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

  it('should reject an invalid --start-date format', async () => {
    try {
      await ApexTraceSetup.run(['--target-org', testOrg.username, '--start-date', 'not-a-date']);
      expect.fail('should have thrown an invalid date-time error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('start-date');
    }
  });

  it('should reject an invalid --end-date format', async () => {
    try {
      await ApexTraceSetup.run(['--target-org', testOrg.username, '--end-date', '2026-08-18']);
      expect.fail('should have thrown an invalid date-time error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('end-date');
    }
  });

  it('should error when --end-date is not after --start-date', async () => {
    stubOrgRequests();

    try {
      await ApexTraceSetup.run([
        '--target-org',
        testOrg.username,
        '--start-date',
        '2026-08-18T12:00:00Z',
        '--end-date',
        '2026-08-18T12:00:00Z',
      ]);
      expect.fail('should have thrown an Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('must be after');
    }
  });

  it('should error when --log-level does not match an existing debug level', async () => {
    stubOrgRequests({ debugLevelRecords: [] });

    try {
      await ApexTraceSetup.run(['--target-org', testOrg.username, '--log-level', 'NoSuchLevel']);
      expect.fail('should have thrown an Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('No debug level found with developer name: NoSuchLevel');
    }
  });

  it('should use an existing debug level matched by --log-level without creating one', async () => {
    const calls = stubOrgRequests({ debugLevelRecords: [{ Id: '01p000000000005AAA' }] });

    const result = await ApexTraceSetup.run(['--target-org', testOrg.username, '--log-level', 'CustomLevel']);

    expect(result.debugLevelId).to.equal('01p000000000005AAA');
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/DebugLevel'))).to.be.false;
  });

  it('should error when --on-behalf-of is not a Field:Value pair', async () => {
    try {
      await ApexTraceSetup.run(['--target-org', testOrg.username, '--on-behalf-of', 'not-a-pair']);
      expect.fail('should have thrown an Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Invalid --on-behalf-of value');
    }
  });

  it('should query the requested field/value, escaping quotes and backslashes', async () => {
    const calls = stubOrgRequests();
    const value = "o'br\\ien";

    await ApexTraceSetup.run(['--target-org', testOrg.username, '--on-behalf-of', `FederationIdentifier:${value}`]);

    const userQuery = calls.find((c) => c.method === 'GET' && c.url.includes('FROM%20User'));
    expect(userQuery).to.not.be.undefined;
    expect(decodedQuery(userQuery!)).to.equal(
      `SELECT Id FROM User WHERE FederationIdentifier = '${escapeSoqlLiteral(value)}' LIMIT 2`,
    );
  });

  it('should default to the running user by Username when --on-behalf-of is omitted', async () => {
    const calls = stubOrgRequests();

    await ApexTraceSetup.run(['--target-org', testOrg.username]);

    const userQuery = calls.find((c) => c.method === 'GET' && c.url.includes('FROM%20User'));
    expect(userQuery).to.not.be.undefined;
    expect(decodedQuery(userQuery!)).to.equal(`SELECT Id FROM User WHERE Username = '${testOrg.username}' LIMIT 2`);
  });

  it('should error when no user matches the selector', async () => {
    stubOrgRequests({ userRecords: [] });

    try {
      await ApexTraceSetup.run(['--target-org', testOrg.username, '--on-behalf-of', 'Username:missing@example.com']);
      expect.fail('should have thrown an Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('User not found for Username:missing@example.com');
    }
  });

  it('should error instead of picking an arbitrary user when the selector is ambiguous', async () => {
    const calls = stubOrgRequests({
      userRecords: [{ Id: '005000000000001AAA' }, { Id: '005000000000002AAA' }],
    });

    try {
      await ApexTraceSetup.run(['--target-org', testOrg.username, '--on-behalf-of', 'LastName:Smith']);
      expect.fail('should have thrown an Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Multiple users found for LastName:Smith');
    }

    const userQuery = calls.find((c) => c.method === 'GET' && c.url.includes('FROM%20User'));
    expect(decodedQuery(userQuery!)).to.include('LIMIT 2');
  });

  it('should create a new debug level and trace flag when none exist for the user', async () => {
    const calls = stubOrgRequests({ debugLevelRecords: [], traceFlagRecords: [] });

    const result = await ApexTraceSetup.run(['--target-org', testOrg.username]);

    expect(result.userId).to.equal('005000000000001AAA');
    expect(result.debugLevelId).to.equal('01p000000000001AAA');
    expect(result.traceFlagId).to.equal('7tf000000000001AAA');

    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/DebugLevel'))).to.be.true;
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/TraceFlag'))).to.be.true;
    expect(calls.some((c) => c.method === 'PATCH' && c.url.includes('/tooling/sobjects/TraceFlag/'))).to.be.false;

    const traceFlagCreate = calls.find((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/TraceFlag'))!;
    const body = JSON.parse(traceFlagCreate.body ?? '{}') as { TracedEntityId: string; LogType: string };
    expect(body.TracedEntityId).to.equal('005000000000001AAA');
    expect(body.LogType).to.equal('DEVELOPER_LOG');
  });

  it('should update the existing debug level and trace flag when they already exist for the user', async () => {
    const calls = stubOrgRequests({
      debugLevelRecords: [{ Id: '01p000000000009AAA' }],
      traceFlagRecords: [{ Id: '7tf000000000009AAA' }],
    });

    const result = await ApexTraceSetup.run(['--target-org', testOrg.username]);

    expect(result.debugLevelId).to.equal('01p000000000009AAA');
    expect(result.traceFlagId).to.equal('7tf000000000009AAA');

    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/DebugLevel'))).to.be.false;
    expect(calls.some((c) => c.method === 'POST' && c.url.endsWith('/tooling/sobjects/TraceFlag'))).to.be.false;

    const traceFlagUpdate = calls.find(
      (c) => c.method === 'PATCH' && c.url.endsWith('/tooling/sobjects/TraceFlag/7tf000000000009AAA'),
    );
    expect(traceFlagUpdate).to.not.be.undefined;
    const body = JSON.parse(traceFlagUpdate!.body ?? '{}') as { DebugLevelId: string };
    expect(body.DebugLevelId).to.equal('01p000000000009AAA');
  });
});
