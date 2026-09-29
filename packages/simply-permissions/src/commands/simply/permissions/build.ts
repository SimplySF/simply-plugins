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
  generatePermissionSets,
  loadPermissionSetBuildConfig,
  loadPermissionSetsFile,
  PermissionSetBuildError,
  PermissionSetBuildResult,
  PermissionSetSpec,
  PermissionSetType,
} from '@simplysf/simply-permissions-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-permissions', 'simply.permissions.build');

/** Where a single generated permission set was written, and how many permissions it grants. */
export type PermissionsBuildResult = Omit<PermissionSetBuildResult, 'name'>;
/** With `--file`: one entry per permission set declared in the file, in file order. */
export type PermissionsBuildFileResult = PermissionSetBuildResult[];

/** The flags that describe a single permission set, and so can't be combined with `--file`. */
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
  }
}

/**
 * Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally)
 * record types, then generates a permission set XML file with a baseline of permissions
 * determined by `--type`. An optional JSON `--config` file can override individual object,
 * field, tab, record type, and user permission settings, as well as whether the permission set
 * requires activation.
 *
 * With `--file`, generates every permission set declared in a JSON permission sets file instead,
 * validating the whole file before writing anything.
 */
export default class PermissionsBuild extends SfCommand<PermissionsBuildResult | PermissionsBuildFileResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    file: Flags.file({
      summary: messages.getMessage('flags.file.summary'),
      description: messages.getMessage('flags.file.description'),
      char: 'f',
      exists: true,
      exclusive: SINGLE_PERMISSION_SET_FLAGS,
    }),
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
  };

  /** @returns The output file path and object/field permission counts — or, with `--file`, one such entry (plus its name) per permission set. */
  public async run(): Promise<PermissionsBuildResult | PermissionsBuildFileResult> {
    const { flags } = await this.parse(PermissionsBuild);

    try {
      if (flags.file) {
        return await this.buildFromFile(flags.file);
      }

      const { type, name, directory, output } = flags;
      if (!type || !name || !directory || !output) {
        const missing = Object.entries({ type, name, directory, output })
          .filter(([, value]) => !value)
          .map(([flag]) => `--${flag}`);
        throw messages.createError('error.missingRequiredFlags', [missing.join(', ')]);
      }

      let config;
      if (flags.config) {
        this.spinner.start(messages.getMessage('info.readingConfig'));
        config = await loadPermissionSetBuildConfig(flags.config);
        this.spinner.stop();
      }

      const [built] = await generatePermissionSets(
        [
          {
            type,
            name,
            label: flags.label,
            description: flags.description,
            includeRecordTypes: flags['include-record-types'],
            config,
            directory,
            output,
          },
        ],
        () => this.spinner.start(messages.getMessage('info.buildingPermissionSet', [name])),
      );
      this.spinner.stop();

      this.info(messages.getMessage('info.fileGenerated', [built.path]));
      return {
        path: built.path,
        objectPermissionCount: built.objectPermissionCount,
        fieldPermissionCount: built.fieldPermissionCount,
      };
    } catch (error) {
      throw error instanceof PermissionSetBuildError ? toCliError(error) : error;
    }
  }

  private async buildFromFile(file: string): Promise<PermissionsBuildFileResult> {
    this.spinner.start(messages.getMessage('info.readingConfig'));
    const specs: PermissionSetSpec[] = await loadPermissionSetsFile(file);
    this.spinner.stop();

    const results = await generatePermissionSets(specs, (name) => {
      this.spinner.stop();
      this.spinner.start(messages.getMessage('info.buildingPermissionSet', [name]));
    });
    this.spinner.stop();

    this.table({
      data: results,
      columns: [
        { key: 'name', name: 'NAME' },
        { key: 'path', name: 'PATH' },
        { key: 'objectPermissionCount', name: 'OBJECT PERMISSIONS' },
        { key: 'fieldPermissionCount', name: 'FIELD PERMISSIONS' },
      ],
    });
    this.info(messages.getMessage('info.filesGenerated', [results.length]));

    return results;
  }
}
