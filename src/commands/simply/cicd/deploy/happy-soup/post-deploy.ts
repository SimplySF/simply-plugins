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
import { deployHappySoup } from '../../../../../common/deploy/deployHappySoup.js';
import {
  ciJobTokenFlag,
  debugFlag,
  deployProgressFileFlag,
  deployRulesFileFlag,
  orgAuthFlags,
  startFromFlag,
  testFlags,
  vcsFlags,
} from '../../../../../common/deploy/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy.happy-soup.post-deploy');

/** Runs the post-deploy stage of a happy-soup deployment. */
export default class DeployHappySoupPostDeploy extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...ciJobTokenFlag,
    ...orgAuthFlags,
    ...debugFlag,
    'deploy-config-file': Flags.string({
      summary: messages.getMessage('flags.deploy-config-file.summary'),
      env: 'SIMPLY_CICD_DEPLOY_CONFIG_FILE',
    }),
    ...deployProgressFileFlag,
    ...deployRulesFileFlag,
    'source-branch-name': Flags.string({
      summary: messages.getMessage('flags.source-branch-name.summary'),
      env: 'SIMPLY_CICD_SOURCE_BRANCH_NAME',
    }),
    ...startFromFlag,
    ...testFlags,
    ...vcsFlags,
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployHappySoupPostDeploy);

    await deployHappySoup({
      stage: 'post-deploy',
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
      sourceBranchName: flags['source-branch-name'],
      startFrom: flags['start-from'],
      testLevel: flags['test-level'],
      tests: flags.tests,
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
    });
  }
}
