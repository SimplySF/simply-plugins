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

import fs from 'node:fs';
import { parse } from 'csv-parse';
import PQueue from 'p-queue';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { createCsvFileWriter } from '@simplysf/simply-core';
import { uploadContentVersion } from '../../../../common/contentVersionUtils.js';
import { ContentVersionToUpload } from '../../../../common/contentVersionTypes.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-data', 'simply.data.files.upload');

export default class DataFilesUpload extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'api-version': Flags.orgApiVersion(),
    'file-path': Flags.directory({
      summary: messages.getMessage('flags.file-path.summary'),
      description: messages.getMessage('flags.file-path.description'),
      required: true,
    }),
    'max-parallel-jobs': Flags.integer({
      summary: messages.getMessage('flags.max-parallel-jobs.summary'),
      description: messages.getMessage('flags.max-parallel-jobs.description'),
      default: 1,
    }),
    'target-org': Flags.requiredOrg(),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DataFilesUpload);

    // Authorize to the target org
    const targetOrgConnection = flags['target-org']?.getConnection(flags['api-version']);

    if (!targetOrgConnection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    this.spinner.start('Initializing file upload', '\n', { stdout: true });

    if (!fs.existsSync('upload')) {
      fs.mkdirSync('upload');
    }

    const successWriter = createCsvFileWriter('upload/success.csv', [
      'PathOnClient',
      'Title',
      'FirstPublishLocationId',
      'ContentDocumentId',
    ]);

    const errorWriter = createCsvFileWriter('upload/error.csv', [
      'PathOnClient',
      'Title',
      'FirstPublishLocationId',
      'Error',
    ]);

    this.spinner.stop();

    const fileQueue = new PQueue({ concurrency: flags['max-parallel-jobs'] });

    const parser = fs.createReadStream(flags['file-path']).pipe(parse({ bom: true, columns: true }));

    this.spinner.start('Uploading files', 'Initializing', { stdout: true });

    let count = 0;
    fileQueue.on('add', () => {
      this.spinner.status = `Completed: ${count}. Size: ${fileQueue.size}  Pending: ${fileQueue.pending}`;
    });

    fileQueue.on('completed', () => {
      count++;
      this.spinner.status = `Completed: ${count}. Size: ${fileQueue.size}  Pending: ${fileQueue.pending}`;
    });

    for await (const record of parser) {
      void fileQueue.add(async () => {
        const contentVersionToUpload = record as ContentVersionToUpload;
        try {
          const contentVersion = await uploadContentVersion(
            targetOrgConnection,
            contentVersionToUpload.PathOnClient,
            contentVersionToUpload.Title,
            contentVersionToUpload.FirstPublishLocationId,
          );
          contentVersionToUpload.ContentDocumentId = contentVersion.ContentDocumentId;
          await successWriter.write(contentVersionToUpload);
        } catch (error) {
          contentVersionToUpload.Error = error as string;
          await errorWriter.write(contentVersionToUpload);
        }
      });
    }

    await fileQueue.onIdle();
    await Promise.all([successWriter.end(), errorWriter.end()]);

    this.spinner.stop();
  }
}
