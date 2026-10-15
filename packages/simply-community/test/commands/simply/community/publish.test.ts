/*
 * Copyright (c) 2026, SimplySF.
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
import sinon from 'sinon';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import CommunityPublish from '../../../../src/commands/simply/community/publish.js';

const network = { Id: '0DB000000000001', Name: 'My Community' };
const publishResponse = {
  id: '0DB000000000001',
  jobId: '08p000000000001',
  name: 'My Community',
  url: 'https://example.my.site.com',
};
const finished = (overrides: { Status: string; Error: string | null }): Record<string, unknown> => ({
  Id: '08p000000000001',
  FinishedAt: '2026-08-19T00:00:00.000+0000',
  ...overrides,
});

type FakeOrg = {
  /** Handles the publish POST. Defaults to returning `publishResponse`. */
  publish?: () => Promise<unknown>;
  /** Returns the BackgroundOperation record for each status query. Defaults to a completed job. */
  status?: () => Promise<Record<string, unknown>>;
};

describe('simply community publish', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  /**
   * Routes every Connection.request() the command makes — the Network lookup, the publish POST, and
   * the BackgroundOperation status query all go through it.
   */
  const fakeOrg = ({
    publish = async (): Promise<unknown> => publishResponse,
    status = async (): Promise<Record<string, unknown>> => finished({ Status: 'Completed', Error: null }),
  }: FakeOrg = {}): void => {
    $$.fakeConnectionRequest = async (request) => {
      const { method, url } = request as { method: string; url: string };
      if (method === 'POST') {
        return publish();
      }
      const soql = decodeURIComponent(url);
      if (soql.includes('FROM Network')) {
        return { done: true, totalSize: 1, records: [network] };
      }
      if (soql.includes('FROM BackgroundOperation')) {
        return { done: true, totalSize: 1, records: [await status()] };
      }
      throw new Error(`unexpected request: ${method} ${url}`);
    };
  };

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  it('should error without a default target org', async () => {
    try {
      await CommunityPublish.run(['--name', 'My Community']);
      expect.fail('should have thrown for a missing target org');
    } catch (err) {
      const error = err as SfError;
      expect(error.message.toLowerCase()).to.include('org');
    }
  });

  it('should publish and wait until the community reports it has finished publishing', async () => {
    fakeOrg();

    const result = await CommunityPublish.run(['--target-org', testOrg.username, '--name', 'My Community']);

    expect(result).to.deep.equal({
      success: true,
      id: '0DB000000000001',
      name: 'My Community',
      url: 'https://example.my.site.com',
    });
  });

  it('should error when no community has the given name', async () => {
    $$.fakeConnectionRequest = async () => ({ done: true, totalSize: 0, records: [] });

    try {
      await CommunityPublish.run(['--target-org', testOrg.username, '--name', 'Missing']);
      expect.fail('should have thrown');
    } catch (err) {
      expect((err as SfError).name).to.equal('SingleRecordQuery_NoRecords');
    }
  });

  it('should not retry the publish request by default', async () => {
    let requestAttempts = 0;
    fakeOrg({
      publish: async () => {
        requestAttempts += 1;
        throw new Error('socket hang up');
      },
    });

    try {
      await CommunityPublish.run(['--target-org', testOrg.username, '--name', 'My Community']);
      expect.fail('should have thrown');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.include('socket hang up');
    }

    expect(requestAttempts).to.equal(1);
  });

  it('should retry the publish request after a transient failure when --retry-attempts is set', async () => {
    let requestAttempts = 0;
    fakeOrg({
      publish: async () => {
        requestAttempts += 1;
        if (requestAttempts === 1) {
          throw new Error('socket hang up');
        }
        return publishResponse;
      },
    });

    const result = await CommunityPublish.run([
      '--target-org',
      testOrg.username,
      '--name',
      'My Community',
      '--retry-attempts',
      '2',
      '--retry-backoff',
      '1',
    ]);

    expect(requestAttempts).to.equal(2);
    expect(result).to.deep.equal({
      success: true,
      id: '0DB000000000001',
      name: 'My Community',
      url: 'https://example.my.site.com',
    });
  });

  it('should warn and return a failure result instead of throwing when --ignore-errors is set', async () => {
    fakeOrg({
      publish: async () => {
        throw new Error('socket hang up');
      },
    });
    const warnStub = $$.SANDBOX.stub(CommunityPublish.prototype, 'warn');

    const result = await CommunityPublish.run([
      '--target-org',
      testOrg.username,
      '--name',
      'My Community',
      '--ignore-errors',
    ]);

    expect(result).to.deep.equal({
      success: false,
      name: 'My Community',
      error: 'socket hang up',
    });
    expect(warnStub.calledOnce).to.equal(true);
    expect(warnStub.firstCall.args[0]).to.include('socket hang up');
  });

  it('should warn with the cause when a status check fails, instead of polling silently', async () => {
    fakeOrg({
      status: async () => {
        throw new Error("INVALID_TYPE: sObject type 'BackgroundOperation' is not supported.");
      },
    });
    const warnStub = $$.SANDBOX.stub(CommunityPublish.prototype, 'warn');

    try {
      // 0.01 minutes: long enough for the first poll, short enough to time out straight after it.
      await CommunityPublish.run(['--target-org', testOrg.username, '--name', 'My Community', '--wait', '0.01']);
      expect.fail('should have thrown CommunityPublishTimeoutError');
    } catch (err) {
      expect((err as SfError).name).to.equal('CommunityPublishTimeoutError');
    }

    expect(warnStub.firstCall.args[0]).to.include("INVALID_TYPE: sObject type 'BackgroundOperation' is not supported.");
  });

  it('should throw when the publish job reaches a terminal failure state', async () => {
    fakeOrg({
      status: async () => finished({ Status: 'Failed', Error: 'Something went wrong while publishing.' }),
    });

    try {
      await CommunityPublish.run(['--target-org', testOrg.username, '--name', 'My Community']);
      expect.fail('should have thrown CommunityPublishFailedError');
    } catch (err) {
      const error = err as SfError;
      expect(error.name).to.equal('CommunityPublishFailedError');
      expect(error.message).to.include('Something went wrong while publishing.');
    }
  });
});
