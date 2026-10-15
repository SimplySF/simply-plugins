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
import { listAlmProviderKinds, type AlmProviderKind } from '@simplysf/simply-cicd-core';
import { logger } from '../../../../common/logger.js';
import {
  sendBuildNotification,
  type NotifyBuildOptions,
  type NotifyBuildResult,
} from '../../../../common/notify/buildNotification.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.notify.build');

export type { NotifyBuildResult } from '../../../../common/notify/buildNotification.js';

/** Sends a build job's failure, or its new package version and stories, to Microsoft Teams. */
export default class NotifyBuild extends SfCommand<NotifyBuildResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'ci-commit-ref-name': Flags.string({
      summary: messages.getMessage('flags.ci-commit-ref-name.summary'),
      env: 'SIMPLY_CICD_CI_COMMIT_REF_NAME',
    }),
    'ci-job-name': Flags.string({
      summary: messages.getMessage('flags.ci-job-name.summary'),
      env: 'SIMPLY_CICD_CI_JOB_NAME',
    }),
    'ci-job-stage': Flags.string({
      summary: messages.getMessage('flags.ci-job-stage.summary'),
      env: 'SIMPLY_CICD_CI_JOB_STAGE',
    }),
    'ci-job-status': Flags.string({
      summary: messages.getMessage('flags.ci-job-status.summary'),
      env: 'SIMPLY_CICD_CI_JOB_STATUS',
    }),
    'ci-pipeline-id': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-id.summary'),
      env: 'SIMPLY_CICD_CI_PIPELINE_ID',
    }),
    'ci-pipeline-url': Flags.string({
      summary: messages.getMessage('flags.ci-pipeline-url.summary'),
      env: 'SIMPLY_CICD_CI_PIPELINE_URL',
    }),
    'ci-project-title': Flags.string({
      summary: messages.getMessage('flags.ci-project-title.summary'),
      env: 'SIMPLY_CICD_CI_PROJECT_TITLE',
    }),
    'subscriber-package-version-id': Flags.string({
      summary: messages.getMessage('flags.subscriber-package-version-id.summary'),
      env: 'SIMPLY_CICD_SUBSCRIBER_PACKAGE_VERSION_ID',
    }),
    enabled: Flags.boolean({
      summary: messages.getMessage('flags.enabled.summary'),
      default: false,
      env: 'SIMPLY_CICD_ENABLED',
    }),
    'alm-base-url': Flags.string({
      summary: messages.getMessage('flags.alm-base-url.summary'),
      env: 'SIMPLY_CICD_ALM_BASE_URL',
    }),
    'alm-project-key': Flags.string({
      summary: messages.getMessage('flags.alm-project-key.summary'),
      env: 'SIMPLY_CICD_ALM_PROJECT_KEY',
    }),
    'alm-provider': Flags.custom<AlmProviderKind>({ options: listAlmProviderKinds() })({
      summary: messages.getMessage('flags.alm-provider.summary'),
      default: 'jira',
      env: 'SIMPLY_CICD_ALM_PROVIDER',
    }),
    'teams-webhook-url': Flags.string({
      summary: messages.getMessage('flags.teams-webhook-url.summary'),
      multiple: true,
    }),
    debug: Flags.boolean({
      summary: messages.getMessage('flags.debug.summary'),
      default: false,
      env: 'SIMPLY_CICD_DEBUG',
    }),
  };

  public async run(): Promise<NotifyBuildResult> {
    const { flags } = await this.parse(NotifyBuild);

    logger.raw('\n' + '='.repeat(80));
    logger.info('>>> Sending Teams Notification <<<');
    logger.raw('='.repeat(80) + '\n');

    if (flags.debug) {
      logger.debug('Incoming Parameters:', flags);
    }

    if (!flags.enabled) {
      logger.info('Teams notification is disabled. Skipping.');
      return { sent: false };
    }

    if (!flags['teams-webhook-url'] || flags['teams-webhook-url'].length === 0) {
      throw messages.createError('error.missingTeamsWebhookUrl');
    }

    const options: NotifyBuildOptions = {
      ciCommitRefName: flags['ci-commit-ref-name'],
      ciJobName: flags['ci-job-name'],
      ciJobStage: flags['ci-job-stage'],
      ciJobStatus: flags['ci-job-status'],
      ciPipelineId: flags['ci-pipeline-id'],
      ciPipelineUrl: flags['ci-pipeline-url'],
      ciProjectTitle: flags['ci-project-title'],
      subscriberPackageVersionId: flags['subscriber-package-version-id'],
      almBaseUrl: flags['alm-base-url'],
      almProjectKey: flags['alm-project-key'],
      almProvider: flags['alm-provider'],
      teamsWebhookUrl: flags['teams-webhook-url'],
      debug: flags.debug,
    };

    try {
      const result = await sendBuildNotification(options);

      logger.raw('\n' + '='.repeat(80));
      logger.success(result.sent ? 'Successfully sent notification' : 'No notification needed');
      logger.raw('='.repeat(80) + '\n');

      return result;
    } catch (error) {
      logger.raw('\n' + '='.repeat(80));
      logger.error('Error sending notification');
      logger.raw((error as Error).message);
      logger.raw('='.repeat(80) + '\n');
      throw error;
    }
  }
}
