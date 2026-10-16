/*
 * Copyright (c) 2026, SimplySF.
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
import {
  ApexExecuteError,
  ApexTestSuiteError,
  ApexTraceSetupError,
  ApexTraceSilenceError,
  DATE_TIME_PATTERN,
  deleteApexLogsViaBulkApi,
  deleteApexLogsViaCollections,
  executeApex,
  generateApexTestSuite,
  parseOnBehalfOf,
  queryApexLogIdsViaBulkApi,
  queryApexLogIdsViaRest,
  resolveClasses,
  setupApexTrace,
  silenceApexClasses,
  type ApexExecuteResult,
} from '@simplysf/simply-apex-core';
import { z } from 'zod';
import { loadToolsetMessages } from '../messages.js';
import { ToolError } from '../toolError.js';
import { defineTool, limitArg, limitItems, orgArgs, resolveExistingDirs, type ToolDefinition } from './defineTool.js';

const messages = loadToolsetMessages('apex');

/** Debug logs longer than this are cut to their tail, which holds the end of execution. */
export const MAX_LOG_CHARS = 100_000;

/** How much of the log an execute failure quotes: enough for the lines leading up to the exception. */
const ERROR_LOG_CHARS = 20_000;

function tail(text: string, chars: number): string {
  return text.length > chars ? text.slice(-chars) : text;
}

const dateTime = z
  .string()
  .regex(DATE_TIME_PATTERN, 'Expected an ISO 8601 date-time, for example 2026-08-18T14:30:00Z.')
  .optional();

const apexExecute = defineTool({
  name: 'simply_apex_execute',
  toolset: 'apex',
  tier: 'write',
  title: 'Execute anonymous Apex',
  description: messages.getMessage('simply_apex_execute'),
  inputSchema: {
    ...orgArgs,
    file: z.string().min(1).describe('Path to the .apex file to run, relative to the project root or absolute.'),
  },
  outputSchema: {
    success: z.boolean(),
    compiled: z.boolean(),
    compileProblem: z.string(),
    exceptionMessage: z.string(),
    exceptionStackTrace: z.string(),
    line: z.number(),
    column: z.number(),
    logs: z.string().optional(),
    logsTruncated: z.boolean(),
  },
  async run(args, context) {
    const file = context.resolvePath(args.file);
    if (!fs.existsSync(file)) {
      throw new ToolError('file-not-found', messages.getMessage('error.fileNotFound', [file]));
    }
    const connection = await context.connection(args);

    let result: ApexExecuteResult;
    try {
      result = await executeApex(connection, file);
    } catch (error) {
      if (!(error instanceof ApexExecuteError)) throw error;
      if (error.code === 'compile-failed') {
        const { line, column, compileProblem } = error.result;
        throw new ToolError(error.code, messages.getMessage('error.compileFailed', [line, column, compileProblem]));
      }
      const logs = error.result.logs ? `\n\nEnd of the debug log:\n${tail(error.result.logs, ERROR_LOG_CHARS)}` : '';
      throw new ToolError(
        error.code,
        messages.getMessage('error.executeFailed', [error.result.exceptionMessage]) + logs,
      );
    }

    const { logs, ...rest } = result;
    return {
      ...rest,
      ...(logs === undefined ? {} : { logs: tail(logs, MAX_LOG_CHARS) }),
      logsTruncated: (logs?.length ?? 0) > MAX_LOG_CHARS,
    };
  },
  summarize(result) {
    const lines = result.logs ? result.logs.split('\n').length : 0;
    return `Executed successfully. ${lines} debug log line(s)${result.logsTruncated ? ' (truncated)' : ''}.`;
  },
});

function traceSetupError(error: ApexTraceSetupError): ToolError {
  const key = {
    'user-not-found': 'error.userNotFound',
    'ambiguous-on-behalf-of': 'error.ambiguousOnBehalfOf',
    'debug-level-not-found': 'error.debugLevelNotFound',
    'debug-level-create-failed': 'error.debugLevelCreateFailed',
    'trace-flag-create-failed': 'error.traceFlagCreateFailed',
    'invalid-date-range': 'error.invalidDateRange',
  }[error.code];
  return new ToolError(error.code, messages.getMessage(key, error.args));
}

const apexTraceSetup = defineTool({
  name: 'simply_apex_trace_setup',
  toolset: 'apex',
  tier: 'write',
  title: 'Set up an Apex debug log trace flag',
  description: messages.getMessage('simply_apex_trace_setup'),
  inputSchema: {
    ...orgArgs,
    on_behalf_of: z
      .string()
      .optional()
      .describe(
        'The user to trace, as a "Field:Value" pair such as "Username:jane@example.com". Defaults to the org user.',
      ),
    log_level: z
      .string()
      .optional()
      .describe('Developer name of an existing debug level. Defaults to ReplayDebuggerLevels (created if missing).'),
    start_date: dateTime.describe('When tracing starts, as an ISO 8601 date-time. Defaults to now.'),
    end_date: dateTime.describe('When tracing ends, as an ISO 8601 date-time. Defaults to 24 hours after start_date.'),
  },
  outputSchema: {
    userId: z.string(),
    debugLevelId: z.string(),
    traceFlagId: z.string(),
    expirationDate: z.string(),
  },
  async run(args, context) {
    const onBehalfOf = args.on_behalf_of === undefined ? undefined : parseOnBehalfOf(args.on_behalf_of);
    if (args.on_behalf_of !== undefined && !onBehalfOf) {
      throw new ToolError('invalid-on-behalf-of', messages.getMessage('error.invalidOnBehalfOf', [args.on_behalf_of]));
    }
    const connection = await context.connection(args);
    try {
      return await setupApexTrace(connection, {
        onBehalfOf,
        logLevel: args.log_level,
        startDate: args.start_date,
        endDate: args.end_date,
      });
    } catch (error) {
      throw error instanceof ApexTraceSetupError ? traceSetupError(error) : error;
    }
  },
  summarize: (result) =>
    `Trace flag ${result.traceFlagId} is set for user ${result.userId} until ${result.expirationDate}.`,
});

const apexTraceSilence = defineTool({
  name: 'simply_apex_trace_silence',
  toolset: 'apex',
  tier: 'write',
  title: 'Silence Apex classes in debug logs',
  description: messages.getMessage('simply_apex_trace_silence'),
  inputSchema: {
    ...orgArgs,
    classes: z.array(z.string().min(1)).optional().describe('Apex class names to silence.'),
    classes_file: z
      .string()
      .optional()
      .describe('Path to a JSON file listing class names to silence, relative to the project root or absolute.'),
    fflib: z.boolean().default(false).describe('Also silence the fflib framework classes.'),
    at4dx: z.boolean().default(false).describe('Also silence the AT4DX framework classes.'),
    force_di: z.boolean().default(false).describe('Also silence the force-di framework classes.'),
  },
  outputSchema: {
    items: z.array(z.object({ class: z.string(), classId: z.string(), traceFlagId: z.string() })),
    missingClassNames: z.array(z.string()),
    failures: z.array(z.object({ class: z.string(), action: z.enum(['create', 'update']), error: z.string() })),
  },
  async run(args, context) {
    const classesFile = args.classes_file === undefined ? undefined : context.resolvePath(args.classes_file);
    if (classesFile !== undefined && !fs.existsSync(classesFile)) {
      throw new ToolError('file-not-found', messages.getMessage('error.fileNotFound', [classesFile]));
    }

    let classes: string[];
    try {
      classes = resolveClasses(args.classes ?? [], classesFile, {
        fflib: args.fflib,
        at4dx: args.at4dx,
        forceDi: args.force_di,
      });
    } catch (error) {
      if (error instanceof ApexTraceSilenceError && error.code === 'invalid-classes-file') {
        throw new ToolError(error.code, messages.getMessage('error.invalidClassesFile', [error.message]));
      }
      throw error;
    }
    if (classes.length === 0) {
      throw new ToolError('no-classes-specified', messages.getMessage('error.noClassesSpecified'));
    }

    const connection = await context.connection(args);
    try {
      const outcome = await silenceApexClasses(connection, classes);
      return { items: outcome.results, missingClassNames: outcome.missingClassNames, failures: outcome.failures };
    } catch (error) {
      if (error instanceof ApexTraceSilenceError && error.code === 'debug-level-create-failed') {
        throw new ToolError(error.code, messages.getMessage('error.debugLevelCreateFailed', [error.message]));
      }
      throw error;
    }
  },
  summarize(result) {
    const parts = [`Silenced ${result.items.length} class(es).`];
    if (result.missingClassNames.length > 0) parts.push(`Not found: ${result.missingClassNames.join(', ')}.`);
    if (result.failures.length > 0) parts.push(`${result.failures.length} trace flag(s) failed.`);
    return parts.join(' ');
  },
});

const apexLogsPurge = defineTool({
  name: 'simply_apex_logs_purge',
  toolset: 'apex',
  tier: 'destructive',
  title: 'Delete Apex debug logs',
  description: messages.getMessage('simply_apex_logs_purge'),
  inputSchema: {
    ...orgArgs,
    where: z
      .string()
      .min(1)
      .optional()
      .describe('SOQL condition on ApexLog, without the WHERE keyword. Omit it to delete every log.'),
    use_bulk_api: z
      .boolean()
      .default(false)
      .describe('Query and delete through Bulk API jobs. Use for many thousands of logs.'),
    wait: z
      .number()
      .int()
      .min(1)
      .default(30)
      .describe('Minutes to wait for the Bulk API jobs. Only used with use_bulk_api.'),
    limit: limitArg,
  },
  outputSchema: {
    matched: z.number(),
    deleted: z.number(),
    failed: z.number(),
    items: z.array(z.object({ Id: z.string(), Error: z.string().optional() })),
    total: z.number(),
    truncated: z.boolean(),
  },
  async run(args, context) {
    const connection = await context.connection(args);
    const query = `SELECT Id FROM ApexLog${args.where ? ` WHERE ${args.where}` : ''}`;
    const pollTimeout = args.wait * 60_000;

    const logIds = args.use_bulk_api
      ? await queryApexLogIdsViaBulkApi(connection, query, pollTimeout)
      : await queryApexLogIdsViaRest(connection, query);

    const results =
      logIds.length === 0
        ? []
        : args.use_bulk_api
          ? await deleteApexLogsViaBulkApi(connection, logIds, pollTimeout)
          : await deleteApexLogsViaCollections(connection, logIds, (purged, total) => {
              void context.progress(purged, total, `Deleted ${purged} of ${total} logs`);
            });

    const failures = results.filter((result) => !result.Success).map(({ Id, Error }) => ({ Id, Error }));
    return {
      matched: logIds.length,
      deleted: results.length - failures.length,
      failed: failures.length,
      ...limitItems(failures, args.limit),
    };
  },
  summarize(result) {
    if (result.matched === 0) return 'No ApexLog records matched.';
    const failed = result.failed > 0 ? ` ${result.failed} failed; see items.` : '';
    return `Deleted ${result.deleted} of ${result.matched} ApexLog record(s).${failed}`;
  },
});

const apexTestSuiteGenerate = defineTool({
  name: 'simply_apex_test_suite_generate',
  toolset: 'apex',
  tier: 'read',
  title: 'Generate an Apex test suite file',
  description: messages.getMessage('simply_apex_test_suite_generate'),
  inputSchema: {
    source_dir: z
      .array(z.string().min(1))
      .min(1)
      .describe('Source directories to scan for @IsTest classes, relative to the project root or absolute.'),
    name: z
      .string()
      .regex(/^[A-Za-z]\w*$/, 'Expected an API name: a letter, then letters, digits and underscores.')
      .describe('The test suite name; the file is written as <name>.testSuite-meta.xml.'),
    output_dir: z
      .string()
      .min(1)
      .describe('Directory to write the file into, relative to the project root or absolute.'),
  },
  outputSchema: {
    filePath: z.string(),
    testClassCount: z.number(),
    testClassNames: z.array(z.string()),
  },
  async run(args, context) {
    const sourceDirs = resolveExistingDirs(context, args.source_dir, 'source_dir');
    try {
      const result = await generateApexTestSuite(sourceDirs, context.resolvePath(args.output_dir), args.name);
      return { ...result, testClassCount: result.testClassNames.length };
    } catch (error) {
      if (!(error instanceof ApexTestSuiteError)) throw error;
      throw new ToolError(
        error.code,
        error.code === 'no-test-classes-found'
          ? messages.getMessage('error.noTestClassesFound')
          : messages.getMessage('error.scanFailed', [error.message]),
      );
    }
  },
  summarize: (result) => `Wrote ${result.filePath} listing ${result.testClassCount} test class(es).`,
});

export const apexTools: ToolDefinition[] = [
  apexExecute,
  apexTraceSetup,
  apexTraceSilence,
  apexLogsPurge,
  apexTestSuiteGenerate,
];
