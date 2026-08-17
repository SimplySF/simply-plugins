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

import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';
import { chunk } from '@simplysf/simply-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-apex', 'simply.apex.logs.purge');

/** Outcome of deleting a single `ApexLog` record. */
export type ApexLogsPurgeResult = {
  Id: string;
  Success: boolean;
  Error?: string;
};

/** Maximum number of `ApexLog` records to delete per Tooling API `delete` call. */
const CHUNK_SIZE = 200;

/**
 * Deletes `ApexLog` records from the target org. By default all logs are purged; use `--where`
 * to scope the deletion to a subset of logs.
 */
export default class ApexLogsPurge extends SfCommand<ApexLogsPurgeResult[]> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    where: Flags.string({
      summary: messages.getMessage('flags.where.summary'),
      description: messages.getMessage('flags.where.description'),
      char: 'w',
    }),
  };

  /**
   * @returns The delete outcome for every `ApexLog` record matched by the (optional) `--where`
   * filter.
   */
  public async run(): Promise<ApexLogsPurgeResult[]> {
    const { flags } = await this.parse(ApexLogsPurge);

    const targetOrgConnection = requireConnection(flags);

    let query = 'SELECT Id FROM ApexLog';
    if (flags.where) {
      query += ` WHERE ${flags.where}`;
    }

    this.spinner.start(messages.getMessage('info.queryingLogs'));
    const queryResult = await targetOrgConnection.tooling.query<{ Id: string }>(query);
    this.spinner.stop();

    if (queryResult.records.length === 0) {
      this.info(messages.getMessage('info.noLogsToPurge'));
      return [];
    }

    const logIds = queryResult.records.map((record) => record.Id);
    const results: ApexLogsPurgeResult[] = [];

    this.spinner.start(messages.getMessage('info.purgingLogs', [logIds.length]));

    let purged = 0;
    for (const idChunk of chunk(logIds, CHUNK_SIZE)) {
      purged += idChunk.length;
      this.spinner.status = `${purged}/${logIds.length}`;

      // eslint-disable-next-line no-await-in-loop
      const deleteResults = await targetOrgConnection.tooling.delete('ApexLog', idChunk);
      const deleteResultsArray = Array.isArray(deleteResults) ? deleteResults : [deleteResults];

      deleteResultsArray.forEach((deleteResult) => {
        results.push({
          Id: deleteResult.id ?? 'unknown',
          Success: deleteResult.success,
          Error: deleteResult.success ? undefined : deleteResult.errors.map((e) => e.message).join(', '),
        });
      });
    }

    this.spinner.stop();

    const successCount = results.filter((result) => result.Success).length;
    const failureCount = results.length - successCount;

    if (failureCount > 0) {
      this.warn(messages.getMessage('warning.someFailed', [successCount, failureCount]));
    } else {
      this.info(messages.getMessage('info.allPurged', [successCount]));
    }

    this.table({
      data: results,
      columns: [
        { key: 'Id', name: 'ID' },
        { key: 'Success', name: 'SUCCESS' },
        { key: 'Error', name: 'ERROR' },
      ],
    });

    return results;
  }
}
