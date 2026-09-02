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
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import SchemaGenerate from '../../../../src/commands/simply/schema/generate.js';

describe('simply schema generate', () => {
  it('should error without required flags', async () => {
    try {
      await SchemaGenerate.run([]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('file');
      expect(error.message).to.include('output-dir');
    }
  });

  it('should error when --file does not exist', async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-generate-out-'));

    try {
      await SchemaGenerate.run(['--file', path.join(outputDir, 'does-not-exist.csv'), '--output-dir', outputDir]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('does-not-exist.csv');
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });

  describe('CSV flow', () => {
    it('should generate object, field, and record type metadata from a CSV file', async () => {
      const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-generate-out-'));
      const csvPath = path.join(outputDir, 'schema.csv');

      const csv = [
        'Type,ObjectName,ApiName,Label,FieldType,Required,ValueSet,PluralLabel,SharingModel,Visibility,Active,PicklistAssignments,DeploymentStatus',
        'CustomObject,MyObject__c,,My Object,,,,My Objects,ReadWrite,Public,,,Deployed',
        'CustomField,MyObject__c,Description__c,Description,Text,true,,,,,,,',
        'CustomField,MyObject__c,Status__c,Status,Picklist,,Open;Closed,,,,,,',
        'RecordType,MyObject__c,Default,Default,,,,,,,true,,',
      ].join('\n');
      fs.writeFileSync(csvPath, csv);

      try {
        const result = await SchemaGenerate.run(['--file', csvPath, '--output-dir', outputDir]);

        expect(result.objectCount).to.equal(1);
        expect(result.fieldCount).to.equal(2);
        expect(result.recordTypeCount).to.equal(1);

        const objectXml = fs.readFileSync(path.join(outputDir, 'MyObject__c', 'MyObject__c.object-meta.xml'), 'utf-8');
        expect(objectXml).to.include('<label>My Object</label>');
        expect(objectXml).to.include('<pluralLabel>My Objects</pluralLabel>');

        const descriptionFieldXml = fs.readFileSync(
          path.join(outputDir, 'MyObject__c', 'fields', 'Description__c.field-meta.xml'),
          'utf-8',
        );
        expect(descriptionFieldXml).to.include('<fullName>Description__c</fullName>');
        expect(descriptionFieldXml).to.include('<type>Text</type>');
        expect(descriptionFieldXml).to.include('<required>true</required>');

        const statusFieldXml = fs.readFileSync(
          path.join(outputDir, 'MyObject__c', 'fields', 'Status__c.field-meta.xml'),
          'utf-8',
        );
        expect(statusFieldXml).to.include('<type>Picklist</type>');
        expect(statusFieldXml).to.include('<fullName>Open</fullName>');
        expect(statusFieldXml).to.include('<fullName>Closed</fullName>');

        const recordTypeXml = fs.readFileSync(
          path.join(outputDir, 'MyObject__c', 'recordTypes', 'Default.recordType-meta.xml'),
          'utf-8',
        );
        expect(recordTypeXml).to.include('<fullName>Default</fullName>');
        expect(recordTypeXml).to.include('<active>true</active>');
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });

    it('should warn and skip an object with no CustomObject row', async () => {
      const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-generate-out-'));
      const csvPath = path.join(outputDir, 'schema.csv');

      const csv = ['Type,ObjectName,ApiName,Label,FieldType', 'CustomField,Orphan__c,Notes__c,Notes,Text'].join('\n');
      fs.writeFileSync(csvPath, csv);

      try {
        const result = await SchemaGenerate.run(['--file', csvPath, '--output-dir', outputDir]);

        expect(result.objectCount).to.equal(0);
        expect(fs.existsSync(path.join(outputDir, 'Orphan__c'))).to.be.false;
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });

    it('should error when the CSV file cannot be parsed', async () => {
      const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-generate-out-'));
      const csvPath = path.join(outputDir, 'schema.csv');
      fs.writeFileSync(csvPath, 'Type,ObjectName\n"unterminated quote,MyObject__c');

      try {
        await SchemaGenerate.run(['--file', csvPath, '--output-dir', outputDir]);
        expect.fail('should have thrown Error');
      } catch (err) {
        const error = err as SfError;
        expect(error.message).to.include('Failed to parse CSV');
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });
  });

  describe('Excel flow', () => {
    it('should generate object and field metadata from an Excel workbook', async () => {
      const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-generate-out-'));
      const xlsxPath = path.join(outputDir, 'schema.xlsx');

      const workbook = new ExcelJS.Workbook();
      const objectSheet = workbook.addWorksheet('object');
      objectSheet.addRow(['apiName', 'MyExcelObject__c']);
      objectSheet.addRow(['label', 'My Excel Object']);
      objectSheet.addRow(['pluralLabel', 'My Excel Objects']);
      objectSheet.addRow(['App_Prefix', 'ABC']);

      const fieldsSheet = workbook.addWorksheet('fields');
      fieldsSheet.addRow(['label', 'type', 'apiName_optional', 'required']);
      fieldsSheet.addRow(['Notes', 'Text', '', 'true']);

      await workbook.xlsx.writeFile(xlsxPath);

      try {
        const result = await SchemaGenerate.run(['--file', xlsxPath, '--output-dir', outputDir]);

        expect(result.objectCount).to.equal(1);
        expect(result.fieldCount).to.equal(1);

        const objectXml = fs.readFileSync(
          path.join(outputDir, 'MyExcelObject__c', 'MyExcelObject__c.object-meta.xml'),
          'utf-8',
        );
        expect(objectXml).to.include('<label>My Excel Object</label>');

        const fieldXml = fs.readFileSync(
          path.join(outputDir, 'MyExcelObject__c', 'fields', 'ABC_Notes__c.field-meta.xml'),
          'utf-8',
        );
        expect(fieldXml).to.include('<fullName>ABC_Notes__c</fullName>');
        expect(fieldXml).to.include('<type>Text</type>');
        expect(fieldXml).to.include('<required>true</required>');
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });

    it('should error when the workbook has no object worksheet', async () => {
      const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-schema-generate-out-'));
      const xlsxPath = path.join(outputDir, 'schema.xlsx');

      const workbook = new ExcelJS.Workbook();
      workbook.addWorksheet('fields');
      await workbook.xlsx.writeFile(xlsxPath);

      try {
        await SchemaGenerate.run(['--file', xlsxPath, '--output-dir', outputDir]);
        expect.fail('should have thrown Error');
      } catch (err) {
        const error = err as SfError;
        expect(error.message).to.include("Missing or invalid 'object' worksheet");
      } finally {
        fs.rmSync(outputDir, { recursive: true, force: true });
      }
    });
  });
});
