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

import { readFile } from 'node:fs/promises';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { ComponentSet, ComponentStatus } from '@salesforce/source-deploy-retrieve';
import sinon from 'sinon';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import StateActivate from '../../../../../../src/commands/simply/settings/address/state/activate.js';
import { stubRetrieve, tempFile } from './helpers.js';

describe('simply settings address state activate', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();
  let file: string;

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
    file = await tempFile('states.json', JSON.stringify({ 'US-GU': 'Guam', 'US-CA': 'California', 'US-ZZ': 'Zed' }));
  });

  afterEach(() => {
    $$.restore();
  });

  /** Stubs the deploy, capturing the XML it would have sent. */
  function stubDeploy(success = true): { deployedXml: () => string | undefined } {
    let deployedXml: string | undefined;
    const fromSource = ComponentSet.fromSource.bind(ComponentSet);
    $$.SANDBOX.stub(ComponentSet, 'fromSource').callsFake((input) => {
      const filePath = input as unknown as string;
      const set = fromSource(filePath);
      sinon.stub(set, 'deploy').callsFake(async () => {
        deployedXml = await readFile(filePath, 'utf8');
        return {
          pollStatus: sinon.stub().resolves({
            response: { id: '0Af000000000001', status: success ? 'Succeeded' : 'Failed', success },
            getFileResponses: () =>
              success
                ? [{ fullName: 'Address', type: 'Settings', state: ComponentStatus.Changed }]
                : [{ fullName: 'Address', type: 'Settings', state: ComponentStatus.Failed, error: 'bad label' }],
          }),
        } as never;
      });
      return set;
    });
    return { deployedXml: () => deployedXml };
  }

  it('deploys with only the listed inactive states activated', async () => {
    await stubRetrieve($$);
    const deploy = stubDeploy();

    const result = await StateActivate.run(['--target-org', testOrg.username, '--file', file]);

    expect(result.activated.map((state) => state.code)).toStrictEqual(['GU']);
    expect(result.alreadyActive.map((state) => state.code)).toStrictEqual(['CA']);
    expect(result.notInOrg.map((state) => state.code)).toStrictEqual(['ZZ']);
    expect(result.deployId).toBe('0Af000000000001');
    expect(deploy.deployedXml()).toMatch(
      /<active>true<\/active>\s*<integrationValue>Guam<\/integrationValue>[\s\S]*?<visible>true<\/visible>/,
    );
  });

  it('deploys nothing for a dry run', async () => {
    await stubRetrieve($$);
    const deploy = stubDeploy();

    const result = await StateActivate.run(['--target-org', testOrg.username, '--file', file, '--dry-run']);

    expect(result.activated.map((state) => state.code)).toStrictEqual(['GU']);
    expect(result.deployId).toBeUndefined();
    expect(deploy.deployedXml()).toBeUndefined();
  });

  it('fails with the deploy errors when the deploy fails', async () => {
    await stubRetrieve($$);
    stubDeploy(false);

    await expect(StateActivate.run(['--target-org', testOrg.username, '--file', file])).rejects.toThrow(
      'The AddressSettings deploy 0Af000000000001 failed: bad label',
    );
  });
});
