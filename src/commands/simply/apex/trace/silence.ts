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
import { loadJsonConfigSync } from '@simplysf/simply-core';
import { ClassesToSilenceSchema } from '../../../../schemas/silence/classesToSilence.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-apex', 'simply.apex.trace.silence');

/** DeveloperName used for the fully-suppressed (NONE) debug level created for class silencing. */
const DEBUG_LEVEL_NAME = 'Silence';
/** How long a configured trace flag stays active before expiring, in milliseconds (24 hours). */
const TRACE_DURATION_MS = 24 * 60 * 60 * 1000;

/** The trace flag created to silence debug logs for a single Apex class. */
export type ApexTraceSilenceResult = {
  class: string;
  classId: string;
  traceFlagId: string;
};

/**
 * Resolve the list of Apex class names to silence from either the `--classes` flag (a
 * comma-separated list) or the `--classes-file` flag (a JSON config file matching
 * {@link ClassesToSilenceSchema}). Returns an empty array if neither flag was provided.
 *
 * @param classesFlag - The raw `--classes` flag value, if provided.
 * @param classesFileFlag - The raw `--classes-file` flag value, if provided.
 * @returns The resolved, trimmed list of Apex class names.
 * @throws {SfError} If `--classes-file` was provided but fails schema validation.
 */
function resolveClasses(classesFlag: string | undefined, classesFileFlag: string | undefined): string[] {
  if (classesFlag) {
    return classesFlag
      .split(',')
      .map((className) => className.trim())
      .filter(Boolean);
  }

  if (classesFileFlag) {
    const parsed = loadJsonConfigSync(classesFileFlag, ClassesToSilenceSchema);

    if (!parsed.success) {
      throw messages.createError('error.invalidClassesFile', [parsed.message]);
    }

    return parsed.data.classes;
  }

  return [];
}

/**
 * Creates a 24-hour CLASS_TRACING trace flag with a fully suppressed (NONE) debug level for each
 * specified Apex class, preventing those classes from generating debug log output.
 */
export default class ApexTraceSilence extends SfCommand<ApexTraceSilenceResult[]> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    classes: Flags.string({
      summary: messages.getMessage('flags.classes.summary'),
      description: messages.getMessage('flags.classes.description'),
      char: 'c',
      exclusive: ['classes-file'],
    }),
    'classes-file': Flags.file({
      summary: messages.getMessage('flags.classes-file.summary'),
      description: messages.getMessage('flags.classes-file.description'),
      exists: true,
      exclusive: ['classes'],
    }),
  };

  /**
   * @returns The trace flag created for each Apex class that was found and successfully
   * silenced. Classes that couldn't be found or whose trace flag creation failed are warned
   * about and omitted.
   */
  public async run(): Promise<ApexTraceSilenceResult[]> {
    const { flags } = await this.parse(ApexTraceSilence);

    const targetOrgConnection = requireConnection(flags);

    const classes = resolveClasses(flags.classes, flags['classes-file']);

    if (classes.length === 0) {
      throw messages.createError('error.noClassesSpecified');
    }

    this.spinner.start(messages.getMessage('info.checkingDebugLevel'));
    const debugLevelResult = await targetOrgConnection.tooling.query<{ Id: string }>(
      `SELECT Id FROM DebugLevel WHERE DeveloperName = '${DEBUG_LEVEL_NAME}'`,
    );

    let debugLevelId: string;

    if (debugLevelResult.records.length > 0) {
      debugLevelId = debugLevelResult.records[0].Id;
    } else {
      const createResult = await targetOrgConnection.tooling.sobject('DebugLevel').create({
        DeveloperName: DEBUG_LEVEL_NAME,
        MasterLabel: DEBUG_LEVEL_NAME,
        ApexCode: 'NONE',
        ApexProfiling: 'NONE',
        Callout: 'NONE',
        Database: 'NONE',
        System: 'NONE',
        Validation: 'NONE',
        Visualforce: 'NONE',
        Workflow: 'NONE',
      });

      if (!createResult.success) {
        throw messages.createError('error.debugLevelCreateFailed', [
          createResult.errors.map((e) => e.message).join(', '),
        ]);
      }

      debugLevelId = createResult.id;
    }
    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.findingClasses'));
    const classesClause = classes.map((className) => `'${className}'`).join(',');
    const classResult = await targetOrgConnection.tooling.query<{ Id: string; Name: string }>(
      `SELECT Id, Name FROM ApexClass WHERE Name IN (${classesClause})`,
    );
    this.spinner.stop();

    if (classResult.records.length === 0) {
      this.warn(messages.getMessage('warning.noClassesFound'));
      return [];
    }

    const foundNames = new Set(classResult.records.map((record) => record.Name));
    const missingNames = classes.filter((className) => !foundNames.has(className));

    if (missingNames.length > 0) {
      this.warn(messages.getMessage('warning.someClassesNotFound', [missingNames.join(', ')]));
    }

    const now = new Date();
    const expiration = new Date(now.getTime() + TRACE_DURATION_MS);
    const startDate = now.toISOString();
    const expirationDate = expiration.toISOString();

    const results: ApexTraceSilenceResult[] = [];

    this.spinner.start(messages.getMessage('info.creatingTraceFlags'));
    for (const classRecord of classResult.records) {
      // eslint-disable-next-line no-await-in-loop
      const createResult = await targetOrgConnection.tooling.sobject('TraceFlag').create({
        StartDate: startDate,
        ExpirationDate: expirationDate,
        DebugLevelId: debugLevelId,
        TracedEntityId: classRecord.Id,
        LogType: 'CLASS_TRACING',
      });

      if (!createResult.success) {
        this.warn(
          messages.getMessage('warning.traceFlagCreateFailed', [
            classRecord.Name,
            createResult.errors.map((e) => e.message).join(', '),
          ]),
        );
        continue;
      }

      results.push({
        class: classRecord.Name,
        classId: classRecord.Id,
        traceFlagId: createResult.id,
      });
    }
    this.spinner.stop();

    this.table({
      data: results,
      columns: [
        { key: 'class', name: 'CLASS' },
        { key: 'classId', name: 'CLASS ID' },
        { key: 'traceFlagId', name: 'TRACE FLAG ID' },
      ],
    });

    return results;
  }
}
