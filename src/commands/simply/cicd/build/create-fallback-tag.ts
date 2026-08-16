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
import { createFallbackTag, type CreateFallbackTagResult } from '../../../../common/build/createFallbackTag.js';
import { getSkipReason } from '../../../../common/build/skipGuard.js';
import { debugFlag, disabledFlag, gitOpsFlags, vcsFlags } from '../../../../common/build/flags.js';
import { logger } from '../../../../common/logger.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.create-fallback-tag');

export type BuildCreateFallbackTagResult = { skipped: boolean } & Partial<CreateFallbackTagResult>;

/** Creates a fallback git tag carrying forward the previous package version's ID, for builds that didn't produce a new one. */
export default class BuildCreateFallbackTag extends SfCommand<BuildCreateFallbackTagResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...gitOpsFlags,
    ...vcsFlags,
    ...debugFlag,
    ...disabledFlag,
    'last-tag': Flags.string({ summary: messages.getMessage('flags.last-tag.summary') }),
    out: Flags.string({ summary: messages.getMessage('flags.out.summary'), default: 'subscriberPackageVersionId.env' }),
  };

  public async run(): Promise<BuildCreateFallbackTagResult> {
    const { flags } = await this.parse(BuildCreateFallbackTag);

    const skipReason = getSkipReason('create-fallback-tag');
    if (skipReason) {
      logger.warn(skipReason);
      return { skipped: true };
    }

    if (flags.disabled) {
      logger.warn('create-fallback-tag is disabled. Skipping.');
      return { skipped: true };
    }

    const result = await createFallbackTag({
      ciCommitRefName: flags['ci-commit-ref-name'],
      ciProjectPath: flags['ci-project-path'],
      projectAccessToken: flags['project-access-token'],
      ciPipelineId: flags['ci-pipeline-id'],
      lastTag: flags['last-tag'],
      out: flags.out,
      debug: flags.debug,
      vcsHost: flags['vcs-host'],
      vcsProvider: flags['vcs-provider'],
    });

    return { skipped: false, ...result };
  }
}
