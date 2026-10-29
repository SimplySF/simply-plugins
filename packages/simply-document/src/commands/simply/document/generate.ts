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

import fs from 'node:fs/promises';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { buildTechnicalDesignDocumentHtml } from '@simplysf/simply-document-core';
import { scanProjectWithSpinner } from '../../../common/scanProject.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-document', 'simply.document.generate');

/** Where the generated document was written, and how many top-level metadata items it covers. */
export type DocumentGenerateResult = {
  outputFile: string;
  componentCount: number;
};

/**
 * Scans a Salesforce project directory for metadata and generates a Confluence-storage-format
 * technical design document covering the data model, security model, groups/queues/permissions,
 * solution inventory, and custom code inventory.
 */
export default class DocumentGenerate extends SfCommand<DocumentGenerateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    directory: Flags.directory({
      summary: messages.getMessage('flags.directory.summary'),
      char: 'd',
      exists: true,
      required: true,
    }),
    'output-file': Flags.string({
      summary: messages.getMessage('flags.output-file.summary'),
      required: true,
    }),
    'template-file': Flags.file({
      summary: messages.getMessage('flags.template-file.summary'),
      description: messages.getMessage('flags.template-file.description'),
      exists: true,
    }),
    'output-format': Flags.custom<'html'>({ options: ['html'] })({
      summary: messages.getMessage('flags.output-format.summary'),
      description: messages.getMessage('flags.output-format.description'),
      default: 'html',
    }),
  };

  /** @returns Where the generated document was written, and how many top-level metadata items it covers. */
  public async run(): Promise<DocumentGenerateResult> {
    const { flags } = await this.parse(DocumentGenerate);

    const customTemplateSource = flags['template-file']
      ? await fs.readFile(flags['template-file'], 'utf-8')
      : undefined;

    const data = await scanProjectWithSpinner(this, flags.directory);

    this.spinner.start(messages.getMessage('info.renderingDocument'));

    let html: string;
    if (flags['output-format'] === 'html') {
      html = buildTechnicalDesignDocumentHtml(data, customTemplateSource);
    } else {
      throw messages.createError('error.unsupportedOutputFormat', [flags['output-format']]);
    }

    await fs.writeFile(flags['output-file'], html, 'utf-8');
    this.spinner.stop();

    this.info(messages.getMessage('info.complete', [flags['output-file']]));

    // Every key of the scanned data is a top-level metadata list.
    const componentCount = Object.values(data).reduce((sum, items) => sum + items.length, 0);

    return {
      outputFile: flags['output-file'],
      componentCount,
    };
  }
}
