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

import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { runScratchApexTests } from '../../../../common/build/testScratch.js';
import { getSkipReason } from '../../../../common/build/skipGuard.js';
import { debugFlag, disabledFlag, jwtKeyFileFlag } from '../../../../common/build/flags.js';
import { logger } from '../../../../common/logger.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.test-scratch');

export type BuildTestScratchResult = { skipped: boolean };

/** Authenticates to the scratch org created by `build create-scratch` and runs its Apex tests. */
export default class BuildTestScratch extends SfCommand<BuildTestScratchResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...jwtKeyFileFlag,
    ...debugFlag,
    ...disabledFlag,
    'disable-apex-tests': Flags.boolean({
      summary: messages.getMessage('flags.disable-apex-tests.summary'),
      default: false,
    }),
  };

  public async run(): Promise<BuildTestScratchResult> {
    const { flags } = await this.parse(BuildTestScratch);

    const skipReason = getSkipReason('test-scratch');
    if (skipReason) {
      logger.warn(skipReason);
      return { skipped: true };
    }

    if (flags.disabled) {
      logger.warn('test-scratch is disabled. Skipping.');
      return { skipped: true };
    }

    await runScratchApexTests({
      jwtKeyFile: flags['jwt-key-file'],
      debug: flags.debug,
      disableApexTests: flags['disable-apex-tests'],
    });

    return { skipped: false };
  }
}
