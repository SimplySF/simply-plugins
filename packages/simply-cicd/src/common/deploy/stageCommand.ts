/*
 * Copyright (c) 2026, SimplySF.
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
import { Flags } from '@salesforce/sf-plugins-core';
import {
  ciJobTokenFlag,
  debugFlag,
  deployProgressFileFlag,
  deployRulesFileFlag,
  orgAuthFlags,
  startFromFlag,
  testFlags,
  vcsFlags,
} from './flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.deploy');

/**
 * Flags for a "project" deployment stage command.
 *
 * Every one of `deploy-unpackaged`, `post-deploy`, `post-destructive` and `pre-destructive`
 * declares exactly this set — they differ only in which stage name they pass through.
 */
export const projectStageFlags = {
  ...ciJobTokenFlag,
  ...orgAuthFlags,
  ...debugFlag,
  'deploy-config-file': Flags.string({
    summary: messages.getMessage('flags.project-deploy-config-file.summary'),
    default: 'config/deploy.json',
    env: 'SIMPLY_CICD_DEPLOY_CONFIG_FILE',
  }),
  ...deployProgressFileFlag,
  ...deployRulesFileFlag,
  ...startFromFlag,
  ...testFlags,
  ...vcsFlags,
};

/**
 * Flags for a "happy-soup" deployment stage command.
 *
 * The same four stages as {@link projectStageFlags}, plus `--source-branch-name` — and its
 * `--deploy-config-file` has no default, because happy-soup derives one from the branch when it
 * isn't given.
 */
export const happySoupStageFlags = {
  ...ciJobTokenFlag,
  ...orgAuthFlags,
  ...debugFlag,
  'deploy-config-file': Flags.string({
    summary: messages.getMessage('flags.happy-soup-deploy-config-file.summary'),
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
