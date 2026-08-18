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

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-apex', 'simply.apex.trace.setup');

/** DeveloperName used for the FINEST/FINER debug level created for the Apex Replay Debugger. */
const DEBUG_LEVEL_NAME = 'ReplayDebuggerLevels';
/** How long a configured trace flag stays active before expiring, in milliseconds (24 hours). */
const TRACE_DURATION_MS = 24 * 60 * 60 * 1000;
/** Matches the ISO 8601 date-time format required by the `--start-date`/`--end-date` flags. */
const DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** IDs of the debug level and trace flag configured for the running user, and when it expires. */
export type ApexTraceSetupResult = {
  userId: string;
  debugLevelId: string;
  traceFlagId: string;
  expirationDate: string;
};

/**
 * Creates or updates a DEVELOPER_LOG trace flag for the specified user (or the user running the
 * command if `--user-id` isn't provided). By default the trace flag uses the FINEST/FINER
 * `ReplayDebuggerLevels` debug level suitable for the Apex Replay Debugger and runs for 24 hours
 * starting now; `--log-level`, `--start-date`, and `--end-date` override those defaults.
 */
export default class ApexTraceSetup extends SfCommand<ApexTraceSetupResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    'user-id': Flags.salesforceId({
      summary: messages.getMessage('flags.user-id.summary'),
      description: messages.getMessage('flags.user-id.description'),
      char: 'u',
      startsWith: '005',
    }),
    'log-level': Flags.string({
      summary: messages.getMessage('flags.log-level.summary'),
      description: messages.getMessage('flags.log-level.description'),
    }),
    'start-date': Flags.string({
      summary: messages.getMessage('flags.start-date.summary'),
      description: messages.getMessage('flags.start-date.description'),
      // eslint-disable-next-line @typescript-eslint/require-await
      parse: async (input: string): Promise<string> => {
        if (!DATE_TIME_PATTERN.test(input)) {
          throw messages.createError('error.invalidDateTime', ['start-date', input]);
        }
        return input;
      },
    }),
    'end-date': Flags.string({
      summary: messages.getMessage('flags.end-date.summary'),
      description: messages.getMessage('flags.end-date.description'),
      // eslint-disable-next-line @typescript-eslint/require-await
      parse: async (input: string): Promise<string> => {
        if (!DATE_TIME_PATTERN.test(input)) {
          throw messages.createError('error.invalidDateTime', ['end-date', input]);
        }
        return input;
      },
    }),
  };

  /**
   * @returns The IDs of the debug level and trace flag that were created or updated, and the
   * trace flag's new expiration date.
   */
  public async run(): Promise<ApexTraceSetupResult> {
    const { flags } = await this.parse(ApexTraceSetup);

    const targetOrgConnection = requireConnection(flags);

    this.spinner.start(messages.getMessage('info.findingUser'));
    const requestedUserId = flags['user-id'];
    const username = targetOrgConnection.getUsername() ?? '';
    const userQueryResult = requestedUserId
      ? await targetOrgConnection.query<{ Id: string }>(`SELECT Id FROM User WHERE Id = '${requestedUserId}'`)
      : await targetOrgConnection.query<{ Id: string }>(`SELECT Id FROM User WHERE Username = '${username}'`);

    if (userQueryResult.records.length === 0) {
      throw messages.createError(requestedUserId ? 'error.userIdNotFound' : 'error.userNotFound', [
        requestedUserId ?? username,
      ]);
    }

    const userId = userQueryResult.records[0].Id;
    this.spinner.stop();

    const requestedLogLevel = flags['log-level'];
    const debugLevelName = requestedLogLevel ?? DEBUG_LEVEL_NAME;

    this.spinner.start(messages.getMessage('info.checkingDebugLevel'));
    const debugLevelResult = await targetOrgConnection.tooling.query<{ Id: string }>(
      `SELECT Id FROM DebugLevel WHERE DeveloperName = '${debugLevelName}'`,
    );

    let debugLevelId: string;

    if (debugLevelResult.records.length > 0) {
      debugLevelId = debugLevelResult.records[0].Id;
    } else if (requestedLogLevel) {
      throw messages.createError('error.debugLevelNotFound', [debugLevelName]);
    } else {
      const createResult = await targetOrgConnection.tooling.sobject('DebugLevel').create({
        DeveloperName: DEBUG_LEVEL_NAME,
        MasterLabel: DEBUG_LEVEL_NAME,
        ApexCode: 'FINEST',
        Visualforce: 'FINER',
      });

      if (!createResult.success) {
        throw messages.createError('error.debugLevelCreateFailed', [
          createResult.errors.map((e) => e.message).join(', '),
        ]);
      }

      debugLevelId = createResult.id;
    }
    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.configuringTraceFlag'));
    const traceFlagResult = await targetOrgConnection.tooling.query<{ Id: string }>(
      `SELECT Id FROM TraceFlag WHERE LogType = 'DEVELOPER_LOG' AND TracedEntityId = '${userId}'`,
    );

    const startDate = flags['start-date'] ?? new Date().toISOString();
    const expirationDate =
      flags['end-date'] ?? new Date(new Date(startDate).getTime() + TRACE_DURATION_MS).toISOString();

    if (new Date(expirationDate).getTime() <= new Date(startDate).getTime()) {
      throw messages.createError('error.invalidDateRange', [expirationDate, startDate]);
    }

    let traceFlagId: string;

    if (traceFlagResult.records.length > 0) {
      traceFlagId = traceFlagResult.records[0].Id;
      await targetOrgConnection.tooling.sobject('TraceFlag').update({
        Id: traceFlagId,
        DebugLevelId: debugLevelId,
        StartDate: startDate,
        ExpirationDate: expirationDate,
      });
    } else {
      const createResult = await targetOrgConnection.tooling.sobject('TraceFlag').create({
        TracedEntityId: userId,
        LogType: 'DEVELOPER_LOG',
        DebugLevelId: debugLevelId,
        StartDate: startDate,
        ExpirationDate: expirationDate,
      });

      if (!createResult.success) {
        throw messages.createError('error.traceFlagCreateFailed', [
          createResult.errors.map((e) => e.message).join(', '),
        ]);
      }

      traceFlagId = createResult.id;
    }
    this.spinner.stop();

    this.info(messages.getMessage('info.complete', [expirationDate]));

    return { userId, debugLevelId, traceFlagId, expirationDate };
  }
}
