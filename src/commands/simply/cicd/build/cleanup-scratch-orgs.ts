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
import { cleanupScratchOrgs } from '../../../../common/build/cleanupScratchOrgs.js';
import { parseDevHubs } from '../../../../common/build/devHubs.js';
import { debugFlag, devHubFlags, disabledFlag, jwtKeyFileFlag } from '../../../../common/build/flags.js';
import { logger } from '../../../../common/logger.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.cleanup-scratch-orgs');

export type BuildCleanupScratchOrgsResult = { skipped: boolean };

/** Deletes scratch orgs older than 3 hours from every configured Dev Hub. */
export default class BuildCleanupScratchOrgs extends SfCommand<BuildCleanupScratchOrgsResult> {
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

  public async run(): Promise<BuildCleanupScratchOrgsResult> {
    const { flags } = await this.parse(BuildCleanupScratchOrgs);

    if (flags.disabled) {
      logger.warn('cleanup-scratch-orgs is disabled. Skipping.');
      return { skipped: true };
    }

    const devHubs = parseDevHubs(
      flags['dev-hub-name'],
      flags['dev-hub-username'],
      flags['dev-hub-client-id'],
      flags['dev-hub-instance-url'],
    );

    await cleanupScratchOrgs({ jwtKeyFile: flags['jwt-key-file'], debug: flags.debug }, devHubs);

    return { skipped: false };
  }
}
