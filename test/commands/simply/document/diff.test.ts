/*
 * Copyright (c) 2026, Clay Chipps; Copyright (c) 2026 Salesforce, Inc.
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

import { exec as execCallback } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SfError } from '@salesforce/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DocumentDiff from '../../../../src/commands/simply/document/diff.js';

vi.mock('node:child_process', () => ({ exec: vi.fn() }));

type ExecCallback = (error: Error | null, result: { stdout: string; stderr: string }) => void;

function mockGitDiffOutput(stdout: string): void {
  vi.mocked(execCallback).mockImplementation(((_command: string, callback: ExecCallback) => {
    callback(null, { stdout, stderr: '' });
  }) as unknown as typeof execCallback);
}

describe('simply document diff', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should error without required flags', async () => {
    try {
      await DocumentDiff.run([]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('from-tag');
      expect(error.message).to.include('to-tag');
    }
  });

  it('should group changed files by component type and print to stdout', async () => {
    const gitDiffOutput = [
      'A\tforce-app/main/default/classes/MyClass.cls',
      'M\tforce-app/main/default/lwc/myComponent/myComponent.js',
      'D\tforce-app/main/default/objects/MyObject__c/fields/MyField__c.field-meta.xml',
      'R100\tforce-app/main/default/triggers/OldTrigger.trigger\tforce-app/main/default/triggers/NewTrigger.trigger',
    ].join('\n');
    mockGitDiffOutput(gitDiffOutput);

    const result = await DocumentDiff.run(['--from-tag', 'v1', '--to-tag', 'v2']);

    expect(execCallback).toHaveBeenCalledWith('git diff --name-status v1..v2', expect.any(Function));
    expect(result.outputFile).to.be.undefined;
    expect(result.html).to.include('MyClass');
    expect(result.html).to.include('myComponent');
    expect(result.html).to.include('MyObject__c');
    expect(result.html).to.include('NewTrigger');
    expect(result.html).to.include('Renamed from');
  });

  it('should write the report to --output-file when specified', async () => {
    mockGitDiffOutput('A\tforce-app/main/default/classes/MyClass.cls');

    const outputFile = path.join(os.tmpdir(), `simply-document-diff-${Date.now()}.html`);

    try {
      const result = await DocumentDiff.run(['--from-tag', 'v1', '--to-tag', 'v2', '--output-file', outputFile]);

      expect(result.outputFile).to.equal(outputFile);
      expect(fs.existsSync(outputFile)).to.be.true;
      expect(fs.readFileSync(outputFile, 'utf-8')).to.equal(result.html);
    } finally {
      fs.rmSync(outputFile, { force: true });
    }
  });

  it('should render an empty report when there are no changed files', async () => {
    mockGitDiffOutput('');

    const result = await DocumentDiff.run(['--from-tag', 'v1', '--to-tag', 'v2']);

    expect(result.html).to.include('<p>None</p>');
    expect(result.html).not.to.include('<table');
  });
});
