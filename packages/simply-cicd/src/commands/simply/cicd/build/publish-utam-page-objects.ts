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
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import {
  publishUtamPageObjects,
  type NpmAccess,
  type PublishUtamPageObjectsResult,
} from '../../../../common/build/publishUtamPageObjects.js';
import { debugFlag, disabledFlag } from '../../../../common/build/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.publish-utam-page-objects');

/** Compiles the project's UTAM page objects for a package version and publishes them to an npm registry. */
export default class BuildPublishUtamPageObjects extends SfCommand<PublishUtamPageObjectsResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...debugFlag,
    ...disabledFlag,
    'packaging-devhub': Flags.string({
      summary: messages.getMessage('flags.packaging-devhub.summary'),
      required: true,
      env: 'SIMPLY_CICD_PACKAGING_DEVHUB',
    }),
    'subscriber-package-version-id': Flags.string({
      summary: messages.getMessage('flags.subscriber-package-version-id.summary'),
    }),
    'npm-package-name': Flags.string({
      summary: messages.getMessage('flags.npm-package-name.summary'),
      env: 'SIMPLY_CICD_NPM_PACKAGE_NAME',
    }),
    'npm-registry': Flags.string({
      summary: messages.getMessage('flags.npm-registry.summary'),
      env: 'SIMPLY_CICD_NPM_REGISTRY',
    }),
    'npm-token': Flags.string({
      summary: messages.getMessage('flags.npm-token.summary'),
      env: 'SIMPLY_CICD_NPM_TOKEN',
    }),
    'npm-access': Flags.custom<NpmAccess>({ options: ['public', 'restricted'] })({
      summary: messages.getMessage('flags.npm-access.summary'),
      env: 'SIMPLY_CICD_NPM_ACCESS',
    }),
    'npm-dist-tag': Flags.string({
      summary: messages.getMessage('flags.npm-dist-tag.summary'),
    }),
    'ci-commit-ref-name': Flags.string({
      summary: messages.getMessage('flags.ci-commit-ref-name.summary'),
      env: 'SIMPLY_CICD_CI_COMMIT_REF_NAME',
    }),
    'package-release-branch-prefix': Flags.string({
      summary: messages.getMessage('flags.package-release-branch-prefix.summary'),
    }),
    'utam-version': Flags.string({
      summary: messages.getMessage('flags.utam-version.summary'),
      default: '^3',
      env: 'SIMPLY_CICD_UTAM_VERSION',
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      default: false,
    }),
    out: Flags.string({
      summary: messages.getMessage('flags.out.summary'),
      default: 'subscriberPackageVersionId.env',
    }),
    'env-file': Flags.string({
      summary: messages.getMessage('flags.env-file.summary'),
      default: 'subscriberPackageVersionId.env',
    }),
  };

  public async run(): Promise<PublishUtamPageObjectsResult> {
    const { flags } = await this.parse(BuildPublishUtamPageObjects);

    return publishUtamPageObjects({
      packagingDevhub: flags['packaging-devhub'],
      subscriberPackageVersionId: flags['subscriber-package-version-id'],
      npmPackageName: flags['npm-package-name'],
      npmRegistry: flags['npm-registry'],
      npmToken: flags['npm-token'],
      npmAccess: flags['npm-access'],
      npmDistTag: flags['npm-dist-tag'],
      ciCommitRefName: flags['ci-commit-ref-name'],
      packageReleaseBranchPrefix: flags['package-release-branch-prefix'],
      utamVersion: flags['utam-version'],
      dryRun: flags['dry-run'],
      out: flags.out,
      envFile: flags['env-file'],
      debug: flags.debug,
      disabled: flags.disabled,
    });
  }
}
