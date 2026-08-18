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
import { deployProject } from '../../../../../common/deploy/deployProject.js';
import {
  ciJobTokenFlag,
  debugFlag,
  deployProgressFileFlag,
  deployRulesFileFlag,
  orgAuthFlags,
  vcsFlags,
} from '../../../../../common/deploy/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy.project.install-packaged');

/** Installs packaged dependencies and the project's own package into the target org. */
export default class DeployProjectInstallPackaged extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...ciJobTokenFlag,
    ...orgAuthFlags,
    ...vcsFlags,
    ...debugFlag,
    'deploy-config-file': Flags.string({
      summary: messages.getMessage('flags.deploy-config-file.summary'),
      default: 'config/deploy.json',
      env: 'SIMPLY_CICD_DEPLOY_CONFIG_FILE',
    }),
    ...deployProgressFileFlag,
    ...deployRulesFileFlag,
    'subscriber-package-version-id': Flags.string({
      summary: messages.getMessage('flags.subscriber-package-version-id.summary'),
    }),
    'install-type': Flags.custom<'All' | 'Delta' | 'Upgrade'>({ options: ['All', 'Delta', 'Upgrade'] })({
      summary: messages.getMessage('flags.install-type.summary'),
      default: 'Upgrade',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployProjectInstallPackaged);

    await deployProject({
      stage: 'install-packaged',
      ciJobToken: flags['ci-job-token'],
      alias: flags.alias,
      authUrl: flags['auth-url'],
      clientId: flags['client-id'],
      instanceUrl: flags['instance-url'],
      jwtKeyFile: flags['jwt-key-file'],
      username: flags.username,
      debug: flags.debug,
      deployConfigFile: flags['deploy-config-file'],
      deployProgressFile: flags['deploy-progress-file'],
      deployRulesFile: flags['deploy-rules-file'],
      subscriberPackageVersionId: flags['subscriber-package-version-id'],
      installType: flags['install-type'],
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
    });
  }
}
