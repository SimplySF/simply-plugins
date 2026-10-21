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
  PermissionsBuildFileResult,
  PermissionsBuildResult,
  suffixedName,
} from '../../../../src/commands/simply/permissions/build.js';
import { writeFixtureProject } from '../../../helpers/fixtureProject.js';

describe('simply permissions build', () => {
  describe('with neither --file nor single-permission-set flags', () => {
    let originalCwd: string;
    let root: string;
    let warn: MockInstance;

    const writePermissionSetsFile = (file: string, value: unknown): void => {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(value));
    };
    const xmlPath = (name: string): string => `permissionsets/${name}.permissionset-meta.xml`;

    beforeEach(() => {
      originalCwd = process.cwd();
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-discover-'));
      process.chdir(root);
      writeFixtureProject('force-app');
      writePermissionSetsFile('config/b.psbuild.json', {
        defaults: { directory: 'force-app', output: 'permissionsets' },
        permissionSets: [
          { name: 'B_Admin', type: 'modify-all' },
          { name: 'B_Read_Only', type: 'read-only' },
        ],
      });
      writePermissionSetsFile('apps/a.psbuild.json', {
        defaults: { directory: 'force-app', output: 'permissionsets' },
        permissionSets: [{ name: 'A_Support', type: 'view-all' }],
      });
      warn = vi.spyOn(PermissionsBuild.prototype, 'warn');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.exitCode = undefined;
      process.chdir(originalCwd);
      fs.rmSync(root, { recursive: true, force: true });
    });

    it('should build every permission set in every .psbuild.json file, naming the file of each', async () => {
      const result = (await PermissionsBuild.run([])) as PermissionsBuildDiscoverResult;

      expect(result.map(({ file, name }) => ({ file, name }))).to.deep.equal([
        { file: 'apps/a.psbuild.json', name: 'A_Support' },
        { file: 'config/b.psbuild.json', name: 'B_Admin' },
        { file: 'config/b.psbuild.json', name: 'B_Read_Only' },
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
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('No permission sets files'));
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should write nothing from any file when one file is invalid, naming it', async () => {
      writePermissionSetsFile('config/b.psbuild.json', { permissionSets: [{ name: 'B', type: 'read-only' }] });

      const error = await PermissionsBuild.run([]).then(
        () => expect.fail('should have thrown Error'),
        (err: SfError) => err,
      );

      expect(error.message).to.match(
        /^Permission sets file config\/b\.psbuild\.json: The configuration file config\/b\.psbuild\.json is invalid/,
      );
      expect(fs.existsSync('permissionsets')).to.be.false;
    });

    it('should check every file with --check, reporting drift across files', async () => {
      await PermissionsBuild.run([]);
      fs.rmSync(xmlPath('B_Read_Only'));

      const result = (await PermissionsBuild.run(['--check'])) as PermissionsBuildDiscoverResult;

      expect(result.map(({ file, name, status }) => ({ file, name, status }))).to.deep.equal([
        { file: 'apps/a.psbuild.json', name: 'A_Support', status: 'up-to-date' },
        { file: 'config/b.psbuild.json', name: 'B_Admin', status: 'up-to-date' },
        { file: 'config/b.psbuild.json', name: 'B_Read_Only', status: 'missing' },
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

  describe('--file', () => {
    let root: string;
    let source: string;
    let output: string;

    const writeFile = (value: unknown): string => {
      const file = path.join(root, 'app.psbuild.json');
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

    it('should warn, and still build, when the file lacks the .psbuild.json suffix', async () => {
      const warn = vi.spyOn(PermissionsBuild.prototype, 'warn');
      const file = path.join(root, 'permission-sets.json');
      fs.writeFileSync(
        file,
        JSON.stringify({ defaults: { directory: source, output }, permissionSets: [{ name: 'A', type: 'read-only' }] }),
      );

      try {
        const result = (await PermissionsBuild.run(['--file', file])) as PermissionsBuildFileResult;

        expect(result.map((r) => r.name)).to.deep.equal(['A']);
        expect(warn).toHaveBeenCalledWith(
          `${file} doesn't end in .psbuild.json, so \`sf simply cicd build check-permission-sets\` won't find it. Rename it to ${path.join(root, 'permission-sets.psbuild.json')}.`,
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('should not warn about a file with the .psbuild.json suffix', async () => {
      const warn = vi.spyOn(PermissionsBuild.prototype, 'warn');
      const file = writeFile({
        defaults: { directory: source, output },
        permissionSets: [{ name: 'A', type: 'read-only' }],
      });

      try {
        await PermissionsBuild.run(['--file', file]);

        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('suffixedName', () => {
    it.each([
      ['config/permission-sets.json', 'config/permission-sets.psbuild.json'],
      ['perms', 'perms.psbuild.json'],
      ['perms.yaml', 'perms.yaml.psbuild.json'],
    ])('renames %s to %s', (file, expected) => {
      expect(suffixedName(file)).to.equal(expected);
    });
  });

  describe('--check', () => {
    let root: string;
    let source: string;
    let output: string;
    let file: string;
    let warn: MockInstance;

    beforeEach(async () => {
      root = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-permissions-build-check-'));
      source = path.join(root, 'force-app');
      output = path.join(root, 'permissionsets');
      writeFixtureProject(source);
      file = path.join(root, 'app.psbuild.json');
      fs.writeFileSync(
        file,
        JSON.stringify({
          defaults: { directory: source, output },
          permissionSets: [
            { name: 'App_Read_Only', type: 'read-only' },
            { name: 'App_Admin', type: 'modify-all' },
            { name: 'App_Support', type: 'view-all' },
          ],
        }),
      );
      await PermissionsBuild.run(['--file', file]);
      // SfCommand's error handling sets process.exitCode when an earlier test's command throws.
      process.exitCode = undefined;
      warn = vi.spyOn(PermissionsBuild.prototype, 'warn');
    });

    afterEach(() => {
      vi.restoreAllMocks();
      process.exitCode = undefined;
      fs.rmSync(root, { recursive: true, force: true });
    });

    const xmlPath = (name: string): string => path.join(output, `${name}.permissionset-meta.xml`);

    it('should report every permission set as up to date right after generating them', async () => {
      const result = (await PermissionsBuild.run(['--file', file, '--check'])) as PermissionsBuildFileResult;

      expect(result.map((r) => r.status)).to.deep.equal(['up-to-date', 'up-to-date', 'up-to-date']);
      expect(process.exitCode).to.be.undefined;
      expect(warn).not.toHaveBeenCalled();
    });

    it('should report drifted and missing permission sets, write nothing, and set exit code 1', async () => {
      const admin = fs.readFileSync(xmlPath('App_Admin'), 'utf-8');
      const drifted = admin.replace('<allowDelete>true</allowDelete>', '<allowDelete>false</allowDelete>');
      fs.writeFileSync(xmlPath('App_Admin'), drifted);
      fs.rmSync(xmlPath('App_Support'));

      const result = (await PermissionsBuild.run(['--file', file, '--check'])) as PermissionsBuildFileResult;

      expect(result.map(({ name, status }) => ({ name, status }))).to.deep.equal([
        { name: 'App_Read_Only', status: 'up-to-date' },
        { name: 'App_Admin', status: 'drifted' },
        { name: 'App_Support', status: 'missing' },
      ]);
      expect(result[1]).to.include({ path: xmlPath('App_Admin'), objectPermissionCount: 1, fieldPermissionCount: 2 });
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

      const result = (await PermissionsBuild.run(['--file', file, '--check'])) as PermissionsBuildFileResult;

      expect(result[1].status).to.equal('up-to-date');
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
