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
import { createPackageVersion } from '../../../../common/build/createPackageVersion.js';
import { getSkipReason } from '../../../../common/build/skipGuard.js';
import { debugFlag, disabledFlag, gitOpsFlags, jwtKeyFileFlag, vcsFlags } from '../../../../common/build/flags.js';
import { logger } from '../../../../common/logger.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.create-package-version');

export type BuildCreatePackageVersionResult = { skipped: boolean };

/** Creates a new package version, verifies minimum code coverage, and creates/pushes a version-tracking git tag. */
export default class BuildCreatePackageVersion extends SfCommand<BuildCreatePackageVersionResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...gitOpsFlags,
    ...vcsFlags,
    ...jwtKeyFileFlag,
    ...debugFlag,
    ...disabledFlag,
    'ci-commit-sha': Flags.string({
      summary: messages.getMessage('flags.ci-commit-sha.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_COMMIT_SHA',
    }),
    'ci-pipeline-source': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-source.summary'),
      env: 'SIMPLY_CICD_CI_PIPELINE_SOURCE',
    }),
    'ci-pipeline-url': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-url.summary'),
      required: true,
      env: 'SIMPLY_CICD_CI_PIPELINE_URL',
    }),
    'packaging-devhub-username': Flags.string({
      summary: messages.getMessage('flags.packaging-devhub-username.summary'),
      required: true,
      env: 'SIMPLY_CICD_PACKAGING_DEVHUB_USERNAME',
    }),
    'packaging-devhub-client-id': Flags.string({
      summary: messages.getMessage('flags.packaging-devhub-client-id.summary'),
      required: true,
      env: 'SIMPLY_CICD_PACKAGING_DEVHUB_CLIENT_ID',
    }),
    'packaging-devhub-instance-url': Flags.string({
      summary: messages.getMessage('flags.packaging-devhub-instance-url.summary'),
      required: true,
      env: 'SIMPLY_CICD_PACKAGING_DEVHUB_INSTANCE_URL',
    }),
    'always-create-package': Flags.boolean({
      summary: messages.getMessage('flags.always-create-package.summary'),
      default: false,
    }),
    'code-coverage-minimum': Flags.string({
      summary: messages.getMessage('flags.code-coverage-minimum.summary'),
      default: '75',
    }),
    'package-release-branch-prefix': Flags.string({
      summary: messages.getMessage('flags.package-release-branch-prefix.summary'),
    }),
  };

  public async run(): Promise<BuildCreatePackageVersionResult> {
    const { flags } = await this.parse(BuildCreatePackageVersion);

    const skipReason = getSkipReason('create-package-version');
    if (skipReason) {
      logger.warn(skipReason);
      return { skipped: true };
    }

    if (flags.disabled) {
      logger.warn('create-package-version is disabled. Skipping.');
      return { skipped: true };
    }

    await createPackageVersion({
      ciCommitRefName: flags['ci-commit-ref-name'],
      ciCommitSha: flags['ci-commit-sha'],
      ciPipelineId: flags['ci-pipeline-id'],
      ciPipelineSource: flags['ci-pipeline-source'],
      ciPipelineUrl: flags['ci-pipeline-url'],
      ciProjectPath: flags['ci-project-path'],
      projectAccessToken: flags['project-access-token'],
      packagingDevhubUsername: flags['packaging-devhub-username'],
      packagingDevhubClientId: flags['packaging-devhub-client-id'],
      packagingDevhubInstanceUrl: flags['packaging-devhub-instance-url'],
      jwtKeyFile: flags['jwt-key-file'],
      debug: flags.debug,
      alwaysCreatePackage: flags['always-create-package'],
      packageReleaseBranchPrefix: flags['package-release-branch-prefix'],
      codeCoverageMinimum: flags['code-coverage-minimum'],
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
    });

    return { skipped: false };
  }
}
