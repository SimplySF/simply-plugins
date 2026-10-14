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

import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { TestContext } from '@salesforce/core/testSetup';
import { ComponentSet, ComponentStatus } from '@salesforce/source-deploy-retrieve';
import { ISO_CODES_SOURCES, type IsoCodesSubdivision } from '@simplysf/simply-settings-core';
import sinon from 'sinon';

/** An org with US (California active, Guam inactive and hidden) and no other country. */
export const ADDRESS_SETTINGS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<AddressSettings xmlns="http://soap.sforce.com/2006/04/metadata">
    <countriesAndStates>
        <countries>
            <active>true</active>
            <integrationValue>United States</integrationValue>
            <isoCode>US</isoCode>
            <label>United States</label>
            <orgDefault>true</orgDefault>
            <standard>true</standard>
            <states>
                <active>true</active>
                <integrationValue>California</integrationValue>
                <isoCode>CA</isoCode>
                <label>California</label>
                <standard>true</standard>
                <visible>true</visible>
            </states>
            <states>
                <active>false</active>
                <integrationValue>Guam</integrationValue>
                <isoCode>GU</isoCode>
                <label>Guam</label>
                <standard>true</standard>
                <visible>false</visible>
            </states>
            <visible>true</visible>
        </countries>
    </countriesAndStates>
</AddressSettings>
`;

/** The smallest page `parseNewStateForm` accepts. */
export const NEW_STATE_FORM_HTML = `<html><body>
<form id="configurenew:j_id1" method="post" action="/i18n/ConfigureNewState.apexp">
  <input type="hidden" name="com.salesforce.visualforce.ViewState" value="VS" />
  <input type="text" name="configurenew:j_id1:blockNew:j_id9:nameSectionItem:editName" value="" />
  <input type="text" name="configurenew:j_id1:blockNew:j_id9:codeSectionItem:editIsoCode" value="" />
  <input type="text" name="configurenew:j_id1:blockNew:j_id9:intValSectionItem:editIntVal" value="" />
  <input type="submit" name="configurenew:j_id1:blockNew:j_id43:addButton" value="Add" />
</form></body></html>`;

export const SUCCESS_HTML = "<script>window.location.replace('/i18n/ConfigureCountry.apexp?success=true');</script>";

export const REJECTED_HTML =
  '<span><h4>Errors</h4></span><ul><li style="padding-top:5px">State Name: invalid value</li></ul>';

/**
 * Writes a file into a fresh temp directory.
 *
 * @param name - The file's name.
 * @param content - Its content.
 * @returns The file's path.
 */
export async function tempFile(name: string, content: string): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'simply-settings-test-'));
  const filePath = path.join(dir, name);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content);
  return filePath;
}

/**
 * Stubs the AddressSettings retrieve to report a file holding `xml`.
 *
 * @param $$ - The test context whose sandbox owns the stub.
 * @param xml - The settings XML the "org" returns.
 */
export async function stubRetrieve($$: TestContext, xml = ADDRESS_SETTINGS_XML): Promise<void> {
  const filePath = await tempFile(path.join('settings', 'Address.settings-meta.xml'), xml);
  $$.SANDBOX.stub(ComponentSet.prototype, 'retrieve').resolves({
    pollStatus: sinon.stub().resolves({
      getFileResponses: () => [{ fullName: 'Address', type: 'Settings', filePath, state: ComponentStatus.Created }],
    }),
  } as never);
}

/**
 * Stubs the `debian` ISO 3166-2 source, so no test touches salsa.debian.org.
 *
 * @param $$ - The test context whose sandbox owns the stubs.
 * @param subdivisions - What the source "downloads".
 * @param latest - The version it reports as its latest release.
 * @returns The stubs, to check which version was fetched.
 */
export function stubIsoCodes(
  $$: TestContext,
  subdivisions: IsoCodesSubdivision[],
  latest = 'v4.20.1',
): { resolveLatestVersion: sinon.SinonStub; fetchSubdivisions: sinon.SinonStub } {
  const source = ISO_CODES_SOURCES.debian;
  return {
    resolveLatestVersion: $$.SANDBOX.stub(source, 'resolveLatestVersion').resolves(latest),
    fetchSubdivisions: $$.SANDBOX.stub(source, 'fetchSubdivisions').callsFake(async (version: string) => ({
      url: `https://salsa.debian.org/iso-codes-team/iso-codes/-/raw/${version}/data/iso_3166-2.json`,
      subdivisions,
    })),
  };
}
