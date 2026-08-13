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

/* eslint-disable no-await-in-loop */
import fs from 'node:fs/promises';
import path from 'node:path';
import { glob } from 'glob';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-project', 'simply.project.update-api-version');

/** Summary of the metadata files scanned/updated, and whether sfdx-project.json was updated. */
export type ProjectUpdateApiVersionResult = {
  directory: string;
  apiVersion: string;
  metadataFilesScanned: number;
  updatedFiles: string[];
  projectFileUpdated: boolean;
};

/**
 * Escape a string for safe use as a literal inside a `RegExp` pattern.
 *
 * @param value - The string to escape.
 * @returns The escaped string, safe to interpolate into a `RegExp` source.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Recursively scans a directory for `-meta.xml` files and updates every `<apiVersion>` tag to
 * the target version. If the directory contains an `sfdx-project.json` file, its
 * `sourceApiVersion` property is updated to match.
 */
export default class ProjectUpdateApiVersion extends SfCommand<ProjectUpdateApiVersionResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    directory: Flags.directory({
      summary: messages.getMessage('flags.directory.summary'),
      description: messages.getMessage('flags.directory.description'),
      char: 'd',
      exists: true,
      required: true,
    }),
    'api-version': Flags.orgApiVersion({
      summary: messages.getMessage('flags.api-version.summary'),
      description: messages.getMessage('flags.api-version.description'),
      char: 'a',
      required: true,
    }),
  };

  /**
   * @returns A summary of the metadata files scanned/updated, and whether sfdx-project.json was
   * updated.
   */
  public async run(): Promise<ProjectUpdateApiVersionResult> {
    const { flags } = await this.parse(ProjectUpdateApiVersion);

    const directory = flags.directory;
    const apiVersion = flags['api-version'];

    this.spinner.start(messages.getMessage('info.scanningDirectory'));

    const globPattern = `${directory.split(path.sep).join('/')}/**/*-meta.xml`;
    const files = await glob(globPattern, { ignore: 'node_modules/**' });

    const apiVersionTagRegex = new RegExp(
      `(<apiVersion>)(?!${escapeRegExp(apiVersion)}\\b)\\d+\\.\\d+(</apiVersion>)`,
      'g',
    );
    const currentVersionRegex = /<apiVersion>(?<currentVersion>\d+\.\d+)<\/apiVersion>/;

    const updatedFiles: string[] = [];

    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      const match = content.match(currentVersionRegex);

      if (match?.groups?.currentVersion && match.groups.currentVersion !== apiVersion) {
        const updatedContent = content.replace(apiVersionTagRegex, `$1${apiVersion}$2`);
        await fs.writeFile(file, updatedContent, 'utf-8');
        updatedFiles.push(file);
      }
    }

    this.spinner.stop();

    let projectFileUpdated = false;
    const projectFilePath = path.join(directory, 'sfdx-project.json');

    try {
      const projectFileContent = await fs.readFile(projectFilePath, 'utf-8');
      const projectFileJson = JSON.parse(projectFileContent) as { sourceApiVersion?: string };

      if (projectFileJson.sourceApiVersion !== apiVersion) {
        projectFileJson.sourceApiVersion = apiVersion;
        await fs.writeFile(projectFilePath, `${JSON.stringify(projectFileJson, null, 2)}\n`, 'utf-8');
        projectFileUpdated = true;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.warn(messages.getMessage('warning.projectFileUpdateFailed', [projectFilePath, (error as Error).message]));
      }
    }

    this.info(messages.getMessage('info.complete', [updatedFiles.length, apiVersion]));

    this.table({
      data: [
        { Metric: 'Metadata Files Scanned', Value: String(files.length) },
        { Metric: 'Metadata Files Updated', Value: String(updatedFiles.length) },
        { Metric: 'sfdx-project.json Updated', Value: projectFileUpdated ? 'Yes' : 'No' },
      ],
      columns: [
        { key: 'Metric', name: 'METRIC' },
        { key: 'Value', name: 'VALUE' },
      ],
    });

    return {
      directory,
      apiVersion,
      metadataFilesScanned: files.length,
      updatedFiles,
      projectFileUpdated,
    };
  }
}
