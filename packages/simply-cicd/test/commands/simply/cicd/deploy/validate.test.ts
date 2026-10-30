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
import DeployValidate from '../../../../../src/commands/simply/cicd/deploy/validate.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  validateDeployFiles: vi.fn(),
}));

// validateDeployFiles' own behavior (schema checks, missing-file warnings) is tested in
// @simplysf/simply-cicd-core; these tests pin down how the command maps its flags onto it.
describe('deploy validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes both files through', async () => {
    await DeployValidate.run(['--deploy-config-file', 'deploy.json', '--deploy-rules-file', 'deploy-rules.json']);

    expect(validateDeployFiles).toHaveBeenCalledWith({
      deployConfigFile: 'deploy.json',
      deployRulesFile: 'deploy-rules.json',
      sourceBranchName: undefined,
    });
  });

  it('passes --source-branch-name through for config file derivation', async () => {
    await DeployValidate.run(['--source-branch-name', 'feature/my-branch', '--deploy-rules-file', 'deploy-rules.json']);

    expect(validateDeployFiles).toHaveBeenCalledWith({
      deployConfigFile: undefined,
      deployRulesFile: 'deploy-rules.json',
      sourceBranchName: 'feature/my-branch',
    });
  });

  it('passes nothing when no flags are given', async () => {
    await DeployValidate.run([]);

    expect(validateDeployFiles).toHaveBeenCalledWith({
      deployConfigFile: undefined,
      deployRulesFile: undefined,
      sourceBranchName: undefined,
    });
  });

  it('propagates a validation failure', async () => {
    vi.mocked(validateDeployFiles).mockRejectedValue(new Error('Validation failed for deploy.json: bad'));

    await expect(DeployValidate.run(['--deploy-config-file', 'deploy.json'])).rejects.toThrow(
      'Validation failed for deploy.json',
    );
  });
});
