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
import { pushToScratch } from '../../../../common/build/pushScratch.js';
import { getSkipReason } from '../../../../common/build/skipGuard.js';
import { debugFlag, disabledFlag, jwtKeyFileFlag } from '../../../../common/build/flags.js';
import { logger } from '../../../../common/logger.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.push-scratch');

export type BuildPushScratchResult = { skipped: boolean };

/** Pushes source to the scratch org created by `build create-scratch`. */
export default class BuildPushScratch extends SfCommand<BuildPushScratchResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...jwtKeyFileFlag,
    ...debugFlag,
    ...disabledFlag,
    'ignore-warnings': Flags.boolean({ summary: messages.getMessage('flags.ignore-warnings.summary'), default: false }),
    'scratch-org-source-dir': Flags.string({ summary: messages.getMessage('flags.scratch-org-source-dir.summary') }),
  };

  public async run(): Promise<BuildPushScratchResult> {
    const { flags } = await this.parse(BuildPushScratch);

    const skipReason = getSkipReason('push-scratch');
    if (skipReason) {
      logger.warn(skipReason);
      return { skipped: true };
    }

    if (flags.disabled) {
      logger.warn('push-scratch is disabled. Skipping.');
      return { skipped: true };
    }

    await pushToScratch({
      jwtKeyFile: flags['jwt-key-file'],
      debug: flags.debug,
      ignoreWarnings: flags['ignore-warnings'],
      scratchOrgSourceDir: flags['scratch-org-source-dir'],
    });

    return { skipped: false };
  }
}
