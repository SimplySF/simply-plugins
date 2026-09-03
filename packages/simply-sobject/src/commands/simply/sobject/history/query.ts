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
import path from 'node:path';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';
import {
  ensureDirectory,
  parseJsonConfig,
  queryRecords,
  timestampForFileName,
  writeRecordsToCsvFile,
  type JsonConfigResult,
} from '@simplysf/simply-core';
import {
  buildWhereClause,
  FilterConfigSchema,
  getHistoryObjectName,
  getParentIdField,
  recordMatchesClientFilters,
  type FilterConfig,
} from '@simplysf/simply-sobject-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-sobject', 'simply.sobject.history.query');

/** Output CSV column order/headers for the queried history records. */
const CSV_COLUMNS = ['Id', 'ParentId', 'Field', 'OldValue', 'NewValue', 'CreatedById', 'CreatedDate'];

/** Where the query results were written, and how many records were queried/written. */
export type SObjectHistoryQueryResult = {
  object: string;
  historyObject: string;
  totalQueried: number;
  totalWritten: number;
  path: string;
};

/**
 * Resolve the `--filters` flag value — either an inline JSON string or a path to a `.json` file —
 * into a validated filter config.
 *
 * @param filterInput - The raw `--filters` flag value.
 * @returns The validated filter config.
 * @throws {SfError} If the input isn't valid JSON, or doesn't satisfy {@link FilterConfigSchema}.
 */
function resolveFilterConfig(filterInput: string): FilterConfig {
  const raw =
    filterInput.endsWith('.json') && fs.existsSync(filterInput) ? fs.readFileSync(filterInput, 'utf-8') : filterInput;

  let result: JsonConfigResult<FilterConfig>;
  try {
    result = parseJsonConfig(raw, FilterConfigSchema);
  } catch (error) {
    throw messages.createError('error.invalidFiltersJson', [(error as Error).message]);
  }

  if (!result.success) {
    throw messages.createError('error.invalidFilters', [result.message]);
  }

  return result.data;
}

/**
 * Apply the client-side portion of the filter tree to each queried record (the SOQL-filterable
 * portion was already enforced by the query itself), and map surviving records to the flat
 * column shape written to the CSV.
 *
 * @param records - The raw history records, as yielded by `queryRecords()`.
 * @param filterConfig - The filter tree to apply, if any.
 * @param parentFieldName - The history object's parent lookup field, to read into `ParentId`.
 * @param soqlFilterableFields - Fields already enforced by the SOQL WHERE clause; passed through
 * to skip re-checking them client-side.
 * @param onRecordQueried - Called once per record read from `records`, before filtering — used
 * by the caller to track the total queried count independent of how many survive filtering.
 * @yields Records shaped to match {@link CSV_COLUMNS} that satisfy `filterConfig`.
 */
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

/**
 * Queries the field history object for the given SObject (e.g. `AccountHistory`,
 * `Custom_Object__History`, or `OpportunityFieldHistory`) and writes the results to a
 * timestamped CSV file. An optional filter tree can be supplied to narrow the results:
 * conditions on Field, CreatedById, CreatedDate, or the parent lookup field are pushed into the
 * SOQL WHERE clause; conditions on any other field (e.g. OldValue or NewValue) are applied
 * client-side after the query runs.
 */
export default class SObjectHistoryQuery extends SfCommand<SObjectHistoryQueryResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
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
  };

  /** @returns The output CSV path and the total/written record counts. */
  public async run(): Promise<SObjectHistoryQueryResult> {
    const { flags } = await this.parse(SObjectHistoryQuery);

    const targetOrgConnection = requireConnection(flags);

    const object = flags.object;
    const historyObject = getHistoryObjectName(object);
    const parentFieldName = getParentIdField(object);
    const soqlFilterableFields = new Set(['Field', 'CreatedById', 'CreatedDate', 'ParentId', parentFieldName]);

    const filterConfig: FilterConfig | undefined = flags.filters ? resolveFilterConfig(flags.filters) : undefined;

    let soql = `SELECT CreatedById, CreatedDate, Field, Id, NewValue, OldValue, ${parentFieldName} FROM ${historyObject}`;
    const whereClause = buildWhereClause(filterConfig, parentFieldName, soqlFilterableFields);
    if (whereClause) {
      soql += ` WHERE ${whereClause}`;
    }
    soql += ' ORDER BY CreatedDate DESC';

    this.info(messages.getMessage('info.generatedSoql', [soql]));

    const outputDir = ensureDirectory(flags['output-dir'] ?? '.');
    const outputPath = path.join(outputDir, `${historyObject}_${timestampForFileName()}.csv`);

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
