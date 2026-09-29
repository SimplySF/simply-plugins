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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SfError } from '@salesforce/core';
import { describe, expect, it } from 'vitest';
import PermissionsBuild from '../../../../src/commands/simply/permissions/build.js';
import { writeFixtureProject } from '../../../helpers/fixtureProject.js';

describe('simply permissions build', () => {
  it('should error without required flags', async () => {
    try {
      await PermissionsBuild.run([]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('type');
      expect(error.message).to.include('name');
      expect(error.message).to.include('directory');
      expect(error.message).to.include('output');
    }
  });

  it('should generate a read-only permission set from an empty source directory', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-'));
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-out-'));

    try {
      const result = await PermissionsBuild.run([
        '--type',
        'read-only',
        '--name',
        'Test_Permission_Set',
        '--directory',
        directory,
        '--output',
        output,
      ]);

      expect(result.objectPermissionCount).to.equal(0);
      expect(result.fieldPermissionCount).to.equal(0);
      expect(fs.existsSync(result.path)).to.be.true;

      const xml = fs.readFileSync(result.path, 'utf-8');
      expect(xml).to.include('<label>Test_Permission_Set</label>');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
      fs.rmSync(output, { recursive: true, force: true });
    }
  });

  it('should name fields and record types under an object folder Object.Child, not Object.Object.Child', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-'));
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-out-'));
    const config = path.join(output, 'config.json');
    writeFixtureProject(directory);
    fs.writeFileSync(config, JSON.stringify({ fields: { 'Widget__c.Color__c': { readable: false } } }));

    try {
      const result = await PermissionsBuild.run([
        '--type',
        'modify-all',
        '--name',
        'Test_Permission_Set',
        '--directory',
        directory,
        '--output',
        output,
        '--include-record-types',
        '--config',
        config,
      ]);

      const xml = fs.readFileSync(result.path, 'utf-8');
      expect(xml).not.to.include('Widget__c.Widget__c');
      expect(xml).to.include('<recordType>Widget__c.Standard</recordType>');
      // The override merges into the scanned field instead of being added alongside it.
      expect(xml.match(/<field>Widget__c\.Color__c<\/field>/g)).to.have.length(1);
      expect(xml).to.match(
        /<editable>true<\/editable>\s*<field>Widget__c\.Color__c<\/field>\s*<readable>false<\/readable>/,
      );
      // Required and master-detail fields never get field permissions; standalone fields keep their parent.
      expect(xml).not.to.include('Widget__c.Serial__c');
      expect(xml).not.to.include('Widget__c.Account__c');
      expect(xml).to.include('<field>Account.Rating__c</field>');
      expect(result.fieldPermissionCount).to.equal(2);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
      fs.rmSync(output, { recursive: true, force: true });
    }
  });
});
