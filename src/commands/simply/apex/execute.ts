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

import path from 'node:path';
import { ExecuteService } from '@salesforce/apex-node';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-apex', 'simply.apex.execute');

export type ApexExecuteResult = {
  success: boolean;
  compiled: boolean;
  compileProblem: string;
  exceptionMessage: string;
  exceptionStackTrace: string;
  line: number;
  column: number;
  logs?: string;
};

export default class ApexExecute extends SfCommand<ApexExecuteResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'api-version': Flags.orgApiVersion(),
    file: Flags.file({
      summary: messages.getMessage('flags.file.summary'),
      description: messages.getMessage('flags.file.description'),
      char: 'f',
      exists: true,
      required: true,
    }),
    'target-org': Flags.requiredOrg(),
  };

  public async run(): Promise<ApexExecuteResult> {
    const { flags } = await this.parse(ApexExecute);

    const targetOrgConnection = flags['target-org']?.getConnection(flags['api-version']);

    if (!targetOrgConnection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    this.spinner.start(`Executing ${path.parse(flags.file).name}`);

    const executeService = new ExecuteService(targetOrgConnection);
    const response = await executeService.executeAnonymous({ apexFilePath: flags.file });

    const diagnostic = response.diagnostic?.[0];

    const result: ApexExecuteResult = {
      success: response.success,
      compiled: response.compiled,
      compileProblem: diagnostic?.compileProblem ?? '',
      exceptionMessage: diagnostic?.exceptionMessage ?? '',
      exceptionStackTrace: diagnostic?.exceptionStackTrace ?? '',
      line: diagnostic?.lineNumber ?? -1,
      column: diagnostic?.columnNumber ?? -1,
      logs: response.logs,
    };

    if (!response.compiled) {
      this.spinner.stop(messages.getMessage('info.failed'));
      throw messages.createError('error.compileFailed', [result.line, result.column, result.compileProblem]);
    }

    if (!response.success) {
      this.spinner.stop(messages.getMessage('info.failed'));
      throw messages.createError('error.executeFailed', [result.exceptionMessage]);
    }

    this.spinner.stop();

    if (result.logs) {
      this.log(result.logs);
    }

    return result;
  }
}
