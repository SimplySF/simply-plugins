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
import { logger } from '../../../../common/logger.js';
import { renderNotifyTemplate } from '../../../../common/notify/renderTemplate.js';
import { sendNotification } from '../../../../common/notify/sendNotification.js';
import type { NotifyTemplateName } from '../../../../common/notify/templates.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.notify.happy-soup');

export type NotifyHappySoupResult = { sent: boolean };

type NotifyHappySoupOptions = {
  ciCommitRefName?: string;
  ciEnvironmentName?: string;
  ciJobName?: string;
  ciJobStage?: string;
  ciJobStatus?: string;
  ciPipelineId?: string;
  ciPipelineUrl?: string;
  teamsWebhookUrl?: string[];
  notifyOnCompletion: boolean;
};

/** Sends a happy-soup deployment stage notification to Microsoft Teams. */
export default class NotifyHappySoup extends SfCommand<NotifyHappySoupResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'after-script': Flags.boolean({ summary: messages.getMessage('flags.after-script.summary') }),
    'before-script': Flags.boolean({ summary: messages.getMessage('flags.before-script.summary') }),
    'ci-commit-ref-name': Flags.string({
      summary: messages.getMessage('flags.ci-commit-ref-name.summary'),
      env: 'SIMPLY_CICD_CI_COMMIT_REF_NAME',
    }),
    'ci-environment-name': Flags.string({
      summary: messages.getMessage('flags.ci-environment-name.summary'),
      env: 'SIMPLY_CICD_CI_ENVIRONMENT_NAME',
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
    enabled: Flags.boolean({
      summary: messages.getMessage('flags.enabled.summary'),
      default: false,
      env: 'SIMPLY_CICD_ENABLED',
    }),
    'teams-webhook-url': Flags.string({
      summary: messages.getMessage('flags.teams-webhook-url.summary'),
      multiple: true,
    }),
    'notify-on-completion': Flags.boolean({
      summary: messages.getMessage('flags.notify-on-completion.summary'),
      default: false,
    }),
    'is-final-job': Flags.boolean({ summary: messages.getMessage('flags.is-final-job.summary'), default: false }),
    debug: Flags.boolean({
      summary: messages.getMessage('flags.debug.summary'),
      default: false,
      env: 'SIMPLY_CICD_DEBUG',
    }),
  };

  /** Posts a "starting stage" card to Teams. */
  private static async beforeScript(options: NotifyHappySoupOptions): Promise<NotifyHappySoupResult> {
    const stage = options.ciJobStage ?? 'N/A';
    const templateData = {
      stage,
      environmentName: options.ciEnvironmentName ?? 'N/A',
      refName: options.ciCommitRefName ?? 'N/A',
      pipelineUrl: options.ciPipelineUrl ?? '#',
      pipelineId: options.ciPipelineId ?? 'N/A',
    };

    const message = renderNotifyTemplate('happy-soup-starting-stage-notification', templateData);

    const payload = {
      content: message,
      environmentName: options.ciEnvironmentName,
      refName: options.ciCommitRefName,
      pipelineId: options.ciPipelineId,
      pipelineUrl: options.ciPipelineUrl,
      jobName: options.ciJobName,
      jobStage: stage,
      jobStatus: options.ciJobStatus ?? 'running',
    };

    await sendNotification(options.teamsWebhookUrl, payload);
    return { sent: true };
  }

  /** Posts a stage (or final) success/failure card to Teams, depending on `--notify-on-completion`. */
  private static async afterScript(options: NotifyHappySoupOptions): Promise<NotifyHappySoupResult> {
    const stage = options.ciJobStage ?? 'N/A';
    const templateData = {
      stage,
      environmentName: options.ciEnvironmentName ?? 'N/A',
      refName: options.ciCommitRefName ?? 'N/A',
      pipelineUrl: options.ciPipelineUrl ?? '#',
      pipelineId: options.ciPipelineId ?? 'N/A',
    };

    const failed = options.ciJobStatus === 'failed';
    const templateName: NotifyTemplateName = options.notifyOnCompletion
      ? failed
        ? 'happy-soup-final-failure-notification'
        : 'happy-soup-final-success-notification'
      : failed
        ? 'happy-soup-failure-notification'
        : 'happy-soup-success-notification';

    const message = renderNotifyTemplate(templateName, templateData);

    const payload = {
      content: message,
      environmentName: options.ciEnvironmentName,
      refName: options.ciCommitRefName,
      pipelineId: options.ciPipelineId,
      pipelineUrl: options.ciPipelineUrl,
      jobName: options.ciJobName,
      jobStage: options.ciJobStage,
      jobStatus: options.ciJobStatus,
    };

    await sendNotification(options.teamsWebhookUrl, payload);
    return { sent: true };
  }

  public async run(): Promise<NotifyHappySoupResult> {
    const { flags } = await this.parse(NotifyHappySoup);

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

    const options: NotifyHappySoupOptions = {
      ciCommitRefName: flags['ci-commit-ref-name'],
      ciEnvironmentName: flags['ci-environment-name'],
      ciJobName: flags['ci-job-name'],
      ciJobStage: flags['ci-job-stage'],
      ciJobStatus: flags['ci-job-status'],
      ciPipelineId: flags['ci-pipeline-id'],
      ciPipelineUrl: flags['ci-pipeline-url'],
      teamsWebhookUrl: flags['teams-webhook-url'],
      notifyOnCompletion: flags['notify-on-completion'],
    };

    try {
      let result: NotifyHappySoupResult;

      if (flags['notify-on-completion']) {
        if (flags['is-final-job'] && flags['after-script']) {
          result = await NotifyHappySoup.afterScript(options);
        } else {
          logger.info('Skipping intermediate happy soup notification because --notify-on-completion is enabled.');
          result = { sent: false };
        }
      } else if (flags['before-script']) {
        result = await NotifyHappySoup.beforeScript(options);
      } else if (flags['after-script']) {
        result = await NotifyHappySoup.afterScript(options);
      } else {
        throw messages.createError('error.missingScriptFlag');
      }

      logger.raw('\n' + '='.repeat(80));
      logger.success('Successfully sent notification');
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
