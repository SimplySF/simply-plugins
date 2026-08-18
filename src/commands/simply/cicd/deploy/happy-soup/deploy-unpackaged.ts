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
import { deployHappySoup } from '../../../../../common/deploy/deployHappySoup.js';
import { happySoupStageFlags, toHappySoupStageOptions } from '../../../../../common/deploy/stageCommand.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy.happy-soup.deploy-unpackaged');

/** Runs the deploy-unpackaged stage of a happy-soup deployment. */
export default class DeployHappySoupDeployUnpackaged extends SfCommand<void> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...happySoupStageFlags,
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(DeployHappySoupDeployUnpackaged);

    await deployHappySoup(toHappySoupStageOptions('deploy-unpackaged', flags));
  }
}
