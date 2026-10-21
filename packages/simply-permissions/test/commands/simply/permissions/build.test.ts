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
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import PermissionsBuild, {
  PermissionsBuildDiscoverResult,
  PermissionsBuildResult,
} from '../../../../src/commands/simply/permissions/build.js';
import { writeFixtureProject } from '../../../helpers/fixtureProject.js';

/** Writes a permission set build file for `name`, scanning `force-app` into `permissionsets` unless `settings` says otherwise. */
const writeBuildFile = (file: string, name: string, type: string, settings: Record<string, unknown> = {}): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ name, type, directory: 'force-app', output: 'permissionsets', ...settings }));
};

describe('simply permissions build', () => {
  describe('with no single-permission-set flags', () => {
    let originalCwd: string;
    let root: string;
    let warn: MockInstance;

    const xmlPath = (name: string): string => `permissionsets/${name}.permissionset-meta.xml`;
    const runExpectingError = (args: string[]): Promise<SfError> =>
      PermissionsBuild.run(args).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );

    beforeEach(() => {
      originalCwd = process.cwd();
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-discover-'));
      process.chdir(root);
      writeFixtureProject('force-app');
      writeBuildFile('config/b-admin.psbuild.json', 'B_Admin', 'modify-all');
      writeBuildFile('config/b-read-only.psbuild.json', 'B_Read_Only', 'read-only');
      writeBuildFile('apps/a.psbuild.json', 'A_Support', 'view-all');
      warn = vi.spyOn(PermissionsBuild.prototype, 'warn');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.exitCode = undefined;
      process.chdir(originalCwd);
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('should build the permission set defined by every .psbuild.json file, naming the file of each', async () => {
      const result = (await PermissionsBuild.run([])) as PermissionsBuildDiscoverResult;

      expect(result.map(({ file, name }) => ({ file, name }))).to.deep.equal([
        { file: 'apps/a.psbuild.json', name: 'A_Support' },
        { file: 'config/b-admin.psbuild.json', name: 'B_Admin' },
        { file: 'config/b-read-only.psbuild.json', name: 'B_Read_Only' },
      ]);
      expect(fs.readdirSync('permissionsets').sort()).to.deep.equal([
        'A_Support.permissionset-meta.xml',
        'B_Admin.permissionset-meta.xml',
        'B_Read_Only.permissionset-meta.xml',
      ]);
      expect(warn).not.toHaveBeenCalled();
    });

    it('should warn and return nothing when there are no .psbuild.json files', async () => {
      fs.rmSync('config', { recursive: true });
      fs.rmSync('apps', { recursive: true });

      const result = await PermissionsBuild.run([]);

      expect(result).to.deep.equal([]);
      expect(process.exitCode).to.be.undefined;
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('No permission set build files'));
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should apply every setting a file gives, with inline and file-referenced overrides', async () => {
      fs.writeFileSync('admin-overrides.json', JSON.stringify({ userPermissions: { ViewSetup: true } }));
      writeBuildFile('config/b-admin.psbuild.json', 'B_Admin', 'modify-all', {
        label: 'B Admin',
        includeRecordTypes: true,
        config: 'admin-overrides.json',
      });
      writeBuildFile('apps/a.psbuild.json', 'A_Support', 'view-all', {
        config: { tabs: { Widget__c: { visible: false } } },
      });

      await PermissionsBuild.run([]);

      const admin = fs.readFileSync(xmlPath('B_Admin'), 'utf-8');
      expect(admin).to.include('<label>B Admin</label>');
      expect(admin).to.include('<recordType>Widget__c.Standard</recordType>');
      expect(admin).to.include('<name>ViewSetup</name>');

      const support = fs.readFileSync(xmlPath('A_Support'), 'utf-8');
      expect(support).to.include('<viewAllRecords>true</viewAllRecords>');
      expect(support).to.match(/<tab>Widget__c<\/tab>\s*<visibility>Hidden<\/visibility>/);
    });

    it('should write nothing from any file when one file is invalid, naming it', async () => {
      writeBuildFile('config/b-read-only.psbuild.json', 'B_Read_Only', 'read-only', { output: undefined });

      const error = await runExpectingError([]);

      expect(error.message).to.match(
        /^Permission set build file config\/b-read-only\.psbuild\.json: The configuration file config\/b-read-only\.psbuild\.json is invalid/,
      );
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should write nothing when a source directory is missing, naming the file', async () => {
      writeBuildFile('config/b-admin.psbuild.json', 'B_Admin', 'modify-all', { directory: 'missing' });

      const error = await runExpectingError([]);

      expect(error.message).to.equal(
        'Permission set build file config/b-admin.psbuild.json: The source directory missing for permission set B_Admin does not exist.',
      );
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should reject a file in the old permissionSets list format with migration instructions', async () => {
      fs.writeFileSync(
        'config/b-admin.psbuild.json',
        JSON.stringify({
          defaults: { directory: 'force-app', output: 'permissionsets' },
          permissionSets: [{ name: 'B_Admin', type: 'modify-all' }],
        }),
      );

      const error = await runExpectingError([]);

      expect(error.message).to.equal(
        'Permission set build file config/b-admin.psbuild.json: config/b-admin.psbuild.json uses the old format, a "permissionSets" list, which is no longer supported. Split it into one .psbuild.json file per permission set, with each permission set\'s settings at the top level.',
      );
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should write nothing when two files define the same permission set, naming both', async () => {
      writeBuildFile('config/b-read-only.psbuild.json', 'B_Admin', 'read-only');

      const error = await runExpectingError([]);

      expect(error.message).to.equal(
        'Permission set B_Admin is defined by both config/b-admin.psbuild.json and config/b-read-only.psbuild.json. Each permission set must be defined by exactly one .psbuild.json file.',
      );
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should no longer accept --file', async () => {
      const error = await runExpectingError(['--file', 'config/b-admin.psbuild.json']);

      expect(error.message).to.include('--file');
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should check every file with --check, reporting drift across files', async () => {
      await PermissionsBuild.run([]);
      fs.rmSync(xmlPath('B_Read_Only'));

      const result = (await PermissionsBuild.run(['--check'])) as PermissionsBuildDiscoverResult;

      expect(result.map(({ file, name, status }) => ({ file, name, status }))).to.deep.equal([
        { file: 'apps/a.psbuild.json', name: 'A_Support', status: 'up-to-date' },
        { file: 'config/b-admin.psbuild.json', name: 'B_Admin', status: 'up-to-date' },
        { file: 'config/b-read-only.psbuild.json', name: 'B_Read_Only', status: 'missing' },
      ]);
      expect(process.exitCode).to.equal(1);
      expect(fs.existsSync(xmlPath('B_Read_Only'))).to.be.false;
    });

    it('should still require every single-permission-set flag once any is given', async () => {
      const error = await PermissionsBuild.run(['--name', 'PS']).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );

      expect(error.message).to.include('Missing required flag(s): --type, --directory, --output');
      expect(fs.existsSync('permissionsets')).to.be.false;
    });
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

  describe('--check', () => {
    const source = 'force-app';
    const output = 'permissionsets';
    let originalCwd: string;
    let root: string;
    let warn: MockInstance;

    beforeEach(async () => {
      originalCwd = process.cwd();
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-check-'));
      process.chdir(root);
      writeFixtureProject(source);
      writeBuildFile('App_Admin.psbuild.json', 'App_Admin', 'modify-all');
      writeBuildFile('App_Read_Only.psbuild.json', 'App_Read_Only', 'read-only');
      writeBuildFile('App_Support.psbuild.json', 'App_Support', 'view-all');
      await PermissionsBuild.run([]);
      // SfCommand's error handling sets process.exitCode when an earlier test's command throws.
      process.exitCode = undefined;
      warn = vi.spyOn(PermissionsBuild.prototype, 'warn');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.exitCode = undefined;
      process.chdir(originalCwd);
      fs.rmSync(root, { recursive: true, force: true });
    });

    const xmlPath = (name: string): string => path.join(output, `${name}.permissionset-meta.xml`);

    it('should report every permission set as up to date right after generating them', async () => {
      const result = (await PermissionsBuild.run(['--check'])) as PermissionsBuildDiscoverResult;

      expect(result.map((r) => r.status)).to.deep.equal(['up-to-date', 'up-to-date', 'up-to-date']);
      expect(process.exitCode).to.be.undefined;
      expect(warn).not.toHaveBeenCalled();
    });

    it('should report drifted and missing permission sets, write nothing, and set exit code 1', async () => {
      const admin = fs.readFileSync(xmlPath('App_Admin'), 'utf-8');
      const drifted = admin.replace('<allowDelete>true</allowDelete>', '<allowDelete>false</allowDelete>');
      fs.writeFileSync(xmlPath('App_Admin'), drifted);
      fs.rmSync(xmlPath('App_Support'));

      const result = (await PermissionsBuild.run(['--check'])) as PermissionsBuildDiscoverResult;

      expect(result.map(({ name, status }) => ({ name, status }))).to.deep.equal([
        { name: 'App_Admin', status: 'drifted' },
        { name: 'App_Read_Only', status: 'up-to-date' },
        { name: 'App_Support', status: 'missing' },
      ]);
      expect(result[0]).to.include({ path: xmlPath('App_Admin'), objectPermissionCount: 1, fieldPermissionCount: 2 });
      expect(process.exitCode).to.equal(1);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 of 3 permission set(s) have drifted'));
      expect(fs.readFileSync(xmlPath('App_Admin'), 'utf-8')).to.equal(drifted);
      expect(fs.existsSync(xmlPath('App_Support'))).to.be.false;
    });

    it('should treat a reformatted file as up to date', async () => {
      fs.writeFileSync(
        xmlPath('App_Admin'),
        fs.readFileSync(xmlPath('App_Admin'), 'utf-8').replaceAll('    ', '\t').replaceAll('\n', '\r\n'),
      );

      const result = (await PermissionsBuild.run(['--check'])) as PermissionsBuildDiscoverResult;

      expect(result[0].status).to.equal('up-to-date');
      expect(process.exitCode).to.be.undefined;
    });

    it('should check a single permission set described by flags', async () => {
      const flags = (name: string): string[] => [
        ...['--type', 'read-only', '--name', name],
        ...['--directory', source, '--output', output, '--check'],
      ];

      const upToDate = (await PermissionsBuild.run(flags('App_Read_Only'))) as PermissionsBuildResult;
      expect(upToDate).to.deep.equal({
        path: xmlPath('App_Read_Only'),
        objectPermissionCount: 1,
        fieldPermissionCount: 1,
        status: 'up-to-date',
      });
      expect(process.exitCode).to.be.undefined;

      const missing = (await PermissionsBuild.run(flags('Not_Generated'))) as PermissionsBuildResult;
      expect(missing.status).to.equal('missing');
      expect(process.exitCode).to.equal(1);
      expect(fs.existsSync(xmlPath('Not_Generated'))).to.be.false;
    });

    it('should still throw input errors rather than reporting drift', async () => {
      const error = await PermissionsBuild.run(['--type', 'read-only', '--name', 'PS', '--check']).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );
      expect(error.message).to.include('Missing required flag(s): --directory, --output');
    });
  });
});
