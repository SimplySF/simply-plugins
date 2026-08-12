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

/* eslint-disable no-await-in-loop */
import fs from 'node:fs';
import path from 'node:path';
import { Connection, Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { createCsvFileWriter, queryRecords } from '@simplysf/simply-core';
import { DeduplicateConfig, DeduplicateConfigSchema } from '../../../schemas/deduplicate/deduplicateConfig.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-sobject', 'simply.sobject.deduplicate');

export type SObjectDeduplicateResult = {
  primaryObjectApiName: string;
  totalRecords: number;
  duplicateCount: number;
  uniqueCount: number;
  deleteFile: string;
  uniqueFile: string;
  modifiedFiles: string[];
};

async function deduplicateAssociatedObject(options: {
  connection: Connection;
  objectName: string;
  lookupFields: string[];
  uniquePrimaryObjectMap: Map<string, string>;
  primaryObjectCompositeKeyFields: string[];
  outputDir: string;
}): Promise<string> {
  const { connection, objectName, lookupFields, uniquePrimaryObjectMap, primaryObjectCompositeKeyFields, outputDir } =
    options;

  const fieldsToQuery = [...lookupFields];
  lookupFields.forEach((lookupField) => {
    primaryObjectCompositeKeyFields.forEach((compositeKeyField) => {
      fieldsToQuery.push(`${lookupField.replace('__c', '__r')}.${compositeKeyField}`);
    });
  });

  const recordStream = queryRecords(connection, `SELECT Id,${fieldsToQuery.join(',')} FROM ${objectName}`);

  const modifiedFile = path.join(outputDir, `${objectName}_Modified.csv`);
  const writer = createCsvFileWriter(modifiedFile, ['Id', ...lookupFields]);

  for await (const record of recordStream) {
    const associatedRecord = record as Record<string, unknown>;
    const modifiedRecord: Record<string, unknown> = {};

    for (const lookupField of lookupFields) {
      if (!associatedRecord[lookupField]) {
        continue;
      }

      let compositeKey = '';
      for (const compositeKeyField of primaryObjectCompositeKeyFields) {
        const objectKey = `${lookupField.replace('__c', '__r')}.${compositeKeyField}`;
        compositeKey += `${String(associatedRecord[objectKey] ?? '')}_`;
      }
      compositeKey = compositeKey.slice(0, -1);

      const uniqueRecordId = uniquePrimaryObjectMap.get(compositeKey);

      if (uniqueRecordId === associatedRecord[lookupField]) {
        continue;
      }

      modifiedRecord.Id = associatedRecord.Id;
      modifiedRecord[lookupField] = uniqueRecordId;
    }

    if (modifiedRecord.Id) {
      await writer.write(modifiedRecord);
    }
  }

  await writer.end();

  return modifiedFile;
}

export default class SObjectDeduplicate extends SfCommand<SObjectDeduplicateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'api-version': Flags.orgApiVersion(),
    config: Flags.file({
      summary: messages.getMessage('flags.config.summary'),
      description: messages.getMessage('flags.config.description'),
      char: 'c',
      exists: true,
      required: true,
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      description: messages.getMessage('flags.dry-run.description'),
      default: false,
    }),
    'output-dir': Flags.directory({
      summary: messages.getMessage('flags.output-dir.summary'),
      description: messages.getMessage('flags.output-dir.description'),
    }),
    'target-org': Flags.requiredOrg(),
  };

  public async run(): Promise<SObjectDeduplicateResult> {
    const { flags } = await this.parse(SObjectDeduplicate);

    const targetOrgConnection = flags['target-org']?.getConnection(flags['api-version']);

    if (!targetOrgConnection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    this.spinner.start(messages.getMessage('info.readingConfig'));
    const configContent = fs.readFileSync(flags.config, 'utf-8');
    const parsed = DeduplicateConfigSchema.safeParse(JSON.parse(configContent) as unknown);

    if (!parsed.success) {
      throw messages.createError('error.invalidConfig', [parsed.error.message]);
    }

    const config: DeduplicateConfig = parsed.data;
    this.spinner.stop();

    const {
      primaryObjectApiName,
      primaryObjectFilter,
      primaryObjectCompositeKeyField,
      primaryObjectFields,
      primaryObjectCompositeKeyFields,
      associatedObjects,
    } = config;

    const outputDir = flags['output-dir'] ?? path.join('temp', primaryObjectApiName);
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    const deleteFile = path.join(outputDir, `${primaryObjectApiName}_Delete.csv`);
    const uniqueFile = path.join(outputDir, `${primaryObjectApiName}_Unique.csv`);

    const columns = ['Id', primaryObjectCompositeKeyField];
    const deleteWriter = createCsvFileWriter(deleteFile, columns);
    const uniqueWriter = createCsvFileWriter(uniqueFile, columns);

    this.spinner.start(messages.getMessage('info.queryingPrimary', [primaryObjectApiName]));

    const whereClause = primaryObjectFilter ? `WHERE ${primaryObjectFilter}` : '';
    const soql = `SELECT ${[...primaryObjectFields, ...primaryObjectCompositeKeyFields].join(
      ',',
    )} FROM ${primaryObjectApiName} ${whereClause} ORDER BY CreatedDate ASC`;

    const primaryRecordStream = queryRecords(targetOrgConnection, soql);

    let totalRecords = 0;
    let duplicateCount = 0;
    const uniquePrimaryObjectMap = new Map<string, string>();

    for await (const record of primaryRecordStream) {
      totalRecords++;
      const primaryRecord = record as Record<string, unknown>;

      let compositeKey = '';
      const nullCompositeKeyFields: string[] = [];

      for (const field of primaryObjectCompositeKeyFields) {
        const value = primaryRecord[field];
        compositeKey += `${String(value ?? '')}_`;
        if (!value) {
          nullCompositeKeyFields.push(field);
        }
      }
      compositeKey = compositeKey.slice(0, -1);

      const recordId = primaryRecord.Id as string;

      if (nullCompositeKeyFields.length > 0) {
        this.warn(
          messages.getMessage('warning.blankCompositeKey', [recordId, compositeKey, nullCompositeKeyFields.join(',')]),
        );
      }

      if (uniquePrimaryObjectMap.has(compositeKey)) {
        duplicateCount++;
        await deleteWriter.write({ Id: recordId, [primaryObjectCompositeKeyField]: compositeKey });
        continue;
      }

      await uniqueWriter.write({ Id: recordId, [primaryObjectCompositeKeyField]: compositeKey });
      uniquePrimaryObjectMap.set(compositeKey, recordId);
    }

    await Promise.all([deleteWriter.end(), uniqueWriter.end()]);

    this.spinner.stop();
    this.info(messages.getMessage('info.duplicatesFound', [duplicateCount]));

    const modifiedFiles: string[] = [];

    if (duplicateCount > 0 && !flags['dry-run']) {
      this.spinner.start(messages.getMessage('info.calculatingReplacements'));

      const associatedObjectEntries = Object.entries(associatedObjects);
      const results = await Promise.allSettled(
        associatedObjectEntries.map(([objectName, lookupFields]) =>
          deduplicateAssociatedObject({
            connection: targetOrgConnection,
            objectName,
            lookupFields,
            uniquePrimaryObjectMap,
            primaryObjectCompositeKeyFields,
            outputDir,
          }),
        ),
      );

      results.forEach((result, index) => {
        const [objectName] = associatedObjectEntries[index];
        if (result.status === 'fulfilled') {
          modifiedFiles.push(result.value);
        } else {
          this.warn(messages.getMessage('warning.associatedObjectFailed', [objectName, String(result.reason)]));
        }
      });

      this.spinner.stop();
    }

    const result: SObjectDeduplicateResult = {
      primaryObjectApiName,
      totalRecords,
      duplicateCount,
      uniqueCount: uniquePrimaryObjectMap.size,
      deleteFile,
      uniqueFile,
      modifiedFiles,
    };

    this.table({
      data: [
        { Metric: 'Total Records', Value: String(result.totalRecords) },
        { Metric: 'Duplicates Found', Value: String(result.duplicateCount) },
        { Metric: 'Unique Records', Value: String(result.uniqueCount) },
      ],
      columns: [
        { key: 'Metric', name: 'METRIC' },
        { key: 'Value', name: 'VALUE' },
      ],
    });

    return result;
  }
}
