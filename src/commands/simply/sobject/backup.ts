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

import path from 'node:path';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';
import { ensureDirectory, queryRecords, timestampForFileName, writeRecordsToCsvFile } from '@simplysf/simply-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-sobject', 'simply.sobject.backup');

/** Where the backup was written, and how many records it contains. */
export type SObjectBackupResult = {
  sobject: string;
  recordCount: number;
  path: string;
};

/**
 * Describes the given SObject, queries every field via the Bulk API, and writes the results to
 * a timestamped CSV file.
 */
export default class SObjectBackup extends SfCommand<SObjectBackupResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
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
  };

  /** @returns The output CSV path and the number of records written. */
  public async run(): Promise<SObjectBackupResult> {
    const { flags } = await this.parse(SObjectBackup);

    const targetOrgConnection = requireConnection(flags);

    const sobjectName = flags.sobject;

    this.spinner.start(messages.getMessage('info.describingSobject', [sobjectName]));
    const sobjectDescribe = await targetOrgConnection.describe(sobjectName);
    const queryableFields = sobjectDescribe.fields.map((field) => field.name);
    this.spinner.stop();

    const soql = `SELECT ${queryableFields.join(',')} FROM ${sobjectName}`;

    const outputDir = ensureDirectory(flags['output-dir'] ?? '.');
    const outputPath = path.join(outputDir, `${sobjectName}_${timestampForFileName()}.csv`);

    this.spinner.start(messages.getMessage('info.exportingData', [sobjectName]));

    const { recordCount } = await writeRecordsToCsvFile(
      queryRecords(targetOrgConnection, soql),
      outputPath,
      queryableFields,
    );

    this.spinner.stop();

    this.info(messages.getMessage('info.complete', [recordCount, outputPath]));

    return { sobject: sobjectName, recordCount, path: outputPath };
  }
}
