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
import { validateDeployFiles } from '../../../../common/deploy/validate.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy.validate');

/** Validates deployment configuration files against their JSON schemas. */
export default class DeployValidate extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'deploy-config-file': Flags.string({
      summary: messages.getMessage('flags.deploy-config-file.summary'),
      env: 'SIMPLY_CICD_DEPLOY_CONFIG_FILE',
    }),
    'deploy-rules-file': Flags.string({
      summary: messages.getMessage('flags.deploy-rules-file.summary'),
      env: 'SIMPLY_CICD_DEPLOY_RULES_FILE',
    }),
    'source-branch-name': Flags.string({
      summary: messages.getMessage('flags.source-branch-name.summary'),
      env: 'SIMPLY_CICD_SOURCE_BRANCH_NAME',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployValidate);

    await validateDeployFiles({
      deployConfigFile: flags['deploy-config-file'],
      deployRulesFile: flags['deploy-rules-file'],
      sourceBranchName: flags['source-branch-name'],
    });
  }
}
