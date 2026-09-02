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
import type { Connection } from '@salesforce/core';
import { SfError } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import sinon from 'sinon';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import SchemaVisualize, {
  resolveRelationships,
  scanOrgSchema,
} from '../../../../src/commands/simply/schema/visualize.js';

describe('simply schema visualize', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  afterEach(() => {
    $$.restore();
  });

  it('should error when neither --target-org nor --source-dir is specified', async () => {
    try {
      await SchemaVisualize.run([]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('You must specify either --target-org or --source-dir');
    }
  });

  it('should error when both --target-org and --source-dir are specified', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-visualize-'));

    try {
      await SchemaVisualize.run(['--target-org', testOrg.username, '--source-dir', directory]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('You must specify either --target-org or --source-dir');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should visualize schema from local source directories', async () => {
    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-visualize-src-'));
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-visualize-out-'));

    try {
      const myObjectDir = path.join(sourceDir, 'objects', 'MyObject__c');
      fs.mkdirSync(path.join(myObjectDir, 'fields'), { recursive: true });
      fs.writeFileSync(
        path.join(myObjectDir, 'MyObject__c.object-meta.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">',
          '    <label>My Object</label>',
          '    <pluralLabel>My Objects</pluralLabel>',
          '    <deploymentStatus>Deployed</deploymentStatus>',
          '</CustomObject>',
        ].join('\n'),
      );
      fs.writeFileSync(
        path.join(myObjectDir, 'fields', 'Related__c.field-meta.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">',
          '    <fullName>Related__c</fullName>',
          '    <label>Related</label>',
          '    <type>Lookup</type>',
          '    <referenceTo>RelatedObject__c</referenceTo>',
          '    <relationshipName>Related</relationshipName>',
          '</CustomField>',
        ].join('\n'),
      );

      const relatedObjectDir = path.join(sourceDir, 'objects', 'RelatedObject__c');
      fs.mkdirSync(relatedObjectDir, { recursive: true });
      fs.writeFileSync(
        path.join(relatedObjectDir, 'RelatedObject__c.object-meta.xml'),
        [
          '<?xml version="1.0" encoding="UTF-8"?>',
          '<CustomObject xmlns="http://soap.sforce.com/2006/04/metadata">',
          '    <label>Related Object</label>',
          '    <pluralLabel>Related Objects</pluralLabel>',
          '    <deploymentStatus>Deployed</deploymentStatus>',
          '</CustomObject>',
        ].join('\n'),
      );

      const result = await SchemaVisualize.run([
        '--source-dir',
        sourceDir,
        '--output-dir',
        outputDir,
        '--output-type',
        'csv,md,html',
      ]);

      expect(result.objectCount).to.equal(2);
      expect(result.relationshipCount).to.equal(1);

      expect(result.csvPath).to.be.a('string');
      expect(result.markdownPath).to.be.a('string');
      expect(result.htmlPath).to.be.a('string');

      const csv = fs.readFileSync(result.csvPath!, 'utf-8');
      expect(csv).to.include('MyObject__c');
      expect(csv).to.include('RelatedObject__c');

      const markdown = fs.readFileSync(result.markdownPath!, 'utf-8');
      expect(markdown).to.include('erDiagram');
      expect(markdown).to.include('My Object');

      const html = fs.readFileSync(result.htmlPath!, 'utf-8');
      expect(html).to.include('My Object');
      expect(html).to.include('Related Object');
    } finally {
      fs.rmSync(sourceDir, { recursive: true, force: true });
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it('should error when no object definitions are found locally', async () => {
    const sourceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-visualize-src-'));

    try {
      await SchemaVisualize.run(['--source-dir', sourceDir]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('No object definitions found');
    } finally {
      fs.rmSync(sourceDir, { recursive: true, force: true });
    }
  });

  // Real jsforce Connection instances wrap describeGlobal/describe in their own caching layer
  // (see @jsforce/jsforce-node/lib/connection.js), which doesn't play well with sinon-stubbing
  // Connection.prototype directly. So the org-scan path is exercised against a minimal fake
  // connection object here instead of a full SfCommand.run() through a real Connection.
  it('should scan a live org for objects and relationships', async () => {
    const fakeConnection = {
      describeGlobal: () =>
        Promise.resolve({
          sobjects: [
            { name: 'MyObject__c', label: 'My Object', custom: true },
            { name: 'RelatedObject__c', label: 'Related Object', custom: true },
          ],
        }),
      describe: () => Promise.resolve({ childRelationships: [] }),
      autoFetchQuery: (soql: string) => {
        if (soql.startsWith('SELECT DurableId, QualifiedApiName, Publisher.Name FROM EntityDefinition')) {
          return Promise.resolve({
            records: [
              { DurableId: '01I000000000001', QualifiedApiName: 'MyObject__c', Publisher: { Name: '<local>' } },
              { DurableId: '01I000000000002', QualifiedApiName: 'RelatedObject__c', Publisher: { Name: '<local>' } },
            ],
            done: true,
            totalSize: 2,
          });
        }

        if (
          soql.startsWith('SELECT EntityDefinition.QualifiedApiName, ReferenceTo, QualifiedApiName, Label, DataType')
        ) {
          return Promise.resolve({
            records: [
              {
                EntityDefinition: { QualifiedApiName: 'MyObject__c' },
                QualifiedApiName: 'Related__c',
                Label: 'Related',
                DataType: 'Lookup(RelatedObject__c)',
                ReferenceTo: { referenceTo: ['RelatedObject__c'] },
              },
            ],
            done: true,
            totalSize: 1,
          });
        }

        return Promise.reject(new Error(`Unexpected query: ${soql}`));
      },
    } as unknown as Connection;

    const { objectMap, relationships, initialObjects } = await scanOrgSchema(fakeConnection, {
      objectType: 'custom',
      fieldType: 'custom',
      sourceObjects: 'MyObject__c,RelatedObject__c',
      relatedObjects: '',
    });

    expect(initialObjects).to.deep.equal(['MyObject__c', 'RelatedObject__c']);
    expect(objectMap.get('MyObject__c')?.project).to.equal('Local (Unpackaged)');
    expect(relationships).to.have.lengthOf(1);

    const { objectsToProcess, validRelationships } = resolveRelationships(objectMap, relationships, initialObjects, '');

    expect(objectsToProcess).to.have.members(['MyObject__c', 'RelatedObject__c']);
    expect(validRelationships).to.have.lengthOf(1);
    expect(validRelationships[0]).to.deep.include({
      from: 'MyObject__c',
      to: 'RelatedObject__c',
      isMasterDetail: false,
    });
  });
});
