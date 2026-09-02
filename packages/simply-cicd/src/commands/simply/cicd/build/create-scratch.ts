/*
 * Copyright (c) 2026, Clay Chipps.
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
import { createScratchOrg, type ScratchOrgCreateResult } from '../../../../common/build/createScratchOrg.js';
import { getSkipReason } from '../../../../common/build/skipGuard.js';
import { debugFlag, devHubFlags, disabledFlag } from '../../../../common/build/flags.js';
import { logger } from '../../../../common/logger.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.create-scratch');

export type BuildCreateScratchResult = { skipped: boolean; scratchOrg?: ScratchOrgCreateResult };

/** Creates a scratch org, trying each configured Dev Hub in order until one has remaining daily capacity. */
export default class BuildCreateScratch extends SfCommand<BuildCreateScratchResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...devHubFlags,
    ...debugFlag,
    ...disabledFlag,
    'scratch-definition-file': Flags.string({ summary: messages.getMessage('flags.scratch-definition-file.summary') }),
    'scratch-duration-days': Flags.string({
      summary: messages.getMessage('flags.scratch-duration-days.summary'),
      default: '1',
    }),
  };

  public async run(): Promise<BuildCreateScratchResult> {
    const { flags } = await this.parse(BuildCreateScratch);

    const skipReason = getSkipReason('create-scratch');
    if (skipReason) {
      logger.warn(skipReason);
      return { skipped: true };
    }

    if (flags.disabled) {
      logger.warn('create-scratch is disabled. Skipping.');
      return { skipped: true };
    }

    const scratchOrg = await createScratchOrg(
      {
        debug: flags.debug,
        scratchDefinitionFile: flags['scratch-definition-file'],
        scratchDurationDays: flags['scratch-duration-days'],
      },
      flags['dev-hub'],
    );

    return { skipped: false, scratchOrg };
  }
}
