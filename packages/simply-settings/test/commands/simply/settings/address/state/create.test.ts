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
import { SfError } from '@salesforce/core';
import { ISO_CODES_SOURCES, SetupSession } from '@simplysf/simply-settings-core';
import sinon from 'sinon';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import StateCreate from '../../../../../../src/commands/simply/settings/address/state/create.js';
import { NEW_STATE_FORM_HTML, REJECTED_HTML, stubIsoCodes, stubRetrieve, SUCCESS_HTML, tempFile } from './helpers.js';

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

  // 0044's flag contract: exactly one input source, and the --iso-codes modifiers only with it.
  it.each([
    ['neither --file nor --iso-codes', () => []],
    ['both --file and --iso-codes', () => ['--file', file, '--iso-codes', 'debian']],
    ['--all-levels without --iso-codes', () => ['--file', file, '--all-levels']],
    ['--iso-codes-version without --iso-codes', () => ['--file', file, '--iso-codes-version', 'v4.20.1']],
  ])('rejects %s at flag parsing, before touching the org', async (_label, sourceArgs) => {
    const retrieve = $$.SANDBOX.stub(ComponentSet.prototype, 'retrieve');

    await expect(StateCreate.run(['--target-org', testOrg.username, ...sourceArgs()])).rejects.toThrow(/--iso-codes/);
    expect(retrieve.called).toBe(false);
  });

  it('rejects an unknown --iso-codes source', async () => {
    await expect(StateCreate.run(['--target-org', testOrg.username, '--iso-codes', 'wikidata'])).rejects.toThrow(
      /Expected --iso-codes=wikidata to be one of: debian/,
    );
  });

  it('reports no source for --file', async () => {
    await stubRetrieve($$);
    stubSession();

    const result = await StateCreate.run(['--target-org', testOrg.username, '--file', file, '--dry-run']);

    expect(result).not.toHaveProperty('source');
  });

  describe('--iso-codes', () => {
    const SUBDIVISIONS = [
      { code: 'US-CA', name: 'California' },
      { code: 'US-ZZ', name: 'Zed' },
      { code: 'US-ZZ1', name: 'Nested', parent: 'US-ZZ' },
      { code: 'FR-ARA', name: 'Auvergne-Rhône-Alpes' },
    ];

    it('downloads the latest release, keeps the top level, and reports the source', async () => {
      await stubRetrieve($$);
      const { posted } = stubSession();
      const { fetchSubdivisions } = stubIsoCodes($$, SUBDIVISIONS);

      const result = await StateCreate.run([
        '--target-org',
        testOrg.username,
        '--iso-codes',
        'debian',
        '--country',
        'US',
      ]);

      expect(fetchSubdivisions.firstCall.args[0]).toBe('v4.20.1');
      expect(posted).toStrictEqual(['ZZ']);
      expect(result.states.map((state) => [state.code, state.status])).toStrictEqual([
        ['CA', 'exists'],
        ['ZZ', 'created'],
      ]);
      expect(result.source).toStrictEqual({
        kind: 'iso-codes',
        provider: 'debian',
        version: 'v4.20.1',
        allLevels: false,
      });
    });

    it('uses a pinned version without resolving the latest, and --all-levels keeps nested subdivisions', async () => {
      await stubRetrieve($$);
      stubSession();
      const { resolveLatestVersion, fetchSubdivisions } = stubIsoCodes($$, SUBDIVISIONS);

      const result = await StateCreate.run([
        '--target-org',
        testOrg.username,
        '--iso-codes',
        'debian',
        '--iso-codes-version',
        'main',
        '--all-levels',
        '--country',
        'US',
        '--dry-run',
      ]);

      expect(resolveLatestVersion.called).toBe(false);
      expect(fetchSubdivisions.firstCall.args[0]).toBe('main');
      expect(result.states.map((state) => state.code)).toStrictEqual(['CA', 'ZZ', 'ZZ1']);
      expect(result.source).toMatchObject({ version: 'main', allLevels: true });
    });

    it('fails before touching the org when the download fails', async () => {
      const retrieve = $$.SANDBOX.stub(ComponentSet.prototype, 'retrieve');
      $$.SANDBOX.stub(ISO_CODES_SOURCES.debian, 'resolveLatestVersion').rejects(
        new SfError("Couldn't download ISO 3166-2 data from Debian iso-codes", 'IsoCodesDownloadError'),
      );

      await expect(StateCreate.run(['--target-org', testOrg.username, '--iso-codes', 'debian'])).rejects.toThrow(
        "Couldn't download ISO 3166-2 data from Debian iso-codes",
      );
      expect(retrieve.called).toBe(false);
    });

    it.each([
      ['both --file and --iso-codes', ['--file', 'states.json', '--iso-codes', 'debian']],
      ['neither --file nor --iso-codes', []],
      ['an unsupported source', ['--iso-codes', 'cldr']],
      ['--iso-codes-version without --iso-codes', ['--file', 'states.json', '--iso-codes-version', 'v4.20.1']],
      ['--all-levels without --iso-codes', ['--file', 'states.json', '--all-levels']],
    ])('rejects %s at flag parsing', async (_name, args) => {
      const fetchSubdivisions = $$.SANDBOX.stub(ISO_CODES_SOURCES.debian, 'fetchSubdivisions');
      const withRealFile = args.map((arg) => (arg === 'states.json' ? file : arg));

      await expect(StateCreate.run(['--target-org', testOrg.username, ...withRealFile])).rejects.toThrow();
      expect(fetchSubdivisions.called).toBe(false);
    });
  });
});
