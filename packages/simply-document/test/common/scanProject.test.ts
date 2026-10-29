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

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { scanProject } from '../../src/common/scanProject.js';

const fixture = fileURLToPath(new URL('../fixtures/erd-project/', import.meta.url));

describe('scanProject', () => {
  it('preserves raw relationship metadata alongside display types and buckets custom settings separately', async () => {
    const names: string[] = [];
    const data = await scanProject(fixture, (name) => names.push(name));
    expect(data.customObjects.find((object) => object.name === 'Invoice_Line__c')?.customFields).toEqual([
      expect.objectContaining({
        fieldType: 'MasterDetail',
        referenceTo: 'Invoice__c',
        type: 'MasterDetail(Invoice__c)',
      }),
    ]);
    expect(data.customSettings.map((object) => object.name)).toEqual(['Feature_Flag__c']);
    expect(data.customObjects.map((object) => object.name)).not.toContain('Feature_Flag__c');
    expect(names).toContain('Invoice_Line__c');
  });

  it('keeps the raw type of formula fields', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-document-formula-'));
    try {
      const fields = path.join(directory, 'objects', 'Invoice__c', 'fields');
      fs.mkdirSync(fields, { recursive: true });
      fs.writeFileSync(
        path.join(fields, 'Total__c.field-meta.xml'),
        '<CustomField xmlns="http://soap.sforce.com/2006/04/metadata"><fullName>Total__c</fullName><type>Number</type><formula>1</formula></CustomField>',
      );
      const data = await scanProject(directory);
      expect(data.customObjects[0].customFields?.[0]).toMatchObject({ fieldType: 'Number', type: 'Formula(Number)' });
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('propagates source resolution errors', async () => {
    await expect(scanProject(path.join(fixture, 'missing'))).rejects.toThrow();
  });
});
