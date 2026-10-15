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
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { generateService } from '@simplysf/simply-aep-core';
import { runGeneration, type GenerateCommandResult } from '../../../../common/generate/runGeneration.js';
import { flavorFlags, generateWriteFlags, optionalOrgFlags } from '../../../../common/generate/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-aep', 'simply.aep.generate.service');

/** Generates a service facade, interface, implementation, exception, and test, and (at4dx) its binding. */
export default class AepGenerateService extends SfCommand<GenerateCommandResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...optionalOrgFlags,
    'service-basename': Flags.string({
      summary: messages.getMessage('flags.service-basename.summary'),
      required: true,
    }),
    ...flavorFlags,
    ...generateWriteFlags,
  };

  public async run(): Promise<GenerateCommandResult> {
    const { flags } = await this.parse(AepGenerateService);
    // An explicit --api-version is all an org would have been used for, so don't connect.
    const connection = flags['api-version'] ? undefined : flags['target-org']?.getConnection(flags['api-version']);
    return runGeneration(generateService, connection, flags, this);
  }
}
