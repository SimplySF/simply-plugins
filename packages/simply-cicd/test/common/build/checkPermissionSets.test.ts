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
import { execa } from 'execa';
import { generatePermissionSets, loadPermissionSetsFile } from '@simplysf/simply-permissions-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findPermissionSetsFiles, runCheckPermissionSets } from '../../../src/common/build/checkPermissionSets.js';
import { logger } from '../../../src/common/logger.js';

vi.mock('../../../src/common/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    log: vi.fn(),
    raw: vi.fn(),
    debug: vi.fn(),
  },
}));

const NS = 'xmlns="http://soap.sforce.com/2006/04/metadata"';
const OUTPUT = 'force-app/main/default/permissionsets';

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/** A `Widget__c` object with one text field under `force-app`. */
function writeSource(): void {
  write(
    'force-app/main/default/objects/Widget__c/Widget__c.object-meta.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<CustomObject ${NS}><label>Widget</label><pluralLabel>Widgets</pluralLabel><nameField><label>Name</label><type>Text</type></nameField><deploymentStatus>Deployed</deploymentStatus><sharingModel>ReadWrite</sharingModel></CustomObject>\n`,
  );
  writeField('Color__c');
}

function writeField(name: string): void {
  write(
    `force-app/main/default/objects/Widget__c/fields/${name}.field-meta.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<CustomField ${NS}><fullName>${name}</fullName><label>${name}</label><type>Text</type><length>40</length><required>false</required></CustomField>\n`,
  );
}

function writePermissionSetsFile(file: string, names: string[]): void {
  write(
    file,
    JSON.stringify({
      defaults: { directory: 'force-app', output: OUTPUT },
      permissionSets: names.map((name) => ({ name, type: 'modify-all' })),
    }),
  );
}

/** Generates every permission set `file` declares, as `simply permissions build --file` would. */
async function generate(file: string): Promise<void> {
  await generatePermissionSets(await loadPermissionSetsFile(file));
}

const xmlPath = (name: string): string => path.join(OUTPUT, `${name}.permissionset-meta.xml`);

describe('checkPermissionSets', () => {
  let originalCwd: string;
  let root: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    originalCwd = process.cwd();
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-permission-sets-'));
    process.chdir(root);
    await execa('git', ['init', '-q']);
    writeSource();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('findPermissionSetsFiles', () => {
    it('finds permission sets files at any depth by shape, sorted, and skips every other JSON file', async () => {
      writePermissionSetsFile('config/permission-sets.json', ['A']);
      writePermissionSetsFile('apps/sales/perms.json', ['B']);
      write('config/admin-overrides.json', JSON.stringify({ userPermissions: { ViewSetup: true } }));
      write('package.json', JSON.stringify({ name: 'x' }));
      write('tsconfig.json', '{ // a comment\n "compilerOptions": {} }');
      write('not-an-array.json', JSON.stringify({ permissionSets: 'A' }));
      write('top-level-array.json', JSON.stringify([{ permissionSets: [] }]));

      expect(await findPermissionSetsFiles()).toStrictEqual(['apps/sales/perms.json', 'config/permission-sets.json']);
    });

    it('includes tracked and untracked files but skips gitignored ones', async () => {
      writePermissionSetsFile('tracked.json', ['A']);
      await execa('git', ['add', 'tracked.json']);
      writePermissionSetsFile('untracked.json', ['B']);
      writePermissionSetsFile('node_modules/pkg/perms.json', ['C']);
      writePermissionSetsFile('ignored/perms.json', ['D']);
      write('.gitignore', 'node_modules/\nignored/\n');

      expect(await findPermissionSetsFiles()).toStrictEqual(['tracked.json', 'untracked.json']);
    });

    it('skips a tracked file that has been deleted from the working tree', async () => {
      writePermissionSetsFile('perms.json', ['A']);
      await execa('git', ['add', 'perms.json']);
      fs.rmSync('perms.json');

      expect(await findPermissionSetsFiles()).toStrictEqual([]);
    });
  });

  describe('runCheckPermissionSets', () => {
    it('skips when disabled', async () => {
      writePermissionSetsFile('perms.json', ['A']);

      expect(await runCheckPermissionSets({ disabled: true })).toStrictEqual({ skipped: true, files: [] });
      expect(logger.warn).toHaveBeenCalledWith('check-permission-sets is disabled. Skipping.');
    });

    it('skips when the repo has no permission sets files', async () => {
      expect(await runCheckPermissionSets({})).toStrictEqual({ skipped: true, files: [] });
      expect(logger.warn).toHaveBeenCalledWith('No permission sets files found. Skipping.');
    });

    it('succeeds when every permission set is up to date, resolving paths against the current directory', async () => {
      writePermissionSetsFile('config/permission-sets.json', ['App_Admin', 'App_Support']);
      await generate('config/permission-sets.json');

      const result = await runCheckPermissionSets({});

      expect(result.skipped).toBe(false);
      expect(result.files).toHaveLength(1);
      expect(result.files[0].file).toBe('config/permission-sets.json');
      expect(
        result.files[0].permissionSets.map(({ name, path: p, status }) => ({ name, path: p, status })),
      ).toStrictEqual([
        { name: 'App_Admin', path: xmlPath('App_Admin'), status: 'up-to-date' },
        { name: 'App_Support', path: xmlPath('App_Support'), status: 'up-to-date' },
      ]);
      expect(logger.success).toHaveBeenLastCalledWith(
        'All 2 permission set(s) in 1 permission sets file(s) are up to date.',
      );
    });

    it('checks every file before failing, naming each stale permission set and the command that fixes its file', async () => {
      writePermissionSetsFile('a/perms.json', ['A_Admin', 'A_Missing']);
      writePermissionSetsFile('b/perms.json', ['B_Admin']);
      await generate('a/perms.json');
      await generate('b/perms.json');
      fs.rmSync(xmlPath('A_Missing'));
      writeField('Size__c');
      const before = fs.readFileSync(xmlPath('B_Admin'), 'utf8');

      await expect(runCheckPermissionSets({})).rejects.toThrow(
        '3 of 3 permission set(s) have drifted from their source metadata or are missing.',
      );

      expect(logger.error).toHaveBeenCalledWith(`A_Admin drifted ${xmlPath('A_Admin')}`);
      expect(logger.error).toHaveBeenCalledWith(`A_Missing missing ${xmlPath('A_Missing')}`);
      expect(logger.error).toHaveBeenCalledWith(`B_Admin drifted ${xmlPath('B_Admin')}`);
      expect(logger.log).toHaveBeenCalledWith('Regenerate with: sf simply permissions build --file a/perms.json');
      expect(logger.log).toHaveBeenCalledWith('Regenerate with: sf simply permissions build --file b/perms.json');
      // Nothing written: the missing file stays missing and the drifted one keeps its old content.
      expect(fs.existsSync(xmlPath('A_Missing'))).toBe(false);
      expect(fs.readFileSync(xmlPath('B_Admin'), 'utf8')).toBe(before);
    });

    it('fails at once on an invalid permission sets file, naming it, without checking later files', async () => {
      write('a/perms.json', JSON.stringify({ permissionSets: [{ name: 'A', type: 'read-only' }] }));
      writePermissionSetsFile('b/perms.json', ['B']);

      await expect(runCheckPermissionSets({})).rejects.toThrow(
        /^Permission sets file a\/perms\.json: The configuration file a\/perms\.json is invalid: /,
      );

      expect(logger.info).toHaveBeenCalledWith('Checking permission sets file a/perms.json...');
      expect(logger.info).not.toHaveBeenCalledWith('Checking permission sets file b/perms.json...');
    });

    it('names the permission sets file when a source directory is missing', async () => {
      write(
        'perms.json',
        JSON.stringify({ permissionSets: [{ name: 'A', type: 'read-only', directory: 'nope', output: OUTPUT }] }),
      );

      await expect(runCheckPermissionSets({})).rejects.toThrow(
        'Permission sets file perms.json: The source directory nope for permission set A does not exist.',
      );
    });
  });
});
