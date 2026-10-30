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
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SfError } from '@salesforce/core';
import { ComponentSet, SourceComponent } from '@salesforce/source-deploy-retrieve';
import DocumentErd from '../../../../src/commands/simply/document/erd.js';

const fixture = fileURLToPath(new URL('../../../fixtures/erd-project/', import.meta.url));

describe('simply document erd', () => {
  let directory: string;
  let outputFile: string;
  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-document-erd-'));
    outputFile = path.join(directory, 'erd.md');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const run = (source: string, output: string, extra: string[] = []) =>
    DocumentErd.run(['--directory', source, '--output-file', output, ...extra]);

  it('requires both directory and output-file', async () => {
    await expect(DocumentErd.run(['--output-file', outputFile])).rejects.toThrow('directory');
    await expect(DocumentErd.run(['--directory', directory])).rejects.toThrow('output-file');
  });

  it('writes an empty model without diagrams', async () => {
    const result = await run(directory, outputFile);
    expect(result).toEqual({
      outputFile,
      diagrams: [],
      objectCount: 0,
      relationshipCount: 0,
      externalObjects: [],
      unrelatedObjects: [],
      skippedFields: [],
    });
    expect(fs.readFileSync(outputFile, 'utf8')).toContain('No objects found');
  });

  it('returns the complete result shape and writes relationships without settings', async () => {
    const table = vi.spyOn(DocumentErd.prototype, 'table').mockImplementation(() => {});
    const log = vi.spyOn(DocumentErd.prototype, 'log').mockImplementation(() => {});
    const result = await run(fixture, outputFile);
    expect(result).toEqual({
      outputFile,
      diagrams: [{ name: 'erd-project', objectCount: 6, relationshipCount: 5, oversized: false }],
      objectCount: 7,
      relationshipCount: 5,
      externalObjects: ['Account', 'User'],
      unrelatedObjects: ['Audit_Log__c'],
      skippedFields: [],
    });
    const markdown = fs.readFileSync(outputFile, 'utf8');
    expect(markdown).toContain('Invoice__c ||--o{ Invoice_Line__c : "Invoice__c"');
    expect(markdown).toContain('Account |o..o{ Invoice__c : "Billing_Account__c"');
    expect(markdown).not.toContain('Feature_Flag');
    expect(markdown).toContain('Objects with no relationships');
    expect(markdown).toContain('Audit\\_Log\\_\\_c');
    expect(table).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: [
          { key: 'index', name: '#' },
          { key: 'name', name: 'DIAGRAM' },
          { key: 'objectCount', name: 'OBJECTS' },
          { key: 'relationshipCount', name: 'RELATIONSHIPS' },
        ],
      }),
    );
    expect(log).toHaveBeenCalledWith(`Wrote 1 diagram(s) to ${outputFile}.`);
  });

  it('emits a JSON envelope without human table or progress output', () => {
    const packageRoot = fileURLToPath(new URL('../../../../', import.meta.url));
    const stdout = execFileSync(
      process.execPath,
      [
        '--loader',
        'ts-node/esm',
        '--no-warnings=ExperimentalWarning',
        './bin/dev.js',
        'simply',
        'document',
        'erd',
        '--directory',
        fixture,
        '--output-file',
        outputFile,
        '--json',
      ],
      // CI sets FORCE_COLOR, which makes sf colorize the JSON envelope.
      { cwd: packageRoot, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } },
    );
    const envelope = JSON.parse(stdout) as {
      status: number;
      result: { objectCount: number; relationshipCount: number; outputFile: string };
    };
    expect(envelope.status).toBe(0);
    expect(envelope.result).toMatchObject({ objectCount: 7, relationshipCount: 5, outputFile });
    expect(stdout).not.toContain('Wrote ');
    expect(stdout).not.toContain('Scanning Salesforce');
    expect(stdout).not.toContain('DIAGRAM');
  });

  it('splits clusters and repeats the default User hub', async () => {
    const result = await run(fixture, outputFile, ['--max-objects', '3']);
    expect(result.diagrams).toEqual([
      { name: 'Case_Note__c', objectCount: 3, relationshipCount: 2, oversized: false },
      { name: 'Invoice__c', objectCount: 4, relationshipCount: 3, oversized: false },
    ]);
    expect(fs.readFileSync(outputFile, 'utf8').match(/User \|o\.\.o\{/g)).toHaveLength(2);
  });

  it('replaces the User default when an explicit hub is provided and warns for oversized clusters', async () => {
    const warn = vi.spyOn(DocumentErd.prototype, 'warn');
    const result = await run(fixture, outputFile, ['--max-objects', '2', '--hub', 'Account']);
    expect(result.diagrams).toHaveLength(1);
    expect(result.diagrams[0]).toEqual({ name: 'Invoice__c', objectCount: 6, relationshipCount: 5, oversized: true });
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Invoice__c has 4 in-project objects, more than --max-objects (2). Add a --hub to split it further.',
    );
  });

  it('rejects a max-objects value below two', async () => {
    await expect(run(fixture, outputFile, ['--max-objects', '1'])).rejects.toThrow('max-objects');
  });

  it('wraps scanning errors and stops the spinner', async () => {
    vi.spyOn(ComponentSet, 'fromSource').mockImplementation(() => {
      throw new Error('broken source');
    });
    await expect(run(directory, outputFile)).rejects.toThrow('Failed to scan the project directory: broken source');
    expect(fs.existsSync(outputFile)).toBe(false);
  });

  it('warns once for relationship fields missing referenceTo', async () => {
    const objects = path.join(directory, 'objects', 'Broken__c', 'fields');
    fs.mkdirSync(objects, { recursive: true });
    fs.writeFileSync(
      path.join(objects, 'Parent__c.field-meta.xml'),
      '<CustomField xmlns="http://soap.sforce.com/2006/04/metadata"><fullName>Parent__c</fullName><type>Lookup</type></CustomField>',
    );
    const warn = vi.spyOn(DocumentErd.prototype, 'warn');
    const result = await run(directory, outputFile);
    expect(result.skippedFields).toEqual(['Broken__c.Parent__c']);
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Skipped 1 relationship field(s) with no referenceTo: Broken__c.Parent__c',
    );
  });

  const writeFile = (file: string, content: string): void => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const xmlns = 'xmlns="http://soap.sforce.com/2006/04/metadata"';
  const lookup = (name: string, target: string): string =>
    `<CustomField ${xmlns}><fullName>${name}</fullName><type>Lookup</type><referenceTo>${target}</referenceTo></CustomField>`;

  it('ignores layouts so they never create pseudo-objects', async () => {
    const source = path.join(directory, 'src');
    writeFile(
      path.join(source, 'objects', 'Invoice__c', 'fields', 'Acct__c.field-meta.xml'),
      lookup('Acct__c', 'Account'),
    );
    writeFile(path.join(source, 'layouts', 'Global-Global Layout.layout-meta.xml'), `<Layout ${xmlns}/>`);
    writeFile(path.join(source, 'layouts', 'Account-Account Layout.layout-meta.xml'), `<Layout ${xmlns}/>`);
    const result = await run(source, outputFile);
    expect(result.externalObjects).toEqual(['Account']);
    expect(result.objectCount).toBe(2);
    expect(fs.readFileSync(outputFile, 'utf8')).not.toContain('Global');
  });

  it('uses --title, then sfdx-project.json name, then the directory name', async () => {
    const project = path.join(directory, 'proj');
    const source = path.join(project, 'force-app', 'main', 'default');
    writeFile(
      path.join(source, 'objects', 'Invoice__c', 'fields', 'Acct__c.field-meta.xml'),
      lookup('Acct__c', 'Account'),
    );
    writeFile(
      path.join(project, 'sfdx-project.json'),
      JSON.stringify({ name: 'billing-app', packageDirectories: [{ path: 'force-app', default: true }] }),
    );
    await run(source, outputFile, ['--title', 'Custom Title']);
    expect(fs.readFileSync(outputFile, 'utf8')).toContain('# Data model: Custom Title');
    await run(source, outputFile);
    expect(fs.readFileSync(outputFile, 'utf8')).toContain('# Data model: billing-app');
    fs.rmSync(path.join(project, 'sfdx-project.json'));
    await run(source, outputFile);
    expect(fs.readFileSync(outputFile, 'utf8')).toContain('# Data model: default');
  });

  it('matches --hub case-insensitively and warns for unknown explicit hubs', async () => {
    const warn = vi.spyOn(DocumentErd.prototype, 'warn');
    const result = await run(fixture, outputFile, ['--max-objects', '3', '--hub', 'invoice__c', '--hub', 'Nope__c']);
    expect(result.diagrams.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Nope__c'));
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('invoice__c'));
    const baseline = await run(fixture, outputFile, ['--max-objects', '3', '--hub', 'Invoice__c']);
    expect(result.diagrams).toEqual(baseline.diagrams);
  });

  it('does not warn when the default User hub is absent', async () => {
    const source = path.join(directory, 'src');
    writeFile(path.join(source, 'objects', 'A__c', 'fields', 'B__c.field-meta.xml'), lookup('B__c', 'B__c'));
    const warn = vi.spyOn(DocumentErd.prototype, 'warn');
    await run(source, outputFile);
    expect(warn).not.toHaveBeenCalled();
  });

  it('reports no relationships instead of printing an empty table', async () => {
    const source = path.join(directory, 'src');
    writeFile(
      path.join(source, 'objects', 'Lonely__c', 'Lonely__c.object-meta.xml'),
      `<CustomObject ${xmlns}><label>Lonely</label></CustomObject>`,
    );
    const table = vi.spyOn(DocumentErd.prototype, 'table').mockImplementation(() => {});
    const log = vi.spyOn(DocumentErd.prototype, 'log').mockImplementation(() => {});
    const result = await run(source, outputFile);
    expect(result.diagrams).toEqual([]);
    expect(table).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(`No relationships found; wrote the object list to ${outputFile}.`);
  });

  it('does not rewrap per-component parse errors as scanFailed', async () => {
    const source = path.join(directory, 'src');
    writeFile(path.join(source, 'objects', 'Bad__c', 'fields', 'X__c.field-meta.xml'), '<CustomField><fullName>');
    vi.spyOn(SourceComponent.prototype, 'parseXml').mockRejectedValue(new SfError('bad xml', 'ParseBoom'));
    const error = (await run(source, outputFile).catch((error_: unknown) => error_)) as Error;
    expect(error.name).toBe('ParseBoom');
    expect(error.message).toBe('bad xml');
  });

  it('keeps the original error as the cause of scanFailed', async () => {
    const original = new Error('broken source');
    vi.spyOn(ComponentSet, 'fromSource').mockImplementation(() => {
      throw original;
    });
    const error = (await run(directory, outputFile).catch((error_: unknown) => error_)) as Error;
    expect(error.name).toBe('ScanFailedError');
    expect(error.cause).toBe(original);
  });
});
