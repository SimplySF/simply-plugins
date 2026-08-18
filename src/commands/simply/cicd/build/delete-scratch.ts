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
import { SfCommand } from '@salesforce/sf-plugins-core';
import { deleteScratchOrg } from '../../../../common/build/deleteScratchOrg.js';
import { parseDevHubs } from '../../../../common/build/devHubs.js';
import { getSkipReason } from '../../../../common/build/skipGuard.js';
import { debugFlag, devHubFlags, disabledFlag, jwtKeyFileFlag } from '../../../../common/build/flags.js';
import { logger } from '../../../../common/logger.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.delete-scratch');

export type BuildDeleteScratchResult = { skipped: boolean };

/** Authenticates to the Dev Hub that owns the scratch org created by `build create-scratch` and deletes it. */
export default class BuildDeleteScratch extends SfCommand<BuildDeleteScratchResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...devHubFlags,
    ...jwtKeyFileFlag,
    ...debugFlag,
    ...disabledFlag,
  };

  public async run(): Promise<BuildDeleteScratchResult> {
    const { flags } = await this.parse(BuildDeleteScratch);

    const skipReason = getSkipReason('delete-scratch');
    if (skipReason) {
      logger.warn(skipReason);
      return { skipped: true };
    }

    if (flags.disabled) {
      logger.warn('delete-scratch is disabled. Skipping.');
      return { skipped: true };
    }

    const devHubs = parseDevHubs(
      flags['dev-hub-name'],
      flags['dev-hub-username'],
      flags['dev-hub-client-id'],
      flags['dev-hub-instance-url'],
    );

    await deleteScratchOrg({ jwtKeyFile: flags['jwt-key-file'], debug: flags.debug }, devHubs);

    return { skipped: false };
  }
}
