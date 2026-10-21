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

import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import {
  assertUniquePermissionSetNames,
  checkPermissionSets,
  findPermissionSetBuildFiles,
  generatePermissionSets,
  loadPermissionSetBuildConfig,
  loadPermissionSetBuildFile,
  PermissionSetBuildError,
  PermissionSetBuildResult,
  PermissionSetCheckStatus,
  PermissionSetSpec,
  PermissionSetType,
} from '@simplysf/simply-permissions-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-permissions', 'simply.permissions.build');

/** One permission set's output path and permission counts; with `--check`, also whether the file there matches. */
type PermissionsBuildEntry = PermissionSetBuildResult & { status?: PermissionSetCheckStatus };
/**
 * Where a single generated permission set was written (or, with `--check`, would be), and how many
 * permissions it grants. With `--check`, `status` says whether the file there matches.
 */
export type PermissionsBuildResult = Omit<PermissionsBuildEntry, 'name'>;
/**
 * With none of the single-permission-set flags: one entry per discovered permission set build file,
 * each with the `file` that defined it, in file order.
 */
export type PermissionsBuildDiscoverResult = Array<{ file: string } & PermissionsBuildEntry>;

/** The flags that describe a single permission set. When none is given, every discovered permission set build file is built. */
const SINGLE_PERMISSION_SET_FLAGS = [
  'type',
  'name',
  'directory',
  'output',
  'config',
  'include-record-types',
  'label',
  'description',
];

const TABLE_COLUMNS: Array<{ key: keyof PermissionsBuildDiscoverResult[number]; name: string }> = [
  { key: 'name', name: 'NAME' },
  { key: 'path', name: 'PATH' },
  { key: 'objectPermissionCount', name: 'OBJECT PERMISSIONS' },
  { key: 'fieldPermissionCount', name: 'FIELD PERMISSIONS' },
];

/** Maps `PermissionSetBuildError`'s structural codes to this command's own `Messages` catalog. */
function toCliError(error: PermissionSetBuildError): Error {
  switch (error.code) {
    case 'scan-failed':
      return messages.createError('error.scanFailed', error.args);
    case 'invalid-config':
      return messages.createError('error.invalidConfig', error.args);
    case 'config-not-found':
      return messages.createError('error.configNotFound', error.args);
    case 'directory-not-found':
      return messages.createError('error.directoryNotFound', error.args);
    case 'legacy-format':
      return messages.createError('error.legacyFormat', error.args);
    case 'duplicate-name':
      return messages.createError('error.duplicateName', error.args);
  }
}

/** Loads a discovered permission set build file, naming the file in any validation error. */
async function loadDiscoveredFile(file: string): Promise<PermissionSetSpec> {
  try {
    return await loadPermissionSetBuildFile(file);
  } catch (error) {
    if (error instanceof PermissionSetBuildError) {
      throw messages.createError('error.invalidBuildFile', [file, toCliError(error).message]);
    }
    throw error;
  }
}

/**
 * Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally)
 * record types, then generates a permission set XML file with a baseline of permissions
 * determined by `--type`. An optional JSON `--config` file can override individual object,
 * field, tab, record type, and user permission settings, as well as whether the permission set
 * requires activation.
 *
 * With none of the single-permission-set flags, does the same for every permission set build file
 * under the current directory, each of which defines one permission set, validating all of them
 * before writing anything.
 *
 * With `--check`, writes nothing: compares each permission set it would generate with the file
 * already at its output path, and sets `process.exitCode = 1` if any has drifted or is missing.
 */
export default class PermissionsBuild extends SfCommand<PermissionsBuildResult | PermissionsBuildDiscoverResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    type: Flags.custom<PermissionSetType>({
      options: ['read-only', 'view-all', 'modify-all'],
    })({
      summary: messages.getMessage('flags.type.summary'),
      description: messages.getMessage('flags.type.description'),
    }),
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
      char: 'n',
    }),
    directory: Flags.directory({
      summary: messages.getMessage('flags.directory.summary'),
      description: messages.getMessage('flags.directory.description'),
      char: 'd',
      exists: true,
    }),
    config: Flags.file({
      summary: messages.getMessage('flags.config.summary'),
      description: messages.getMessage('flags.config.description'),
      char: 'c',
      exists: true,
    }),
    output: Flags.directory({
      summary: messages.getMessage('flags.output.summary'),
      description: messages.getMessage('flags.output.description'),
    }),
    'include-record-types': Flags.boolean({
      summary: messages.getMessage('flags.include-record-types.summary'),
      description: messages.getMessage('flags.include-record-types.description'),
      default: false,
    }),
    label: Flags.string({
      summary: messages.getMessage('flags.label.summary'),
    }),
    description: Flags.string({
      summary: messages.getMessage('flags.description.summary'),
    }),
    check: Flags.boolean({
      summary: messages.getMessage('flags.check.summary'),
      description: messages.getMessage('flags.check.description'),
      default: false,
    }),
  };

  /**
   * @returns The output file path and object/field permission counts — or, with no single-permission-set flags,
   * one such entry (plus its name and file) per discovered permission set build file.
   * With `--check`, each also has a `status`, and `process.exitCode` is set to 1 when any isn't `up-to-date`.
   */
  public async run(): Promise<PermissionsBuildResult | PermissionsBuildDiscoverResult> {
    const { flags } = await this.parse(PermissionsBuild);

    try {
      if (!SINGLE_PERMISSION_SET_FLAGS.some((flag) => flags[flag as keyof typeof flags])) {
        return await this.buildDiscovered(flags.check);
      }
      const specs = await this.singleSpec(flags);
      const results = flags.check ? await this.check(specs) : await this.generate(specs, false);
      // Single-set mode has never included `name` in its result.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { name, ...result } = results[0];
      return result;
    } catch (error) {
      throw error instanceof PermissionSetBuildError ? toCliError(error) : error;
    }
  }

  /** Resolves the single-permission-set flags into a spec, reporting every missing required flag at once. */
  private async singleSpec(flags: {
    type?: PermissionSetType;
    name?: string;
    directory?: string;
    output?: string;
    config?: string;
    label?: string;
    description?: string;
    'include-record-types': boolean;
  }): Promise<PermissionSetSpec[]> {
    const { type, name, directory, output, config } = flags;
    if (!type || !name || !directory || !output) {
      const missing = Object.entries({ type, name, directory, output })
        .filter(([, value]) => !value)
        .map(([flag]) => `--${flag}`);
      throw messages.createError('error.missingRequiredFlags', [missing.join(', ')]);
    }

    return [
      {
        type,
        name,
        label: flags.label,
        description: flags.description,
        includeRecordTypes: flags['include-record-types'],
        config: config ? await this.readConfig(() => loadPermissionSetBuildConfig(config)) : undefined,
        directory,
        output,
      },
    ];
  }

  /**
   * Builds (or, with `check`, checks) the permission set defined by every permission set build file
   * under the current directory. Every file is loaded and validated, and names are checked for
   * duplicates across files, before anything is written. No files is a warning, not an error, so the
   * command is safe to run in any repo.
   */
  private async buildDiscovered(check: boolean): Promise<PermissionsBuildDiscoverResult> {
    const files = await findPermissionSetBuildFiles();
    if (files.length === 0) {
      this.warn(messages.getMessage('warning.noFilesFound'));
      return [];
    }
    this.info(messages.getMessage('info.filesFound', [files.length]));

    const entries: Array<{ file: string; spec: PermissionSetSpec }> = [];
    await this.readConfig(async () => {
      for (const file of files) {
        // eslint-disable-next-line no-await-in-loop -- files are loaded in order so the first invalid one is the one reported
        entries.push({ file, spec: await loadDiscoveredFile(file) });
      }
    });
    assertUniquePermissionSetNames(entries);

    const specs = entries.map(({ spec }) => spec);
    const sources = entries.map(({ file }) => file);
    const results = check ? await this.check(specs, sources) : await this.generate(specs, true, sources);
    return results.map((result, i) => ({ file: sources[i], ...result }));
  }

  /** @param sources - With discovery, the permission set build file each spec came from, shown as a FILE column. */
  private async generate(
    specs: PermissionSetSpec[],
    asTable: boolean,
    sources?: string[],
  ): Promise<PermissionSetBuildResult[]> {
    const results = await generatePermissionSets(specs, (name) =>
      this.startSpinner('info.buildingPermissionSet', name),
    );
    this.spinner.stop();

    if (asTable) {
      this.printTable(results, sources);
      this.info(messages.getMessage('info.filesGenerated', [results.length]));
    } else {
      this.info(messages.getMessage('info.fileGenerated', [results[0].path]));
    }

    return results;
  }

  private async check(specs: PermissionSetSpec[], sources?: string[]): Promise<PermissionsBuildEntry[]> {
    const results = await checkPermissionSets(specs, (name) => this.startSpinner('info.checkingPermissionSet', name));
    this.spinner.stop();

    this.printTable(results, sources, [{ key: 'status', name: 'STATUS' }]);

    const stale = results.filter((result) => result.status !== 'up-to-date').length;
    if (stale > 0) {
      this.warn(messages.getMessage('warning.drifted', [stale, results.length]));
      process.exitCode = 1;
    } else {
      this.info(messages.getMessage('info.upToDate', [results.length]));
    }

    return results;
  }

  /** Prints one row per result, with a leading FILE column when `sources` gives each result's permission set build file. */
  private printTable(
    results: PermissionsBuildEntry[],
    sources?: string[],
    extraColumns: typeof TABLE_COLUMNS = [],
  ): void {
    const fileColumn: typeof TABLE_COLUMNS = sources ? [{ key: 'file', name: 'FILE' }] : [];
    this.table({
      data: results.map((result, i) => ({ file: sources?.[i], ...result })),
      columns: [...fileColumn, ...TABLE_COLUMNS, ...extraColumns],
    });
  }

  private async readConfig<T>(load: () => Promise<T>): Promise<T> {
    this.spinner.start(messages.getMessage('info.readingConfig'));
    const loaded = await load();
    this.spinner.stop();
    return loaded;
  }

  private startSpinner(key: string, name: string): void {
    this.spinner.stop();
    this.spinner.start(messages.getMessage(key, [name]));
  }
}
