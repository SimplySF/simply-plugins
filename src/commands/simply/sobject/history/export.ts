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

import path from 'node:path';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { ensureDirectory, queryRecords, timestampForFileName, writeRecordsToCsvFile } from '@simplysf/simply-core';
import { getHistoryObjectName, getParentIdField } from '../../../../common/fieldHistory.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-sobject', 'simply.sobject.history.export');

/** Matches a `YYYY-MM-DD` date, as required by `--start-date`/`--end-date`. */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Output CSV column order/headers for the exported history records. */
const CSV_COLUMNS = [
  'HISTORY_ID',
  'PARENT_ID',
  'CREATED_DATE',
  'CREATED_BY_ID',
  'CREATED_BY_NAME',
  'FIELD_API_NAME',
  'OLD_VALUE',
  'NEW_VALUE',
];

/** Where the exported history was written, and how many records it contains. */
export type SObjectHistoryExportResult = {
  sobject: string;
  historyObject: string;
  recordCount: number;
  path: string;
};

/**
 * Map raw queried history records to the flat, uppercase column shape written to the CSV.
 *
 * @param records - The raw history records, as yielded by `queryRecords()`.
 * @param parentIdField - The history object's parent lookup field, to read into `PARENT_ID`.
 * @yields Records shaped to match {@link CSV_COLUMNS}.
 */
async function* mapHistoryRecords(
  records: AsyncGenerator<Record<string, string>>,
  parentIdField: string,
): AsyncGenerator<Record<string, string>> {
  for await (const record of records) {
    yield {
      HISTORY_ID: record.Id ?? '',
      PARENT_ID: record[parentIdField] ?? '',
      CREATED_DATE: record.CreatedDate ?? '',
      CREATED_BY_ID: record.CreatedById ?? '',
      CREATED_BY_NAME: record['CreatedBy.Name'] || 'Unknown',
      FIELD_API_NAME: record.Field ?? '',
      OLD_VALUE: record.OldValue ?? '',
      NEW_VALUE: record.NewValue ?? '',
    };
  }
}

/**
 * Queries the field history object for the given SObject (e.g. `AccountHistory`,
 * `Custom_Object__History`, or `OpportunityFieldHistory`) for changes created within the given
 * date range, and writes the results to a timestamped CSV file.
 */
export default class SObjectHistoryExport extends SfCommand<SObjectHistoryExportResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'api-version': Flags.orgApiVersion(),
    sobject: Flags.string({
      summary: messages.getMessage('flags.sobject.summary'),
      description: messages.getMessage('flags.sobject.description'),
      char: 's',
      required: true,
    }),
    'start-date': Flags.string({
      summary: messages.getMessage('flags.start-date.summary'),
      description: messages.getMessage('flags.start-date.description'),
      required: true,
      // eslint-disable-next-line @typescript-eslint/require-await
      parse: async (input: string): Promise<string> => {
        if (!DATE_PATTERN.test(input)) {
          throw messages.createError('error.invalidDate', ['start-date', input]);
        }
        return input;
      },
    }),
    'end-date': Flags.string({
      summary: messages.getMessage('flags.end-date.summary'),
      description: messages.getMessage('flags.end-date.description'),
      required: true,
      // eslint-disable-next-line @typescript-eslint/require-await
      parse: async (input: string): Promise<string> => {
        if (!DATE_PATTERN.test(input)) {
          throw messages.createError('error.invalidDate', ['end-date', input]);
        }
        return input;
      },
    }),
    'output-dir': Flags.directory({
      summary: messages.getMessage('flags.output-dir.summary'),
      description: messages.getMessage('flags.output-dir.description'),
      char: 'd',
    }),
    'target-org': Flags.requiredOrg(),
  };

  /** @returns The output CSV path and the number of history records written. */
  public async run(): Promise<SObjectHistoryExportResult> {
    const { flags } = await this.parse(SObjectHistoryExport);

    const targetOrgConnection = flags['target-org']?.getConnection(flags['api-version']);

    if (!targetOrgConnection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    const sobject = flags.sobject;
    const historyObject = getHistoryObjectName(sobject);
    const parentIdField = getParentIdField(sobject);

    const startDateTime = `${flags['start-date']}T00:00:00Z`;
    const endDateTime = `${flags['end-date']}T23:59:59Z`;

    const soql =
      `SELECT Id, ${parentIdField}, CreatedDate, CreatedById, CreatedBy.Name, Field, OldValue, NewValue ` +
      `FROM ${historyObject} WHERE CreatedDate >= ${startDateTime} AND CreatedDate <= ${endDateTime} ORDER BY CreatedDate DESC`;

    const outputDir = ensureDirectory(flags['output-dir'] ?? '.');
    const outputPath = path.join(outputDir, `${historyObject}_${timestampForFileName()}.csv`);

    this.spinner.start(messages.getMessage('info.exportingHistory', [historyObject]));

    const { recordCount } = await writeRecordsToCsvFile(
      mapHistoryRecords(queryRecords(targetOrgConnection, soql), parentIdField),
      outputPath,
      CSV_COLUMNS,
    );

    this.spinner.stop();

    this.info(messages.getMessage('info.complete', [recordCount, outputPath]));

    return { sobject, historyObject, recordCount, path: outputPath };
  }
}
