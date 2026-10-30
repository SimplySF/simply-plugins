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
import DeployProjectValidate from '../../../../../../src/commands/simply/cicd/deploy/project/validate.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  validateDeployFiles: vi.fn(),
}));

describe('deploy project validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to config/deploy.json and leaves deploy-rules-file unset', async () => {
    await DeployProjectValidate.run([]);

    expect(validateDeployFiles).toHaveBeenCalledWith({
      deployConfigFile: 'config/deploy.json',
      deployRulesFile: undefined,
    });
  });

  it('passes an explicit --deploy-rules-file through', async () => {
    await DeployProjectValidate.run(['--deploy-rules-file', 'config/deploy-rules.json']);

    expect(validateDeployFiles).toHaveBeenCalledWith({
      deployConfigFile: 'config/deploy.json',
      deployRulesFile: 'config/deploy-rules.json',
    });
  });
});
