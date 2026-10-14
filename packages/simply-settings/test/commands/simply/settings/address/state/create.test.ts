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

import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { ComponentSet } from '@salesforce/source-deploy-retrieve';
import { SetupSession } from '@simplysf/simply-settings-core';
import sinon from 'sinon';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import StateCreate from '../../../../../../src/commands/simply/settings/address/state/create.js';
import { NEW_STATE_FORM_HTML, REJECTED_HTML, stubRetrieve, SUCCESS_HTML, tempFile } from './helpers.js';

describe('simply settings address state create', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();
  let file: string;

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
    file = await tempFile(
      'states.json',
      JSON.stringify({ 'US-CA': 'California', 'US-ZZ': 'Zed', 'FR-75': 'Paris', 'US-YY': 'Why' }),
    );
  });

  beforeEach(() => {
    process.exitCode = undefined;
  });

  afterEach(() => {
    $$.restore();
    process.exitCode = undefined;
  });

  /** Stubs opening a Setup session; each POST answers with `postBody(code)`. */
  function stubSession(postBody: (code: string) => string = () => SUCCESS_HTML): {
    open: sinon.SinonStub;
    posted: string[];
  } {
    const posted: string[] = [];
    const session = {
      get: async (pagePath: string) => ({
        status: 200,
        url: new URL(pagePath, 'https://acme.my.salesforce.com').toString(),
        body: NEW_STATE_FORM_HTML,
      }),
      postForm: async (_url: URL, fields: Array<[string, string]>) => {
        const code = fields.find(([name]) => name.endsWith(':editIsoCode'))![1];
        posted.push(code);
        return {
          status: 200,
          url: 'https://acme.my.salesforce.com/i18n/ConfigureNewState.apexp',
          body: postBody(code),
        };
      },
    };
    const open = $$.SANDBOX.stub(SetupSession, 'open').resolves(session as unknown as SetupSession);
    return { open, posted };
  }

  it('submits only missing states and reports every state in file order', async () => {
    await stubRetrieve($$);
    const { posted } = stubSession();

    const result = await StateCreate.run(['--target-org', testOrg.username, '--file', file]);

    expect(posted.sort()).toStrictEqual(['YY', 'ZZ']);
    expect(result.states.map((state) => [state.country, state.code, state.status])).toStrictEqual([
      ['US', 'CA', 'exists'],
      ['US', 'ZZ', 'created'],
      ['FR', '75', 'country-missing'],
      ['US', 'YY', 'created'],
    ]);
    expect(result.summary).toMatchObject({ created: 2, exists: 1, 'country-missing': 1, rejected: 0, failed: 0 });
    expect(process.exitCode).toBeUndefined();
  });

  it('applies --country', async () => {
    await stubRetrieve($$);
    stubSession();

    const result = await StateCreate.run(['--target-org', testOrg.username, '--file', file, '--country', 'fr']);

    expect(result.states.map((state) => state.code)).toStrictEqual(['75']);
  });

  it('sets exit code 1 and keeps the message when a state is rejected', async () => {
    await stubRetrieve($$);
    stubSession((code) => (code === 'ZZ' ? REJECTED_HTML : SUCCESS_HTML));

    const result = await StateCreate.run(['--target-org', testOrg.username, '--file', file]);

    expect(result.states.find((state) => state.code === 'ZZ')).toMatchObject({
      status: 'rejected',
      message: 'State Name: invalid value',
    });
    expect(process.exitCode).toBe(1);
  });

  it('opens no Setup session for a dry run', async () => {
    await stubRetrieve($$);
    const { open } = stubSession();

    const result = await StateCreate.run(['--target-org', testOrg.username, '--file', file, '--dry-run']);

    expect(open.called).toBe(false);
    expect(result.summary['would-create']).toBe(2);
  });

  it('opens no Setup session when nothing is missing', async () => {
    await stubRetrieve($$);
    const { open } = stubSession();
    const existing = await tempFile('existing.json', JSON.stringify({ 'US-CA': 'California', 'US-GU': 'Guam' }));

    const result = await StateCreate.run(['--target-org', testOrg.username, '--file', existing]);

    expect(open.called).toBe(false);
    expect(result.summary.exists).toBe(2);
  });

  it('explains an unreadable definitions file', async () => {
    const broken = await tempFile('broken.json', '{ "US-CA": ');

    await expect(StateCreate.run(['--target-org', testOrg.username, '--file', broken])).rejects.toThrow(
      /Couldn't read state definitions from .*broken\.json/,
    );
  });

  it('rejects a --country with no definitions before touching the org', async () => {
    const retrieve = $$.SANDBOX.stub(ComponentSet.prototype, 'retrieve');

    await expect(
      StateCreate.run(['--target-org', testOrg.username, '--file', file, '--country', 'MX']),
    ).rejects.toThrow('No state definitions for "MX".');
    expect(retrieve.called).toBe(false);
  });
});
