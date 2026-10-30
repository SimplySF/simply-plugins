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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateDeployFiles } from '@simplysf/simply-cicd-core';
import DeployHappySoupValidate from '../../../../../../src/commands/simply/cicd/deploy/happy-soup/validate.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  validateDeployFiles: vi.fn(),
}));

describe('deploy happy-soup validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes --source-branch-name through and defaults the rules file', async () => {
    await DeployHappySoupValidate.run(['--source-branch-name', 'release/uat']);

    expect(validateDeployFiles).toHaveBeenCalledWith({
      deployConfigFile: undefined,
      deployRulesFile: 'config/deploy-rules.json',
      sourceBranchName: 'release/uat',
    });
  });

  it('passes an explicit --deploy-config-file alongside --source-branch-name', async () => {
    await DeployHappySoupValidate.run([
      '--deploy-config-file',
      'deployment-configs/custom.json',
      '--source-branch-name',
      'release/uat',
    ]);

    expect(validateDeployFiles).toHaveBeenCalledWith({
      deployConfigFile: 'deployment-configs/custom.json',
      deployRulesFile: 'config/deploy-rules.json',
      sourceBranchName: 'release/uat',
    });
  });
});
