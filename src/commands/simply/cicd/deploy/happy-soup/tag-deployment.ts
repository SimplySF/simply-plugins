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
  debugFlag,
  deployProgressFileFlag,
  deployRulesFileFlag,
  orgAuthFlags,
  vcsFlags,
} from '../../../../../common/deploy/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy.happy-soup.tag-deployment');

/** Tags the current commit with details about a happy-soup deployment. */
export default class DeployHappySoupTagDeployment extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'ci-merge-request-iid': Flags.string({
      summary: messages.getMessage('flags.ci-merge-request-iid.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_MERGE_REQUEST_IID',
    }),
    'ci-merge-request-project-url': Flags.string({
      summary: messages.getMessage('flags.ci-merge-request-project-url.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_MERGE_REQUEST_PROJECT_URL',
    }),
    'ci-pipeline-id': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-id.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_PIPELINE_ID',
    }),
    'ci-pipeline-url': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-url.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_PIPELINE_URL',
    }),
    'ci-project-path': Flags.string({
      summary: messages.getMessage('flags.ci-project-path.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_PROJECT_PATH',
    }),
    'project-access-token': Flags.string({
      summary: messages.getMessage('flags.project-access-token.summary'),
      required: true,
      env: 'SIMPLY_CICD_PROJECT_ACCESS_TOKEN',
    }),
    ...orgAuthFlags,
    ...debugFlag,
    ...deployProgressFileFlag,
    ...deployRulesFileFlag,
    ...vcsFlags,
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployHappySoupTagDeployment);

    await deployHappySoup({
      stage: 'tag-deployment',
      alias: flags.alias,
      authUrl: flags['auth-url'],
      clientId: flags['client-id'],
      instanceUrl: flags['instance-url'],
      jwtKeyFile: flags['jwt-key-file'],
      username: flags.username,
      debug: flags.debug,
      deployProgressFile: flags['deploy-progress-file'],
      deployRulesFile: flags['deploy-rules-file'],
      projectAccessToken: flags['project-access-token'],
      ciPipelineId: flags['ci-pipeline-id'],
      ciProjectPath: flags['ci-project-path'],
      ciPipelineUrl: flags['ci-pipeline-url'],
      ciMergeRequestProjectUrl: flags['ci-merge-request-project-url'],
      ciMergeRequestIid: flags['ci-merge-request-iid'],
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
    });
  }
}
