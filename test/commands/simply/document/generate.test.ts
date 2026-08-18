/*
 * Copyright (c) 2026, Clay Chipps.
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
import DocumentGenerate from '../../../../src/commands/simply/document/generate.js';

describe('simply document generate', () => {
  it('should error without required flags', async () => {
    try {
      await DocumentGenerate.run([]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('directory');
      expect(error.message).to.include('output-file');
    }
  });

  it('should reject an unsupported --output-format', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-document-generate-'));
    const outputFile = path.join(os.tmpdir(), `simply-document-generate-${Date.now()}.html`);

    try {
      await DocumentGenerate.run([
        '--directory',
        directory,
        '--output-file',
        outputFile,
        '--output-format',
        'markdown',
      ]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('output-format');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should generate a document with no components from an empty source directory', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-document-generate-'));
    const outputFile = path.join(os.tmpdir(), `simply-document-generate-${Date.now()}.html`);

    try {
      const result = await DocumentGenerate.run(['--directory', directory, '--output-file', outputFile]);

      expect(result.componentCount).to.equal(0);
      expect(fs.existsSync(outputFile)).to.be.true;

      const html = fs.readFileSync(outputFile, 'utf-8');
      expect(html).to.include('<h2>Objects</h2>');
      expect(html).to.include('<p>None</p>');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
      fs.rmSync(outputFile, { force: true });
    }
  });

  it('should accept an explicit --output-format html', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-document-generate-'));
    const outputFile = path.join(os.tmpdir(), `simply-document-generate-${Date.now()}.html`);

    try {
      const result = await DocumentGenerate.run([
        '--directory',
        directory,
        '--output-file',
        outputFile,
        '--output-format',
        'html',
      ]);

      expect(result.componentCount).to.equal(0);
      expect(fs.existsSync(outputFile)).to.be.true;
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
      fs.rmSync(outputFile, { force: true });
    }
  });

  it('should scan an Apex class and a custom object into the generated document', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-document-generate-'));
    const outputFile = path.join(os.tmpdir(), `simply-document-generate-${Date.now()}.html`);

    try {
      const classesDir = path.join(directory, 'classes');
      fs.mkdirSync(classesDir, { recursive: true });
      fs.writeFileSync(path.join(classesDir, 'MyClass.cls'), 'public class MyClass {}');
      fs.writeFileSync(
        path.join(classesDir, 'MyClass.cls-meta.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">',
          '    <apiVersion>59.0</apiVersion>',
          '    <status>Active</status>',
          '</ApexClass>',
        ].join('\n'),
      );

      const objectDir = path.join(directory, 'objects', 'MyObject__c');
      fs.mkdirSync(objectDir, { recursive: true });
      fs.writeFileSync(
        path.join(objectDir, 'MyObject__c.object-meta.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">',
          '    <label>My Object</label>',
          '    <pluralLabel>My Objects</pluralLabel>',
          '    <nameField>',
          '        <label>My Object Name</label>',
          '        <type>Text</type>',
          '    </nameField>',
          '    <deploymentStatus>Deployed</deploymentStatus>',
          '    <sharingModel>ReadWrite</sharingModel>',
          '</CustomObject>',
        ].join('\n'),
      );

      const result = await DocumentGenerate.run(['--directory', directory, '--output-file', outputFile]);

      expect(result.componentCount).to.be.greaterThan(0);

      const html = fs.readFileSync(outputFile, 'utf-8');
      expect(html).to.include('MyClass');
      expect(html).to.include('My Object');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
      fs.rmSync(outputFile, { force: true });
    }
  });

  it('should render a user-supplied --template-file, reusing the built-in loud helper', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-document-generate-'));
    const outputFile = path.join(os.tmpdir(), `simply-document-generate-${Date.now()}.html`);
    const templateFile = path.join(os.tmpdir(), `simply-document-generate-template-${Date.now()}.hbs`);

    try {
      const classesDir = path.join(directory, 'classes');
      fs.mkdirSync(classesDir, { recursive: true });
      fs.writeFileSync(path.join(classesDir, 'MyClass.cls'), 'public class MyClass {}');
      fs.writeFileSync(
        path.join(classesDir, 'MyClass.cls-meta.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">',
          '    <apiVersion>59.0</apiVersion>',
          '    <status>active</status>',
          '</ApexClass>',
        ].join('\n'),
      );

      fs.writeFileSync(
        templateFile,
        [
          '<h1>Custom TDD</h1>',
          '{{#each apexClasses}}',
          '<p>{{this.name}}: {{loud this.status}}</p>',
          '{{/each}}',
        ].join('\n'),
      );

      const result = await DocumentGenerate.run([
        '--directory',
        directory,
        '--output-file',
        outputFile,
        '--template-file',
        templateFile,
      ]);

      expect(result.componentCount).to.be.greaterThan(0);

      const html = fs.readFileSync(outputFile, 'utf-8');
      expect(html).to.include('<h1>Custom TDD</h1>');
      expect(html).to.include('MyClass: ACTIVE');
      expect(html).not.to.include('<h2>Objects</h2>');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
      fs.rmSync(outputFile, { force: true });
      fs.rmSync(templateFile, { force: true });
    }
  });
});
