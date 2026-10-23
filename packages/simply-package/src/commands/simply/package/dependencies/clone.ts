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

import path from 'node:path';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { Messages } from '@salesforce/core';
import { clonePackageDependencies, type DependencyCloneResult } from '@simplysf/simply-package-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-package', 'simply.package.dependencies.clone');

export type { DependencyCloneResult };

/**
 * Git-clones the source repositories of a Salesforce DX project's package dependencies, as mapped
 * in `plugins.simply.dependencies.repositories`, so their metadata can be reviewed locally.
 */
export default class PackageDependenciesClone extends SfCommand<DependencyCloneResult[]> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;

  public static readonly flags = {
    'output-dir': Flags.string({
      summary: messages.getMessage('flags.output-dir.summary'),
      description: messages.getMessage('flags.output-dir.description'),
      char: 'd',
      default: '..',
    }),
    recursive: Flags.boolean({
      summary: messages.getMessage('flags.recursive.summary'),
      char: 'r',
      default: false,
    }),
    // No default on purpose: leaving --depth out means full history, which git has no number for.
    // eslint-disable-next-line sf-plugin/flag-min-max-default
    depth: Flags.integer({
      summary: messages.getMessage('flags.depth.summary'),
      description: messages.getMessage('flags.depth.description'),
      min: 1,
    }),
    update: Flags.boolean({
      summary: messages.getMessage('flags.update.summary'),
      description: messages.getMessage('flags.update.description'),
      char: 'u',
      default: false,
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      default: false,
    }),
  };

  /** @returns One row per dependency. Sets `process.exitCode = 1` when any row is `Failed`. */
  public async run(): Promise<DependencyCloneResult[]> {
    const { flags } = await this.parse(PackageDependenciesClone);
    const projectDir = this.project!.getPath();

    const results = await clonePackageDependencies({
      projectDir,
      outputDir: flags['output-dir'],
      recursive: flags.recursive,
      depth: flags.depth,
      update: flags.update,
      dryRun: flags['dry-run'],
      progress: {
        info: (message) => this.info(message),
        warn: (message) => this.warn(message),
        stepStart: (message) => this.spinner.start(message, '', { stdout: true }),
        stepStop: (message) => this.spinner.stop(message),
      },
    });

    if (results.length === 0) {
      this.info(messages.getMessage('info.noDependencies'));
    } else {
      this.table({
        data: results.map((row) => ({
          key: row.key ?? row.package,
          ref: row.ref ?? '',
          status: row.message ? `${row.status} (${row.message})` : row.status,
          via: row.via,
          directory: row.directory ? path.relative(projectDir, row.directory) : '',
        })),
        columns: [
          { key: 'key', name: 'KEY' },
          { key: 'ref', name: 'REF' },
          { key: 'status', name: 'STATUS' },
          { key: 'via', name: 'VIA' },
          { key: 'directory', name: 'DIRECTORY' },
        ],
      });
    }

    if (results.some((row) => row.status === 'Failed')) {
      process.exitCode = 1;
    }

    return results;
  }
}
