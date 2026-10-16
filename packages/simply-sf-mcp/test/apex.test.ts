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
import path from 'node:path';
import * as apexCore from '@simplysf/simply-apex-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_LOG_CHARS } from '../src/tools/apex.js';
import { connect, errorCodeOf, fakeBackend, tempDir, textOf, type Harness } from './helpers.js';

vi.mock('@simplysf/simply-apex-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@simplysf/simply-apex-core')>();
  return {
    ...actual,
    executeApex: vi.fn(),
    setupApexTrace: vi.fn(),
    silenceApexClasses: vi.fn(),
    queryApexLogIdsViaRest: vi.fn(),
    queryApexLogIdsViaBulkApi: vi.fn(),
    deleteApexLogsViaCollections: vi.fn(),
    deleteApexLogsViaBulkApi: vi.fn(),
    generateApexTestSuite: vi.fn(),
  };
});

const core = vi.mocked(apexCore);

const ok: apexCore.ApexExecuteResult = {
  success: true,
  compiled: true,
  compileProblem: '',
  exceptionMessage: '',
  exceptionStackTrace: '',
  line: -1,
  column: -1,
  logs: 'line one\nline two',
};

describe('apex tools', () => {
  let dir: string;
  let cleanup: () => void;
  let harness: Harness;
  let backend: ReturnType<typeof fakeBackend>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ dir, cleanup } = tempDir());
    fs.writeFileSync(path.join(dir, 'script.apex'), "System.debug('hi');");
    backend = fakeBackend({ aliases: { dev: 'dev@example.com' }, orgs: ['dev@example.com'], defaultOrg: 'dev' });
    harness = await connect({ directory: dir, backend, allow: 'destructive' });
  });

  afterEach(async () => {
    await harness.close();
    cleanup();
  });

  describe('simply_apex_execute', () => {
    it('runs the file, resolved against the project, in the named org', async () => {
      core.executeApex.mockResolvedValue(ok);

      const result = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'script.apex' });

      expect(result.isError).toBeFalsy();
      expect(result.structuredContent).toStrictEqual({
        ...ok,
        logsTruncated: false,
      });
      expect(textOf(result)).toBe('Executed successfully. 2 debug log line(s).');
      const [connection, file] = core.executeApex.mock.calls[0];
      expect(connection.getUsername()).toBe('dev@example.com');
      expect(file).toBe(path.join(dir, 'script.apex'));
    });

    it('requires target_org, because anonymous Apex can change data', async () => {
      const result = await harness.call('simply_apex_execute', { file: 'script.apex' });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toBe('target_org is required for tools that change an org.');
      expect(errorCodeOf(result)).toBe('target-org-required');
      expect(core.executeApex).not.toHaveBeenCalled();
    });

    it('keeps the tail of a long log', async () => {
      core.executeApex.mockResolvedValue({ ...ok, logs: `HEAD${'x'.repeat(MAX_LOG_CHARS)}` });

      const { structuredContent } = await harness.call('simply_apex_execute', {
        target_org: 'dev',
        file: 'script.apex',
      });

      expect(structuredContent).toMatchObject({ logsTruncated: true, logs: 'x'.repeat(MAX_LOG_CHARS) });
    });

    it("reports a compile failure in the CLI's words", async () => {
      core.executeApex.mockRejectedValue(
        new apexCore.ApexExecuteError('compile-failed', 'nope', {
          ...ok,
          success: false,
          compiled: false,
          line: 3,
          column: 7,
          compileProblem: 'Unexpected token',
        }),
      );

      const result = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'script.apex' });

      expect(result.isError).toBe(true);
      expect(textOf(result)).toBe('Compilation failed at line 3, column 7 with the error: Unexpected token');
      expect(errorCodeOf(result)).toBe('compile-failed');
    });

    it('quotes the end of the log when execution throws', async () => {
      core.executeApex.mockRejectedValue(
        new apexCore.ApexExecuteError('execute-failed', 'nope', {
          ...ok,
          success: false,
          exceptionMessage: 'System.NullPointerException',
          logs: 'USER_DEBUG|before the crash',
        }),
      );

      const result = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'script.apex' });

      expect(textOf(result)).toBe(
        'Execution failed with the error: System.NullPointerException\n\nEnd of the debug log:\nUSER_DEBUG|before the crash',
      );
      expect(errorCodeOf(result)).toBe('execute-failed');
    });

    it('refuses a file that does not exist before touching the org', async () => {
      const result = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'missing.apex' });

      expect(errorCodeOf(result)).toBe('file-not-found');
      expect(backend.loadOrg).not.toHaveBeenCalled();
    });

    it('refreshes auth and retries once after INVALID_SESSION_ID', async () => {
      core.executeApex
        .mockRejectedValueOnce(Object.assign(new Error('Session expired or invalid'), { name: 'INVALID_SESSION_ID' }))
        .mockResolvedValueOnce(ok);

      const result = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'script.apex' });

      expect(result.isError).toBeFalsy();
      expect(core.executeApex).toHaveBeenCalledTimes(2);
      expect(backend.refreshAuth).toHaveBeenCalledTimes(1);
    });

    it('gives up after one retry', async () => {
      core.executeApex.mockRejectedValue(
        Object.assign(new Error('Session expired or invalid'), { name: 'INVALID_SESSION_ID' }),
      );

      const result = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'script.apex' });

      expect(result.isError).toBe(true);
      expect(core.executeApex).toHaveBeenCalledTimes(2);
    });

    it('turns an unexpected throw into an error result and keeps serving', async () => {
      const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      core.executeApex.mockRejectedValueOnce(new TypeError('boom')).mockResolvedValueOnce(ok);

      const failed = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'script.apex' });
      const next = await harness.call('simply_apex_execute', { target_org: 'dev', file: 'script.apex' });

      expect(failed).toMatchObject({ isError: true, content: [{ type: 'text', text: 'boom' }] });
      expect(errorCodeOf(failed)).toBe('unexpected-error');
      expect(next.isError).toBeFalsy();
      expect(stderr).toHaveBeenCalledWith(expect.stringContaining('TypeError: boom'));
      stderr.mockRestore();
    });
  });

  describe('simply_apex_trace_setup', () => {
    it('passes the options through and returns the trace flag', async () => {
      const traced = { userId: '005', debugLevelId: '7dl', traceFlagId: '7tf', expirationDate: '2026-10-17T00:00:00Z' };
      core.setupApexTrace.mockResolvedValue(traced);

      const result = await harness.call('simply_apex_trace_setup', {
        target_org: 'dev',
        on_behalf_of: 'Username:jane@example.com',
        start_date: '2026-10-16T00:00:00Z',
      });

      expect(result.structuredContent).toStrictEqual(traced);
      expect(core.setupApexTrace.mock.calls[0][1]).toStrictEqual({
        onBehalfOf: { field: 'Username', value: 'jane@example.com' },
        logLevel: undefined,
        startDate: '2026-10-16T00:00:00Z',
        endDate: undefined,
      });
    });

    it('rejects a malformed on_behalf_of', async () => {
      const result = await harness.call('simply_apex_trace_setup', { target_org: 'dev', on_behalf_of: 'jane' });
      expect(errorCodeOf(result)).toBe('invalid-on-behalf-of');
      expect(core.setupApexTrace).not.toHaveBeenCalled();
    });

    it('rejects a malformed date through the schema, naming the argument', async () => {
      const result = await harness.call('simply_apex_trace_setup', { target_org: 'dev', end_date: 'tomorrow' });
      expect(result.isError).toBe(true);
      expect(textOf(result)).toContain('end_date');
    });

    it('maps each core error code to its message', async () => {
      core.setupApexTrace.mockRejectedValue(
        new apexCore.ApexTraceSetupError('user-not-found', 'x', ['Username:ghost@example.com']),
      );
      const result = await harness.call('simply_apex_trace_setup', { target_org: 'dev' });
      expect(textOf(result)).toBe('User not found for Username:ghost@example.com');
      expect(errorCodeOf(result)).toBe('user-not-found');
    });
  });

  describe('simply_apex_trace_silence', () => {
    it('combines the classes and presets and reports what was missing', async () => {
      core.silenceApexClasses.mockResolvedValue({
        results: [{ class: 'Foo', classId: '01p', traceFlagId: '7tf' }],
        missingClassNames: ['Bar'],
        failures: [],
      });

      const result = await harness.call('simply_apex_trace_silence', {
        target_org: 'dev',
        classes: ['Foo', 'Bar'],
        force_di: true,
      });

      expect(core.silenceApexClasses.mock.calls[0][1]).toStrictEqual(['Foo', 'Bar', ...apexCore.FORCE_DI_CLASSES]);
      expect(result.structuredContent).toStrictEqual({
        items: [{ class: 'Foo', classId: '01p', traceFlagId: '7tf' }],
        missingClassNames: ['Bar'],
        failures: [],
      });
      expect(textOf(result)).toBe('Silenced 1 class(es). Not found: Bar.');
    });

    it('needs at least one class', async () => {
      const result = await harness.call('simply_apex_trace_silence', { target_org: 'dev' });
      expect(errorCodeOf(result)).toBe('no-classes-specified');
    });
  });

  describe('simply_apex_logs_purge', () => {
    it('deletes matching logs, reports progress, and lists only the failures', async () => {
      core.queryApexLogIdsViaRest.mockResolvedValue(['07L1', '07L2', '07L3']);
      core.deleteApexLogsViaCollections.mockImplementation(async (_connection, ids, onChunk) => {
        onChunk?.(3, 3);
        return ids.map((Id, index) => (index === 2 ? { Id, Success: false, Error: 'locked' } : { Id, Success: true }));
      });
      const progress: number[] = [];

      const result = await harness.call(
        'simply_apex_logs_purge',
        { target_org: 'dev', where: "Operation = 'API'" },
        (value) => progress.push(value),
      );

      expect(core.queryApexLogIdsViaRest.mock.calls[0][1]).toBe("SELECT Id FROM ApexLog WHERE Operation = 'API'");
      expect(result.structuredContent).toStrictEqual({
        matched: 3,
        deleted: 2,
        failed: 1,
        items: [{ Id: '07L3', Error: 'locked' }],
        total: 1,
        truncated: false,
      });
      expect(textOf(result)).toBe('Deleted 2 of 3 ApexLog record(s). 1 failed; see items.');
      expect(progress).toStrictEqual([3]);
    });

    it('uses the Bulk API with the wait in milliseconds', async () => {
      core.queryApexLogIdsViaBulkApi.mockResolvedValue(['07L1']);
      core.deleteApexLogsViaBulkApi.mockResolvedValue([{ Id: '07L1', Success: true }]);

      await harness.call('simply_apex_logs_purge', { target_org: 'dev', use_bulk_api: true, wait: 5 });

      expect(core.queryApexLogIdsViaBulkApi.mock.calls[0][2]).toBe(300_000);
      expect(core.deleteApexLogsViaBulkApi.mock.calls[0][2]).toBe(300_000);
    });

    it('does nothing when no logs match', async () => {
      core.queryApexLogIdsViaRest.mockResolvedValue([]);
      const result = await harness.call('simply_apex_logs_purge', { target_org: 'dev' });
      expect(textOf(result)).toBe('No ApexLog records matched.');
      expect(core.deleteApexLogsViaCollections).not.toHaveBeenCalled();
    });

    it('never falls back to the default org', async () => {
      const result = await harness.call('simply_apex_logs_purge', {});
      expect(errorCodeOf(result)).toBe('target-org-required');
    });
  });

  describe('simply_apex_test_suite_generate', () => {
    it('resolves the directories against the project and needs no org', async () => {
      fs.mkdirSync(path.join(dir, 'force-app'));
      core.generateApexTestSuite.mockResolvedValue({
        filePath: '/out/All.testSuite-meta.xml',
        testClassNames: ['ATest'],
      });

      const result = await harness.call('simply_apex_test_suite_generate', {
        source_dir: ['force-app'],
        name: 'All',
        output_dir: 'suites',
      });

      expect(core.generateApexTestSuite).toHaveBeenCalledWith(
        [path.join(dir, 'force-app')],
        path.join(dir, 'suites'),
        'All',
      );
      expect(result.structuredContent).toStrictEqual({
        filePath: '/out/All.testSuite-meta.xml',
        testClassCount: 1,
        testClassNames: ['ATest'],
      });
      expect(backend.loadOrg).not.toHaveBeenCalled();
    });

    it('refuses a missing source directory', async () => {
      const result = await harness.call('simply_apex_test_suite_generate', {
        source_dir: ['nope'],
        name: 'All',
        output_dir: 'suites',
      });
      expect(errorCodeOf(result)).toBe('directory-not-found');
    });

    it('refuses a name that would escape the output directory', async () => {
      const result = await harness.call('simply_apex_test_suite_generate', {
        source_dir: ['.'],
        name: '../evil',
        output_dir: 'suites',
      });
      expect(result.isError).toBe(true);
      expect(core.generateApexTestSuite).not.toHaveBeenCalled();
    });

    it('maps no-test-classes-found', async () => {
      core.generateApexTestSuite.mockRejectedValue(new apexCore.ApexTestSuiteError('no-test-classes-found', 'x'));
      const result = await harness.call('simply_apex_test_suite_generate', {
        source_dir: ['.'],
        name: 'All',
        output_dir: 'suites',
      });
      expect(textOf(result)).toBe('No @IsTest-annotated classes were found in the given source director(y/ies).');
    });
  });
});
