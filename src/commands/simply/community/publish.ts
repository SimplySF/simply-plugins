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

import { Duration } from '@salesforce/kit';
import { Messages, PollingClient } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';
import { escapeSoqlLiteral } from '@simplysf/simply-core';
import { checkPublishStatus } from '../../../common/checkPublishStatus.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-community', 'simply.community.publish');

/** The fields this needs from the `Network` record identified by `--name`. */
type NetworkRecord = { Id: string; Name: string };

/** The response shape of `POST /connect/communities/{id}/publish`. */
type CommunityPublishResponse = { id: string; jobId: string; name: string; url: string };

export type CommunityPublishResult = { id: string; name: string; url: string };

/** Publishes a Salesforce Community (Experience Cloud site), waiting until the publish completes. */
export default class CommunityPublish extends SfCommand<CommunityPublishResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    name: Flags.string({ summary: messages.getMessage('flags.name.summary'), required: true }),
    wait: Flags.string({ summary: messages.getMessage('flags.wait.summary'), default: '15' }),
  };

  public async run(): Promise<CommunityPublishResult> {
    const { flags } = await this.parse(CommunityPublish);
    const connection = requireConnection(flags);

    const network = await connection.singleRecordQuery<NetworkRecord>(
      `SELECT Id, Name FROM Network WHERE Name = '${escapeSoqlLiteral(flags.name)}'`,
    );

    this.spinner.start(messages.getMessage('info.publishing', [network.Name]));
    const publishResponse = await connection.request<CommunityPublishResponse>({
      method: 'POST',
      url: `/connect/communities/${network.Id}/publish`,
    });

    const client = await PollingClient.create({
      poll: checkPublishStatus(connection, publishResponse.jobId),
      frequency: Duration.seconds(15),
      timeout: Duration.minutes(Number(flags.wait)),
      timeoutErrorName: 'CommunityPublishTimeoutError',
    });
    await client.subscribe();
    this.spinner.stop();

    this.info(messages.getMessage('info.published', [network.Name]));

    return { id: publishResponse.id, name: publishResponse.name, url: publishResponse.url };
  }
}
