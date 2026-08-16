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
import { logger } from '../../../../common/logger.js';
import { sendNotification } from '../../../../common/notify/sendNotification.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.notify.teams');

export type NotifyTeamsResult = { sent: boolean };

/** Sends a serialized JSON payload as-is to one or more Microsoft Teams incoming webhooks. */
export default class NotifyTeams extends SfCommand<NotifyTeamsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    payload: Flags.string({
      summary: messages.getMessage('flags.payload.summary'),
      required: true,
    }),
    'webhook-url': Flags.string({
      summary: messages.getMessage('flags.webhook-url.summary'),
      required: true,
    }),
    enabled: Flags.boolean({
      summary: messages.getMessage('flags.enabled.summary'),
      default: false,
    }),
    debug: Flags.boolean({
      summary: messages.getMessage('flags.debug.summary'),
      default: false,
    }),
  };

  public async run(): Promise<NotifyTeamsResult> {
    const { flags } = await this.parse(NotifyTeams);

    logger.raw('\n' + '='.repeat(80));
    logger.info('>>> Sending Teams Notification <<<');
    logger.raw('='.repeat(80) + '\n');

    if (flags.debug) {
      logger.debug('Incoming Parameters:', flags);
    }

    if (!flags.enabled) {
      logger.info('Teams notification is disabled. Skipping.');
      return { sent: false };
    }

    try {
      await sendNotification(flags['webhook-url'], flags.payload);

      logger.raw('\n' + '='.repeat(80));
      logger.success('Successfully sent notification');
      logger.raw('='.repeat(80) + '\n');

      return { sent: true };
    } catch (error) {
      logger.raw('\n' + '='.repeat(80));
      logger.error('Error sending notification');
      logger.raw((error as Error).message);
      logger.raw('='.repeat(80) + '\n');
      throw error;
    }
  }
}
