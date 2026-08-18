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
import { Duration } from '@salesforce/kit';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';
import { chunk } from '@simplysf/simply-core';
import type { Connection } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-apex', 'simply.apex.logs.purge');

/** Outcome of deleting a single `ApexLog` record. */
export type ApexLogsPurgeResult = {
  Id: string;
  Success: boolean;
  Error?: string;
};

/**
 * Maximum number of `ApexLog` records to delete per SObject Collections call, which is the API's
 * own ceiling and matches jsforce's `MAX_DML_COUNT`.
 */
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
    'use-bulk-api': Flags.boolean({
      summary: messages.getMessage('flags.use-bulk-api.summary'),
      description: messages.getMessage('flags.use-bulk-api.description'),
      char: 'b',
      default: false,
    }),
    wait: Flags.duration({
      unit: 'minutes',
      summary: messages.getMessage('flags.wait.summary'),
      description: messages.getMessage('flags.wait.description'),
      // jsforce defaults bulk polling to 30 seconds, which no real purge finishes within.
      default: Duration.minutes(30),
    }),
  };

  /**
   * @returns The delete outcome for every `ApexLog` record matched by the (optional) `--where`
   * filter.
   */
  public async run(): Promise<ApexLogsPurgeResult[]> {
    const { flags } = await this.parse(ApexLogsPurge);

    const targetOrgConnection = requireConnection(flags);
    const useBulkApi = flags['use-bulk-api'];
    const pollTimeout = flags.wait.milliseconds;

    let query = 'SELECT Id FROM ApexLog';
    if (flags.where) {
      query += ` WHERE ${flags.where}`;
    }

    this.spinner.start(messages.getMessage('info.queryingLogs'));
    const logIds = useBulkApi
      ? await queryLogIdsViaBulkApi(targetOrgConnection, query, pollTimeout)
      : await queryLogIdsViaRest(targetOrgConnection, query);
    this.spinner.stop();

    if (logIds.length === 0) {
      this.info(messages.getMessage('info.noLogsToPurge'));
      return [];
    }

    this.spinner.start(messages.getMessage('info.purgingLogs', [logIds.length]));

    const results = useBulkApi
      ? await deleteViaBulkApi(targetOrgConnection, logIds, pollTimeout)
      : await this.deleteViaCollections(targetOrgConnection, logIds);

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

  /**
   * Deletes through the core connection's SObject Collections resource, 200 records per call.
   *
   * Deliberately not `.tooling`: `ApexLog` is exposed on both APIs, but only core REST implements
   * the Collections resource a bulk delete needs. `/tooling/composite/sobjects` does not exist and
   * answers 404 "The requested resource does not exist".
   */
  private async deleteViaCollections(connection: Connection, logIds: string[]): Promise<ApexLogsPurgeResult[]> {
    const results: ApexLogsPurgeResult[] = [];
    let purged = 0;

    for (const idChunk of chunk(logIds, CHUNK_SIZE)) {
      purged += idChunk.length;
      this.spinner.status = `${purged}/${logIds.length}`;

      // eslint-disable-next-line no-await-in-loop -- batches are sequential so the spinner tracks real progress
      const deleteResults = await connection.delete('ApexLog', idChunk);
      const deleteResultsArray = Array.isArray(deleteResults) ? deleteResults : [deleteResults];

      deleteResultsArray.forEach((deleteResult, index) => {
        results.push({
          Id: deleteResult.id ?? idChunk[index] ?? 'unknown',
          Success: deleteResult.success,
          Error: deleteResult.success ? undefined : deleteResult.errors.map((e) => e.message).join(', '),
        });
      });
    }

    return results;
  }
}

/** Collects matching log IDs through the Tooling API, which returns them in a single response. */
async function queryLogIdsViaRest(connection: Connection, query: string): Promise<string[]> {
  const queryResult = await connection.tooling.query<{ Id: string }>(query);
  return queryResult.records.map((record) => record.Id);
}

/**
 * Collects matching log IDs through a Bulk API v2 query job. The job streams CSV back, so the IDs
 * are gathered from the record stream rather than a single response body.
 */
async function queryLogIdsViaBulkApi(connection: Connection, query: string, pollTimeout: number): Promise<string[]> {
  const recordStream = await connection.bulk2.query(query, { pollTimeout });
  const logIds: string[] = [];

  for await (const record of recordStream) {
    const { Id: id } = record as { Id?: string };
    if (id) {
      logIds.push(id);
    }
  }

  return logIds;
}

/**
 * Deletes through a Bulk API v2 ingest job. The whole set goes up as one job rather than in
 * 200-record chunks, and the org processes it asynchronously without spending REST request limit.
 */
async function deleteViaBulkApi(
  connection: Connection,
  logIds: string[],
  pollTimeout: number,
): Promise<ApexLogsPurgeResult[]> {
  const { successfulResults, failedResults } = await connection.bulk2.loadAndWaitForResults({
    object: 'ApexLog',
    operation: 'delete',
    input: logIds.map((Id) => ({ Id })),
    pollTimeout,
  });

  return [
    ...successfulResults.map((result) => ({ Id: result.sf__Id, Success: true })),
    ...failedResults.map((result) => {
      // A failed row reports an empty (not absent) `sf__Id`; the submitted `Id` column is echoed
      // back alongside it, so prefer that to keep every failure traceable to a specific log.
      const submittedId = (result as { Id?: string }).Id;
      return {
        Id: result.sf__Id.length > 0 ? result.sf__Id : (submittedId ?? 'unknown'),
        Success: false,
        Error: result.sf__Error,
      };
    }),
  ];
}
