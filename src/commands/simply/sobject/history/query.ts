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
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { queryRecords, writeRecordsToCsvFile } from '@simplysf/simply-core';
import {
  buildWhereClause,
  getHistoryObjectName,
  getParentIdField,
  recordMatchesClientFilters,
} from '../../../../common/fieldHistory.js';
import { FilterConfigSchema, type FilterConfig } from '../../../../schemas/history/filterConfig.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-sobject', 'simply.sobject.history.query');

const CSV_COLUMNS = ['Id', 'ParentId', 'Field', 'OldValue', 'NewValue', 'CreatedById', 'CreatedDate'];

export type SObjectHistoryQueryResult = {
  object: string;
  historyObject: string;
  totalQueried: number;
  totalWritten: number;
  path: string;
};

function parseFilterConfig(filterInput: string): unknown {
  const raw =
    filterInput.endsWith('.json') && fs.existsSync(filterInput) ? fs.readFileSync(filterInput, 'utf-8') : filterInput;

  try {
    return JSON.parse(raw) as unknown;
  } catch (error) {
    throw messages.createError('error.invalidFiltersJson', [(error as Error).message]);
  }
}

async function* filterAndMapHistoryRecords(
  records: AsyncGenerator<Record<string, string>>,
  filterConfig: FilterConfig | undefined,
  parentFieldName: string,
  soqlFilterableFields: ReadonlySet<string>,
  onRecordQueried: () => void,
): AsyncGenerator<Record<string, string>> {
  for await (const record of records) {
    onRecordQueried();

    if (!recordMatchesClientFilters(record, filterConfig, parentFieldName, soqlFilterableFields)) {
      continue;
    }

    yield {
      Id: record.Id ?? '',
      ParentId: record[parentFieldName] ?? '',
      Field: record.Field ?? '',
      OldValue: record.OldValue ?? '',
      NewValue: record.NewValue ?? '',
      CreatedById: record.CreatedById ?? '',
      CreatedDate: record.CreatedDate ?? '',
    };
  }
}

export default class SObjectHistoryQuery extends SfCommand<SObjectHistoryQueryResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'api-version': Flags.orgApiVersion(),
    object: Flags.string({
      summary: messages.getMessage('flags.object.summary'),
      description: messages.getMessage('flags.object.description'),
      required: true,
    }),
    filters: Flags.string({
      summary: messages.getMessage('flags.filters.summary'),
      description: messages.getMessage('flags.filters.description'),
    }),
    'output-dir': Flags.directory({
      summary: messages.getMessage('flags.output-dir.summary'),
      description: messages.getMessage('flags.output-dir.description'),
      char: 'd',
    }),
    'target-org': Flags.requiredOrg(),
  };

  public async run(): Promise<SObjectHistoryQueryResult> {
    const { flags } = await this.parse(SObjectHistoryQuery);

    const targetOrgConnection = flags['target-org']?.getConnection(flags['api-version']);

    if (!targetOrgConnection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    const object = flags.object;
    const historyObject = getHistoryObjectName(object);
    const parentFieldName = getParentIdField(object);
    const soqlFilterableFields = new Set(['Field', 'CreatedById', 'CreatedDate', 'ParentId', parentFieldName]);

    let filterConfig: FilterConfig | undefined;
    if (flags.filters) {
      const rawFilterConfig = parseFilterConfig(flags.filters);
      const parsed = FilterConfigSchema.safeParse(rawFilterConfig);

      if (!parsed.success) {
        throw messages.createError('error.invalidFilters', [parsed.error.message]);
      }

      filterConfig = parsed.data;
    }

    let soql = `SELECT CreatedById, CreatedDate, Field, Id, NewValue, OldValue, ${parentFieldName} FROM ${historyObject}`;
    const whereClause = buildWhereClause(filterConfig, parentFieldName, soqlFilterableFields);
    if (whereClause) {
      soql += ` WHERE ${whereClause}`;
    }
    soql += ' ORDER BY CreatedDate DESC';

    this.info(messages.getMessage('info.generatedSoql', [soql]));

    const outputDir = flags['output-dir'] ?? '.';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `${historyObject}_${buildTimestamp()}.csv`);

    this.spinner.start(messages.getMessage('info.queryingHistory', [historyObject]));

    let totalQueried = 0;
    const { recordCount: totalWritten } = await writeRecordsToCsvFile(
      filterAndMapHistoryRecords(
        queryRecords(targetOrgConnection, soql),
        filterConfig,
        parentFieldName,
        soqlFilterableFields,
        () => {
          totalQueried++;
        },
      ),
      outputPath,
      CSV_COLUMNS,
    );

    this.spinner.stop();

    this.info(messages.getMessage('info.complete', [totalQueried, totalWritten, outputPath]));

    return { object, historyObject, totalQueried, totalWritten, path: outputPath };
  }
}

function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}`;
}
