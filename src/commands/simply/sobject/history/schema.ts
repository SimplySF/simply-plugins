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
import { Messages, type Connection } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { writeRecordsToCsvFile } from '@simplysf/simply-core';
import {
  buildFieldHistorySchemaReportHtml,
  type FieldHistorySchemaEntry,
  type GroupedFieldHistorySchemaData,
} from '../../../../common/fieldHistorySchemaReportTemplate.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-sobject', 'simply.sobject.history.schema');

/** Output CSV column order/headers for the exported schema records. */
const CSV_COLUMNS = [
  'OBJECT_NAME',
  'OBJECT_API_NAME',
  'FIELD_NAME',
  'FIELD_API_NAME',
  'MANAGED_PACKAGE_NAMESPACE',
  'PACKAGE_NAME',
];

/** Number of objects to retrieve tracked fields for concurrently. */
const OBJECT_CONCURRENCY = 5;

/** Maximum number of field IDs per `WHERE SubjectId IN (...)` chunk for the `Package2Member` query. */
const ID_CHUNK_SIZE = 200;

/** A queried `EntityDefinition` record for an object with field history tracking enabled. */
type EntityDefinitionRecord = {
  DurableId: string;
  QualifiedApiName: string;
  Label: string;
};

/** A queried `FieldDefinition` record for a field with history tracking enabled. */
type FieldDefinitionRecord = {
  DurableId: string;
  Label: string;
  QualifiedApiName: string;
  NamespacePrefix?: string;
  Publisher?: { Name: string };
};

/** A `FieldHistorySchemaEntry` plus the raw `DurableId`, used internally to resolve unlocked-package names. */
type WorkingEntry = FieldHistorySchemaEntry & { durableId: string };

/** Where the CSV and HTML reports were written, and how many objects/fields they cover. */
export type SObjectHistorySchemaResult = {
  trackedObjectCount: number;
  trackedFieldCount: number;
  csvPath: string;
  htmlPath: string;
};

/**
 * Query every object with field history tracking enabled, and every tracked field on each,
 * resolving the managed/unlocked package each field belongs to.
 *
 * @param connection - The org connection to query against.
 * @param entities - The field-history-tracked objects to retrieve tracked fields for.
 * @param onObjectComplete - Called once per object after its fields have been retrieved, used by
 * the caller to report progress.
 * @returns The tracked field entries (without package names for unlocked-package fields resolved
 * yet) and the set of field IDs whose package still needs to be resolved via `Package2Member`.
 */
async function retrieveTrackedFields(
  connection: Connection,
  entities: EntityDefinitionRecord[],
  onObjectComplete: () => void,
): Promise<{ entries: WorkingEntry[]; missingPackageIds: Set<string> }> {
  const entries: WorkingEntry[] = [];
  const missingPackageIds = new Set<string>();

  for (let i = 0; i < entities.length; i += OBJECT_CONCURRENCY) {
    const chunk = entities.slice(i, i + OBJECT_CONCURRENCY);

    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      chunk.map(async (entity) => {
        const fieldResult = await connection.autoFetchQuery(
          `SELECT DurableId, Label, QualifiedApiName, NamespacePrefix, Publisher.Name FROM FieldDefinition ` +
            `WHERE EntityDefinitionId = '${entity.DurableId}' AND IsFieldHistoryTracked = true`,
          { tooling: true },
        );

        for (const field of fieldResult.records as unknown as FieldDefinitionRecord[]) {
          const rawPackageName = field.Publisher?.Name ?? 'N/A';
          const packageName = rawPackageName === '<local>' ? 'Local (Unpackaged)' : rawPackageName;

          entries.push({
            objectName: entity.Label,
            objectApiName: entity.QualifiedApiName,
            fieldName: field.Label,
            fieldApiName: field.QualifiedApiName,
            managedPackageNamespace: field.NamespacePrefix ?? 'N/A',
            packageName,
            durableId: field.DurableId,
          });

          // Unlocked (2GP) package fields aren't attributed via Publisher.Name, so their
          // durable ID is queued to be resolved separately via Package2Member.
          if (packageName === 'N/A' || (packageName === 'Local (Unpackaged)' && field.QualifiedApiName.endsWith('__c'))) {
            const fieldId = field.DurableId.split('.')[1];
            if (fieldId) {
              missingPackageIds.add(fieldId);
            }
          }
        }

        onObjectComplete();
      }),
    );
  }

  return { entries, missingPackageIds };
}

/**
 * Resolve unlocked (2GP) package names for the given field IDs via `Package2Member`, and apply
 * them back onto any matching entry still carrying an unresolved package name.
 *
 * @param connection - The org connection to query against.
 * @param entries - The entries to update in place.
 * @param missingPackageIds - The field IDs (15-char) to resolve package names for.
 * @returns The number of package names resolved.
 */
async function resolveUnlockedPackageNames(
  connection: Connection,
  entries: WorkingEntry[],
  missingPackageIds: Set<string>,
): Promise<number> {
  const packageMap = new Map<string, string>();
  const idArray = [...missingPackageIds];

  for (let i = 0; i < idArray.length; i += ID_CHUNK_SIZE) {
    const idChunk = idArray.slice(i, i + ID_CHUNK_SIZE);
    const idsClause = idChunk.map((id) => `'${id}'`).join(',');

    // eslint-disable-next-line no-await-in-loop
    const packageResult = await connection.autoFetchQuery(
      `SELECT SubjectId, SubscriberPackage.Name FROM Package2Member WHERE SubjectId IN (${idsClause})`,
      { tooling: true },
    );

    for (const record of packageResult.records as unknown as Array<{
      SubjectId: string;
      SubscriberPackage: { Name: string };
    }>) {
      packageMap.set(record.SubjectId.substring(0, 15), record.SubscriberPackage.Name);
    }
  }

  entries.forEach((entry) => {
    if (entry.packageName !== 'N/A' && entry.packageName !== 'Local (Unpackaged)') {
      return;
    }

    const fieldId = entry.durableId.split('.')[1]?.substring(0, 15);
    const resolvedName = fieldId ? packageMap.get(fieldId) : undefined;

    if (resolvedName) {
      entry.packageName = resolvedName;
    }
  });

  return packageMap.size;
}

/**
 * Identifies every object with field history tracking enabled, and every tracked field on each,
 * resolving the managed/unlocked package each field belongs to, and writes the results to a
 * timestamped CSV file and a browsable HTML report.
 */
export default class SObjectHistorySchema extends SfCommand<SObjectHistorySchemaResult> {
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
    'target-org': Flags.requiredOrg(),
  };

  /** @returns The output CSV/HTML paths and the number of tracked objects/fields found. */
  public async run(): Promise<SObjectHistorySchemaResult> {
    const { flags } = await this.parse(SObjectHistorySchema);

    const connection = flags['target-org']?.getConnection(flags['api-version']);

    if (!connection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    const username = connection.getUsername() ?? '';

    this.spinner.start(messages.getMessage('info.identifyingObjects'));
    const objectResult = await connection.autoFetchQuery(
      'SELECT DurableId, QualifiedApiName, Label FROM EntityDefinition WHERE IsFieldHistoryTracked = true',
      { tooling: true },
    );
    const trackedObjects = objectResult.records as unknown as EntityDefinitionRecord[];
    this.spinner.stop();

    this.info(messages.getMessage('info.objectsFound', [trackedObjects.length]));

    let objectsProcessed = 0;
    this.spinner.start(messages.getMessage('info.retrievingFields', [objectsProcessed, trackedObjects.length]));

    const { entries, missingPackageIds } = await retrieveTrackedFields(connection, trackedObjects, () => {
      objectsProcessed++;
      this.spinner.status = `${objectsProcessed}/${trackedObjects.length}`;
    });
    this.spinner.stop();

    if (missingPackageIds.size > 0) {
      this.spinner.start(messages.getMessage('info.resolvingPackages', [missingPackageIds.size]));
      const resolvedCount = await resolveUnlockedPackageNames(connection, entries, missingPackageIds);
      this.spinner.stop();
      this.info(messages.getMessage('info.packagesResolved', [resolvedCount]));
    }

    const outputDir = flags['output-dir'] ?? '.';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = buildTimestamp();
    const csvPath = path.join(outputDir, `field_history_schema_${timestamp}.csv`);
    const htmlPath = path.join(outputDir, `field_history_schema_${timestamp}.html`);

    this.spinner.start(messages.getMessage('info.writingCsv'));
    const { recordCount } = await writeRecordsToCsvFile(toAsyncIterable(entries), csvPath, CSV_COLUMNS);
    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.generatingHtml'));
    const groupedData: GroupedFieldHistorySchemaData = new Map();
    entries.forEach((entry) => {
      if (!groupedData.has(entry.packageName)) {
        groupedData.set(entry.packageName, []);
      }
      groupedData.get(entry.packageName)?.push(entry);
    });

    const html = buildFieldHistorySchemaReportHtml({
      username,
      reportDate: new Date().toLocaleString(),
      groupedData,
    });

    await fs.promises.writeFile(htmlPath, html);
    this.spinner.stop();

    this.info(messages.getMessage('info.complete', [trackedObjects.length, recordCount, csvPath, htmlPath]));

    return {
      trackedObjectCount: trackedObjects.length,
      trackedFieldCount: recordCount,
      csvPath,
      htmlPath,
    };
  }
}

/** @returns An async iterable that yields every element of `items` in order, for streaming into a CSV writer. */
async function* toAsyncIterable<T>(items: T[]): AsyncGenerator<T> {
  yield* items;
}

/** @returns The current local time as a `YYYYMMDD_HHMMSS` string, for uniquing output filenames. */
function buildTimestamp(): string {
  const now = new Date();
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}`;
}
