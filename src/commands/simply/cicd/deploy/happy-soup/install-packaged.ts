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
import { deployHappySoup } from '../../../../../common/deploy/deployHappySoup.js';
import {
  debugFlag,
  deployProgressFileFlag,
  deployRulesFileFlag,
  orgAuthFlags,
  vcsFlags,
} from '../../../../../common/deploy/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy.happy-soup.install-packaged');

/** Installs packaged dependencies into the target org for a happy-soup deployment. */
export default class DeployHappySoupInstallPackaged extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...orgAuthFlags,
    ...vcsFlags,
    ...debugFlag,
    ...deployProgressFileFlag,
    ...deployRulesFileFlag,
    'install-type': Flags.custom<'All' | 'Delta' | 'Upgrade'>({ options: ['All', 'Delta', 'Upgrade'] })({
      summary: messages.getMessage('flags.install-type.summary'),
      default: 'Upgrade',
    }),
    'packaging-devhub-client-id': Flags.string({
      summary: messages.getMessage('flags.packaging-devhub-client-id.summary'),
      env: 'SIMPLY_CICD_PACKAGING_DEVHUB_CLIENT_ID',
    }),
    'packaging-devhub-instance-url': Flags.string({
      summary: messages.getMessage('flags.packaging-devhub-instance-url.summary'),
      env: 'SIMPLY_CICD_PACKAGING_DEVHUB_INSTANCE_URL',
    }),
    'packaging-devhub-username': Flags.string({
      summary: messages.getMessage('flags.packaging-devhub-username.summary'),
      env: 'SIMPLY_CICD_PACKAGING_DEVHUB_USERNAME',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployHappySoupInstallPackaged);

    await deployHappySoup({
      stage: 'install-packaged',
      alias: flags.alias,
      authUrl: flags['auth-url'],
      clientId: flags['client-id'],
      instanceUrl: flags['instance-url'],
      jwtKeyFile: flags['jwt-key-file'],
      username: flags.username,
      debug: flags.debug,
      deployProgressFile: flags['deploy-progress-file'],
      deployRulesFile: flags['deploy-rules-file'],
      installType: flags['install-type'],
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
      packagingDevhubClientId: flags['packaging-devhub-client-id'],
      packagingDevhubInstanceUrl: flags['packaging-devhub-instance-url'],
      packagingDevhubUsername: flags['packaging-devhub-username'],
    });
  }
}
