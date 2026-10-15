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

import { type Connection, Messages, SfError, SfProject } from '@salesforce/core';
import type { SfCommand } from '@salesforce/sf-plugins-core';
import {
  describeGenerationError,
  isAepGenerationError,
  planValidation,
  renderGenerationPlan,
  renderGenerationResult,
  type AepCommandResult,
  type GenerationIssue,
  type GenerationUseCase,
} from '@simplysf/simply-aep-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-aep', 'simply.aep.generate.common');

/** What every `simply aep generate` command returns under `--json`. */
export type GenerateCommandResult = AepCommandResult & { issues: GenerationIssue[] };

/**
 * The flag behind each use-case option, for every option any generator takes. A use case whose
 * schema has a key missing here can't be driven from the CLI — `test/.../generate/parity.test.ts`
 * checks every command against it, so that fails CI instead of silently dropping the option.
 */
export const FLAG_BY_OPTION: Readonly<Record<string, string>> = {
  outputPath: 'output-dir',
  apiVersion: 'api-version',
  sobject: 'sobject',
  flavor: 'flavor',
  prefix: 'prefix',
  bindingSequence: 'sequence',
  selector: 'selector',
  domain: 'domain',
  unitOfWork: 'unit-of-work',
  serviceBasename: 'service-basename',
};

/** The flags every generator declares that aren't options of the use case. */
export const CLI_ONLY_FLAGS: ReadonlySet<string> = new Set([
  'target-org',
  'dry-run',
  'overwrite',
  'force',
  'json',
  'flags-dir',
]);

/**
 * @param useCase - The generator.
 * @param flags - The command's parsed flags.
 * @returns The use case's options, read from the flags `FLAG_BY_OPTION` names.
 */
export function toOptions(useCase: GenerationUseCase, flags: Record<string, unknown>): Record<string, unknown> {
  const shape = (useCase.descriptor.optionsSchema as unknown as { shape: Record<string, unknown> }).shape;
  return Object.fromEntries(Object.keys(shape).map((key) => [key, flags[FLAG_BY_OPTION[key]]]));
}

/** Where `runGeneration` writes: the calling command, whose output methods already go quiet under `--json`. */
export type GenerationReporter = Pick<SfCommand<unknown>, 'log' | 'warn' | 'table'>;

type IssueDisplayRow = { severity: string; rule: string; message: string };

const ISSUE_TABLE_COLUMNS: Array<{ key: keyof IssueDisplayRow; name: string }> = [
  { key: 'severity', name: 'SEVERITY' },
  { key: 'rule', name: 'RULE' },
  { key: 'message', name: 'MESSAGE' },
];

type WriteFlags = { 'dry-run': boolean; overwrite: boolean; force: boolean };

/** @returns The project's package directories, or none outside a Salesforce DX project. */
async function packageDirectories(): Promise<string[]> {
  try {
    const project = await SfProject.resolve();
    return project.getPackageDirectories().map((dir) => dir.fullPath);
  } catch {
    return [];
  }
}

/**
 * @param error - What a use case threw.
 * @returns The error to throw from the command: a message-catalog `SfError` for the codes users can act on.
 */
export function toGenerateCliError(error: unknown): Error {
  if (isAepGenerationError(error)) {
    const data = error.data as { sobject?: string; cause?: unknown; absolutePaths?: string[] } | undefined;
    switch (error.code) {
      case 'sobject-not-found':
        return messages.createError('error.sobjectNotFound', [data?.sobject]);
      case 'describe-failed':
        return data?.cause instanceof Error ? data.cause : error;
      case 'nothing-selected':
        return messages.createError('error.nothingSelected');
      case 'file-exists':
        return messages.createError('error.filesExist', [(data?.absolutePaths ?? []).join('\n')]);
      case 'org-required':
      case 'cancelled':
      case 'duplicate-path':
      case 'write-failed':
      case 'template-missing':
      case 'template-empty':
        return new SfError(error.message, 'AepGenerationError');
    }
  }
  // zod is simply-aep-core's dependency, not this plugin's: match its error by name.
  if (error instanceof Error && error.name === 'ZodError') {
    return messages.createError('error.invalidOptions', [describeGenerationError(error).title]);
  }
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * The CLI path for every generator: plan, validate what the planned binding records would
 * introduce, then report a dry run or write — refusing to replace existing files without
 * `--overwrite`, or to introduce an error-severity issue without `--force`. See
 * docs/design/0045-migrate-apx-into-simply-aep.md.
 *
 * @param useCase - The generator.
 * @param connection - The org connection, when the generator uses one.
 * @param flags - The command's parsed flags.
 * @param reporter - Where human-readable output goes; no-ops under `--json`.
 * @returns The `--json` result.
 */
export async function runGeneration(
  useCase: GenerationUseCase,
  connection: Connection | undefined,
  flags: WriteFlags & Record<string, unknown>,
  reporter: GenerationReporter,
): Promise<GenerateCommandResult> {
  const commandId = useCase.descriptor.id;
  try {
    const preview = await useCase.plan(connection, toOptions(useCase, flags));
    const issues = planValidation(preview, [...(await packageDirectories()), preview.baseDir]);
    if (issues.length > 0) {
      reporter.table({
        data: issues.map((issue) => ({ severity: issue.severity, rule: issue.rule, message: issue.message })),
        columns: ISSUE_TABLE_COLUMNS,
      });
    }
    const hasErrors = issues.some((issue) => issue.severity === 'error');
    const existing = preview.files.filter((file) => file.status === 'exists');

    if (flags['dry-run']) {
      for (const line of renderGenerationPlan(preview)) reporter.log(line);
      const wouldCreate = preview.files.map((file) => file.absolutePath);
      const result = {
        baseDir: preview.baseDir,
        created: [],
        skipped: [],
        wouldCreate,
        ...(preview.manualSteps ? { manualSteps: preview.manualSteps } : {}),
      };
      for (const line of renderGenerationResult(result, { commandId })) reporter.log(line);
      if (existing.length > 0 && !flags.overwrite) {
        reporter.warn(messages.getMessage('warning.dryRunWouldOverwrite', [existing.length]));
      }
      if (hasErrors && !flags.force) reporter.warn(messages.getMessage('warning.dryRunWouldRefuse'));
      return { ...result, issues };
    }

    if (existing.length > 0 && !flags.overwrite) {
      throw messages.createError('error.filesExist', [existing.map((file) => file.absolutePath).join('\n')]);
    }
    if (hasErrors && !flags.force) throw messages.createError('error.validationFailed');

    const outcome = await useCase.apply(connection, preview, { overwrite: flags.overwrite ? 'overwrite' : 'error' });
    for (const line of renderGenerationResult(outcome, { commandId })) reporter.log(line);
    return { ...outcome, issues };
  } catch (error) {
    throw error instanceof SfError ? error : toGenerateCliError(error);
  }
}
