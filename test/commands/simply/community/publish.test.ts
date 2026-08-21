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
import sinon from 'sinon';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import CommunityPublish from '../../../../src/commands/simply/community/publish.js';

describe('simply community publish', () => {
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
      await CommunityPublish.run(['--name', 'My Community']);
      expect.fail('should have thrown for a missing target org');
    } catch (err) {
      const error = err as SfError;
      expect(error.message.toLowerCase()).to.include('org');
    }
  });

  it('should publish and wait until the community reports it has finished publishing', async () => {
    $$.SANDBOX.stub(Connection.prototype, 'singleRecordQuery').resolves({
      Id: '0DB000000000001',
      Name: 'My Community',
    });
    $$.fakeConnectionRequest = async () => ({
      id: '0DB000000000001',
      jobId: '08p000000000001',
      name: 'My Community',
      url: 'https://example.my.site.com',
    });
    $$.SANDBOX.stub(Connection.prototype, 'query').resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '08p000000000001',
          Status: 'Completed',
          FinishedAt: '2026-08-19T00:00:00.000+0000',
          Error: null,
        },
      ],
    });

    const result = await CommunityPublish.run(['--target-org', testOrg.username, '--name', 'My Community']);

    expect(result).to.deep.equal({
      success: true,
      id: '0DB000000000001',
      name: 'My Community',
      url: 'https://example.my.site.com',
    });
  });

  it('should not retry the publish request by default', async () => {
    $$.SANDBOX.stub(Connection.prototype, 'singleRecordQuery').resolves({
      Id: '0DB000000000001',
      Name: 'My Community',
    });

    let requestAttempts = 0;
    $$.fakeConnectionRequest = async () => {
      requestAttempts += 1;
      throw new Error('socket hang up');
    };

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
    $$.SANDBOX.stub(Connection.prototype, 'singleRecordQuery').resolves({
      Id: '0DB000000000001',
      Name: 'My Community',
    });

    let requestAttempts = 0;
    $$.fakeConnectionRequest = async () => {
      requestAttempts += 1;
      if (requestAttempts === 1) {
        throw new Error('socket hang up');
      }
      return {
        id: '0DB000000000001',
        jobId: '08p000000000001',
        name: 'My Community',
        url: 'https://example.my.site.com',
      };
    };
    $$.SANDBOX.stub(Connection.prototype, 'query').resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '08p000000000001',
          Status: 'Completed',
          FinishedAt: '2026-08-19T00:00:00.000+0000',
          Error: null,
        },
      ],
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
    $$.SANDBOX.stub(Connection.prototype, 'singleRecordQuery').resolves({
      Id: '0DB000000000001',
      Name: 'My Community',
    });
    $$.fakeConnectionRequest = async () => {
      throw new Error('socket hang up');
    };
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

  it('should throw when the publish job reaches a terminal failure state', async () => {
    $$.SANDBOX.stub(Connection.prototype, 'singleRecordQuery').resolves({
      Id: '0DB000000000001',
      Name: 'My Community',
    });
    $$.fakeConnectionRequest = async () => ({
      id: '0DB000000000001',
      jobId: '08p000000000001',
      name: 'My Community',
      url: 'https://example.my.site.com',
    });
    $$.SANDBOX.stub(Connection.prototype, 'query').resolves({
      done: true,
      totalSize: 1,
      records: [
        {
          Id: '08p000000000001',
          Status: 'Failed',
          FinishedAt: '2026-08-19T00:00:00.000+0000',
          Error: 'Something went wrong while publishing.',
        },
      ],
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
