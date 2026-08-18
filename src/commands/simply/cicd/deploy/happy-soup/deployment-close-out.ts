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
  vcsFlags,
} from '../../../../../common/deploy/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy.happy-soup.deployment-close-out');

/** Archives (or removes an obsolete) deployment config file used for a happy-soup deployment. */
export default class DeployHappySoupDeploymentCloseOut extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'ci-commit-ref-name': Flags.string({
      summary: messages.getMessage('flags.ci-commit-ref-name.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_COMMIT_REF_NAME',
    }),
    'ci-pipeline-id': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-id.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_PIPELINE_ID',
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
    ...debugFlag,
    'deploy-config-file': Flags.string({
      summary: messages.getMessage('flags.deploy-config-file.summary'),
      env: 'SIMPLY_CICD_DEPLOY_CONFIG_FILE',
    }),
    ...deployProgressFileFlag,
    ...deployRulesFileFlag,
    'deploy-release-date': Flags.string({ summary: messages.getMessage('flags.deploy-release-date.summary') }),
    'source-branch-name': Flags.string({
      summary: messages.getMessage('flags.source-branch-name.summary'),
      env: 'SIMPLY_CICD_SOURCE_BRANCH_NAME',
    }),
    ...vcsFlags,
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployHappySoupDeploymentCloseOut);

    await deployHappySoup({
      stage: 'deployment-close-out',
      debug: flags.debug,
      deployConfigFile: flags['deploy-config-file'],
      deployProgressFile: flags['deploy-progress-file'],
      deployRulesFile: flags['deploy-rules-file'],
      deployReleaseDate: flags['deploy-release-date'],
      sourceBranchName: flags['source-branch-name'],
      projectAccessToken: flags['project-access-token'],
      ciPipelineId: flags['ci-pipeline-id'],
      ciProjectPath: flags['ci-project-path'],
      ciCommitRefName: flags['ci-commit-ref-name'],
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
    });
  }
}
