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

/* eslint-disable camelcase -- Salesforce API names (Widget__c, etc.) as override keys */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SfError } from '@salesforce/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PermissionsBuild, {
  PermissionsBuildFileResult,
  PermissionsBuildResult,
} from '../../../../src/commands/simply/permissions/build.js';
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
      const result = (await PermissionsBuild.run([
        '--type',
        'read-only',
        '--name',
        'Test_Permission_Set',
        '--directory',
        directory,
        '--output',
        output,
      ])) as PermissionsBuildResult;

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

  it('should name only the missing flags when some single-permission-set flags are given', async () => {
    const error = await PermissionsBuild.run(['--type', 'read-only', '--name', 'PS']).then(
      () => expect.fail('should have thrown Error'),
      (err: SfError) => err,
    );
    expect(error.message).to.include('Missing required flag(s): --directory, --output');
  });

  it('should report an invalid --config file by path', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-'));
    const config = path.join(directory, 'config.json');
    fs.writeFileSync(config, JSON.stringify({ objects: { Account: { read: 'yes' } } }));

    try {
      const error = await PermissionsBuild.run([
        '--type',
        'read-only',
        '--name',
        'PS',
        '--directory',
        directory,
        '--output',
        directory,
        '--config',
        config,
      ]).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );
      expect(error.message).to.include(`The configuration file ${config} is invalid`);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should name fields and record types under an object folder Object.Child, not Object.Object.Child', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-'));
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-out-'));
    const config = path.join(output, 'config.json');
    writeFixtureProject(directory);
    fs.writeFileSync(config, JSON.stringify({ fields: { 'Widget__c.Color__c': { readable: false } } }));

    try {
      const result = (await PermissionsBuild.run([
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
      ])) as PermissionsBuildResult;

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

  describe('--file', () => {
    let root: string;
    let source: string;
    let output: string;

    const writeFile = (value: unknown): string => {
      const file = path.join(root, 'permission-sets.json');
      fs.writeFileSync(file, JSON.stringify(value));
      return file;
    };

    beforeEach(() => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-file-'));
      source = path.join(root, 'force-app');
      output = path.join(root, 'permissionsets');
      writeFixtureProject(source);
    });

    afterEach(() => {
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('should generate every permission set declared in the file', async () => {
      const overrides = path.join(root, 'admin-overrides.json');
      fs.writeFileSync(overrides, JSON.stringify({ userPermissions: { ViewSetup: true } }));
      const file = writeFile({
        defaults: { directory: source, output },
        permissionSets: [
          { name: 'App_Read_Only', type: 'read-only' },
          { name: 'App_Admin', type: 'modify-all', label: 'App Admin', includeRecordTypes: true, config: overrides },
          { name: 'App_Support', type: 'view-all', config: { tabs: { Widget__c: { visible: false } } } },
        ],
      });

      const result = (await PermissionsBuild.run(['--file', file])) as PermissionsBuildFileResult;

      expect(result.map((r) => r.name)).to.deep.equal(['App_Read_Only', 'App_Admin', 'App_Support']);
      expect(fs.readdirSync(output).sort()).to.deep.equal([
        'App_Admin.permissionset-meta.xml',
        'App_Read_Only.permissionset-meta.xml',
        'App_Support.permissionset-meta.xml',
      ]);

      const admin = fs.readFileSync(path.join(output, 'App_Admin.permissionset-meta.xml'), 'utf-8');
      expect(admin).to.include('<label>App Admin</label>');
      expect(admin).to.include('<recordType>Widget__c.Standard</recordType>');
      expect(admin).to.include('<name>ViewSetup</name>');

      const support = fs.readFileSync(path.join(output, 'App_Support.permissionset-meta.xml'), 'utf-8');
      expect(support).to.include('<viewAllRecords>true</viewAllRecords>');
      expect(support).to.match(/<tab>Widget__c<\/tab>\s*<visibility>Hidden<\/visibility>/);
    });

    it('should reject --file combined with single-permission-set flags', async () => {
      const file = writeFile({
        defaults: { directory: source, output },
        permissionSets: [{ name: 'A', type: 'read-only' }],
      });

      const error = await PermissionsBuild.run(['--file', file, '--type', 'read-only']).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );
      expect(error.message).to.include('--type');
      expect(error.message).to.include('--file');
      expect(fs.existsSync(output)).to.be.false;
    });

    it('should write nothing when any entry is invalid', async () => {
      const file = writeFile({
        defaults: { output },
        permissionSets: [
          { name: 'Good', type: 'read-only', directory: source },
          { name: 'Bad', type: 'read-only', directory: path.join(root, 'missing') },
        ],
      });

      const error = await PermissionsBuild.run(['--file', file]).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );
      expect(error.message).to.include(
        `The source directory ${path.join(root, 'missing')} for permission set Bad does not exist.`,
      );
      expect(fs.existsSync(output)).to.be.false;
    });

    it('should report schema violations with the file path', async () => {
      const file = writeFile({ permissionSets: [{ name: 'A', type: 'read-only' }] });

      const error = await PermissionsBuild.run(['--file', file]).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );
      expect(error.message).to.include(`The configuration file ${file} is invalid`);
      expect(error.message).to.include("'directory' must be set on the permission set or in 'defaults'");
    });
  });
});
