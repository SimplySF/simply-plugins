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

import fs from 'node:fs';
import path from 'node:path';
import { createObjectCsvWriter } from 'csv-writer';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { queryRecords } from '@simplysf/simply-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-sobject', 'simply.sobject.backup');

export type SObjectBackupResult = {
  sobject: string;
  recordCount: number;
  path: string;
};

export default class SObjectBackup extends SfCommand<SObjectBackupResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'api-version': Flags.orgApiVersion(),
    'output-dir': Flags.directory({
      summary: messages.getMessage('flags.output-dir.summary'),
      description: messages.getMessage('flags.output-dir.description'),
      char: 'd',
    }),
    sobject: Flags.string({
      summary: messages.getMessage('flags.sobject.summary'),
      description: messages.getMessage('flags.sobject.description'),
      char: 's',
      required: true,
    }),
    'target-org': Flags.requiredOrg(),
  };

  public async run(): Promise<SObjectBackupResult> {
    const { flags } = await this.parse(SObjectBackup);

    const targetOrgConnection = flags['target-org']?.getConnection(flags['api-version']);

    if (!targetOrgConnection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    const sobjectName = flags.sobject;

    this.spinner.start(messages.getMessage('info.describingSobject', [sobjectName]));
    const sobjectDescribe = await targetOrgConnection.describe(sobjectName);
    const queryableFields = sobjectDescribe.fields.map((field) => field.name);
    this.spinner.stop();

    const soql = `SELECT ${queryableFields.join(',')} FROM ${sobjectName}`;

    const outputDir = flags['output-dir'] ?? '.';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${sobjectName}_${buildTimestamp()}.csv`);
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: queryableFields.map((field) => ({ id: field, title: field })),
    });

    this.spinner.start(messages.getMessage('info.exportingData', [sobjectName]));

    let recordCount = 0;
    for await (const record of queryRecords(targetOrgConnection, soql)) {
      await csvWriter.writeRecords([record]); // eslint-disable-line no-await-in-loop
      recordCount++;
    }

    this.spinner.stop();

    this.info(messages.getMessage('info.complete', [recordCount, outputPath]));

    return { sobject: sobjectName, recordCount, path: outputPath };
  }
}

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}`;
}
