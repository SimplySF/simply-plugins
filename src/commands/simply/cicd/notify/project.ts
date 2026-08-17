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

import { promises as fs } from 'node:fs';
import { execa } from 'execa';
import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { getDefaultPackageDirectory, isSubscriberPackageVersionId, readSfdxProject } from '@simplysf/simply-core';
import { runSf, runSfJson } from '../../../../common/exec/sfCli.js';
import { logger } from '../../../../common/logger.js';
import { appendToEnvFile } from '../../../../common/env.js';
import { authenticateOrg } from '../../../../common/sfAuth.js';
import { getCommitStories } from '../../../../common/notify/getCommitStories.js';
import { renderNotifyTemplate } from '../../../../common/notify/renderTemplate.js';
import { sendNotification } from '../../../../common/notify/sendNotification.js';
import type { NotifyTemplateName } from '../../../../common/notify/templates.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.notify.project');

export type NotifyProjectResult = { sent: boolean };

type PrevInstalledPackageVersionParams = {
  alias?: string;
  username?: string;
  jwtKeyFile?: string;
  clientId?: string;
  instanceUrl?: string;
  debug: boolean;
};

type TargetPackageVersionParams = {
  devhubToolingUsername?: string;
  jwtKeyFile?: string;
  devhubToolingClientId?: string;
  devhubToolingInstanceUrl?: string;
  subscriberPackageVersionId?: string;
  debug: boolean;
};

type NotifyProjectOptions = {
  alias?: string;
  ciCommitRefName?: string;
  ciEnvironmentName?: string;
  ciJobName?: string;
  ciJobStage?: string;
  ciJobStatus?: string;
  ciPipelineId?: string;
  ciPipelineUrl?: string;
  ciProjectTitle?: string;
  clientId?: string;
  devhubToolingClientId?: string;
  devhubToolingInstanceUrl?: string;
  devhubToolingUsername?: string;
  instanceUrl?: string;
  jiraBaseUrl?: string;
  jiraProjectKey?: string;
  jwtKeyFile?: string;
  prevInstalledPackageVersion?: string;
  subscriberPackageVersionId?: string;
  targetPackageVersion?: string;
  teamsWebhookUrl?: string[];
  username?: string;
  debug: boolean;
};

/** Sends a project deployment notification to Microsoft Teams, with Jira story integration. */
export default class NotifyProject extends SfCommand<NotifyProjectResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'after-script': Flags.boolean({ summary: messages.getMessage('flags.after-script.summary') }),
    alias: Flags.string({ summary: messages.getMessage('flags.alias.summary'), env: 'SIMPLY_CICD_ALIAS' }),
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
    'ci-project-title': Flags.string({
      summary: messages.getMessage('flags.ci-project-title.summary'),
      env: 'SIMPLY_CICD_CI_PROJECT_TITLE',
    }),
    'client-id': Flags.string({
      summary: messages.getMessage('flags.client-id.summary'),
      env: 'SIMPLY_CICD_CLIENT_ID',
    }),
    'devhub-tooling-client-id': Flags.string({
      summary: messages.getMessage('flags.devhub-tooling-client-id.summary'),
      env: 'SIMPLY_CICD_DEVHUB_TOOLING_CLIENT_ID',
    }),
    'devhub-tooling-instance-url': Flags.string({
      summary: messages.getMessage('flags.devhub-tooling-instance-url.summary'),
      env: 'SIMPLY_CICD_DEVHUB_TOOLING_INSTANCE_URL',
    }),
    'devhub-tooling-username': Flags.string({
      summary: messages.getMessage('flags.devhub-tooling-username.summary'),
      env: 'SIMPLY_CICD_DEVHUB_TOOLING_USERNAME',
    }),
    enabled: Flags.boolean({
      summary: messages.getMessage('flags.enabled.summary'),
      default: false,
      env: 'SIMPLY_CICD_ENABLED',
    }),
    'instance-url': Flags.string({
      summary: messages.getMessage('flags.instance-url.summary'),
      env: 'SIMPLY_CICD_INSTANCE_URL',
    }),
    'jira-base-url': Flags.string({
      summary: messages.getMessage('flags.jira-base-url.summary'),
      env: 'SIMPLY_CICD_JIRA_BASE_URL',
    }),
    'jira-project-key': Flags.string({
      summary: messages.getMessage('flags.jira-project-key.summary'),
      env: 'SIMPLY_CICD_JIRA_PROJECT_KEY',
    }),
    'jwt-key-file': Flags.string({
      summary: messages.getMessage('flags.jwt-key-file.summary'),
      env: 'SIMPLY_CICD_JWT_KEY_FILE',
    }),
    'prev-installed-package-version': Flags.string({
      summary: messages.getMessage('flags.prev-installed-package-version.summary'),
    }),
    'subscriber-package-version-id': Flags.string({
      summary: messages.getMessage('flags.subscriber-package-version-id.summary'),
    }),
    'target-package-version': Flags.string({ summary: messages.getMessage('flags.target-package-version.summary') }),
    'teams-webhook-url': Flags.string({
      summary: messages.getMessage('flags.teams-webhook-url.summary'),
      multiple: true,
    }),
    username: Flags.string({ summary: messages.getMessage('flags.username.summary'), env: 'SIMPLY_CICD_USERNAME' }),
    debug: Flags.boolean({
      summary: messages.getMessage('flags.debug.summary'),
      default: false,
      env: 'SIMPLY_CICD_DEBUG',
    }),
  };

  /** Authenticates to the target org (JWT, via execa — no shell interpolation) and queries the installed package version. */
  private static async resolvePrevInstalledPackageVersion(params: PrevInstalledPackageVersionParams): Promise<string> {
    const { alias, username, jwtKeyFile, clientId, instanceUrl, debug } = params;
    if (!(username && jwtKeyFile && clientId && instanceUrl && alias)) {
      logger.warn('Missing credentials for Salesforce org authentication. Skipping installed package version check.');
      return 'N/A';
    }

    logger.info('Authenticating to Salesforce org...');
    try {
      const authResult = await authenticateOrg({ username, jwtKeyFile, clientId, instanceUrl, alias });
      if (!authResult.success) {
        logger.warn(`Sandbox Auth failed: ${authResult.message ?? 'unknown error'}`);
        return 'N/A';
      }

      logger.success('Sandbox Auth successful.');

      const packageName = getDefaultPackageDirectory(await readSfdxProject())?.package;

      logger.info(`Get installed package version from alias ${alias} for package ${packageName ?? 'unknown'}...`);
      const installedList = await runSfJson<{
        result: Array<{ SubscriberPackageName?: string; SubscriberPackageVersionNumber?: string }>;
      }>(['package', 'installed', 'list', '--target-org', alias, '--json']);
      const pkg = installedList.result.find((p) => p.SubscriberPackageName === packageName);
      return pkg?.SubscriberPackageVersionNumber ? `v${pkg.SubscriberPackageVersionNumber}` : 'N/A';
    } catch (error) {
      logger.warn(`Sandbox Auth command failed: ${(error as Error).message}`);
      if (debug) {
        logger.error(String(error));
      }
      return 'N/A';
    }
  }

  /** Authenticates to the tooling DevHub and resolves the released package's version. Returns `undefined` on any failure. */
  private static async resolveTargetPackageVersionFromDevHub(
    params: TargetPackageVersionParams,
  ): Promise<string | undefined> {
    const {
      devhubToolingUsername,
      jwtKeyFile,
      devhubToolingClientId,
      devhubToolingInstanceUrl,
      subscriberPackageVersionId,
      debug,
    } = params;

    if (!(devhubToolingUsername && jwtKeyFile && devhubToolingClientId && devhubToolingInstanceUrl)) {
      if (debug) {
        logger.debug('Tooling DevHub Auth Params:', {
          devhubToolingUsername,
          jwtKeyFile,
          devhubToolingClientId,
          devhubToolingInstanceUrl,
        });
      }
      logger.warn(
        'Missing credentials for Tooling DevHub authentication. Skipping target package version check from DevHub.',
      );
      return undefined;
    }

    logger.info('Authenticating to Tooling DevHub...');
    try {
      const authResult = await authenticateOrg({
        username: devhubToolingUsername,
        jwtKeyFile,
        clientId: devhubToolingClientId,
        instanceUrl: devhubToolingInstanceUrl,
        setDefaultDevHub: true,
      });
      if (!authResult.success) {
        logger.warn(`Tooling Auth failed: ${authResult.message ?? 'unknown error'}`);
        return undefined;
      }

      logger.success('Tooling Auth successful.');

      if (!subscriberPackageVersionId || !isSubscriberPackageVersionId(subscriberPackageVersionId)) {
        return undefined;
      }

      logger.info(`Get latest package version for package version ID ${subscriberPackageVersionId}...`);
      const { stdout } = await runSf([
        'package',
        'version',
        'report',
        '--package',
        subscriberPackageVersionId,
        '--json',
      ]);
      const versionReport = JSON.parse(stdout) as { result: { Version?: string } };
      return versionReport.result.Version ? `v${versionReport.result.Version}` : undefined;
    } catch (error) {
      logger.warn(`Tooling Auth command failed: ${(error as Error).message}`);
      if (debug) {
        logger.error(String(error));
      }
      return undefined;
    }
  }

  /** Falls back to the git tag pointing at HEAD when the DevHub can't resolve a target version. */
  private static async resolveTargetPackageVersionFromGitTag(debug: boolean): Promise<string> {
    logger.info('Falling back to git tag for target version...');
    try {
      const { stdout } = await execa('git', ['tag', '--points-at', 'HEAD']);
      if (stdout) {
        return stdout.trim().split('\n')[0];
      }
      logger.warn('No git tag found at HEAD.');
    } catch (error) {
      logger.warn(`Could not get git tag: ${(error as Error).message}`);
      if (debug) {
        logger.error(String(error));
      }
    }
    return 'N/A';
  }

  private static async resolveTargetPackageVersion(params: TargetPackageVersionParams): Promise<string> {
    const fromDevHub = await NotifyProject.resolveTargetPackageVersionFromDevHub(params);
    return fromDevHub ?? NotifyProject.resolveTargetPackageVersionFromGitTag(params.debug);
  }

  /** Resolves and records the previously installed and target package versions for later stages. */
  private static async beforeScript(options: NotifyProjectOptions): Promise<void> {
    logger.info('Initializing before-script for project notification...');

    if (options.ciJobStage !== 'pre-destructive' || options.ciJobStatus === 'canceled') {
      logger.info(
        `No notify before-script logic for job stage: ${options.ciJobStage ?? 'unknown'}, status: ${options.ciJobStatus ?? 'unknown'}`,
      );
      return;
    }

    logger.info('Running before_script for project notification...');
    await fs.writeFile('project-build.env', `CREATED_BY_JOB_NAME=${options.ciJobName ?? ''}\n`);

    const prevInstalledPackageVersion = await NotifyProject.resolvePrevInstalledPackageVersion({
      alias: options.alias,
      username: options.username,
      jwtKeyFile: options.jwtKeyFile,
      clientId: options.clientId,
      instanceUrl: options.instanceUrl,
      debug: options.debug,
    });

    const targetPackageVersion = await NotifyProject.resolveTargetPackageVersion({
      devhubToolingUsername: options.devhubToolingUsername,
      jwtKeyFile: options.jwtKeyFile,
      devhubToolingClientId: options.devhubToolingClientId,
      devhubToolingInstanceUrl: options.devhubToolingInstanceUrl,
      subscriberPackageVersionId: options.subscriberPackageVersionId,
      debug: options.debug,
    });

    appendToEnvFile(
      'project-build.env',
      { PREV_INSTALLED_PACKAGE_VERSION: prevInstalledPackageVersion, TARGET_PACKAGE_VERSION: targetPackageVersion },
      logger,
    );

    logger.success('before_script for project notification finished.');
    logger.log(`PREV_INSTALLED_PACKAGE_VERSION=${prevInstalledPackageVersion}`);
    logger.log(`TARGET_PACKAGE_VERSION=${targetPackageVersion}`);
  }

  /** Posts the deployment result card (with Jira stories on success) to Teams. */
  private static async afterScript(options: NotifyProjectOptions): Promise<NotifyProjectResult> {
    const { ciJobStage, ciJobStatus } = options;

    const templateData: Record<string, unknown> = {
      environmentName: options.ciEnvironmentName,
      refName: options.ciCommitRefName,
      pipelineUrl: options.ciPipelineUrl,
      pipelineId: options.ciPipelineId,
      projectTitle: options.ciProjectTitle,
      storiesLinked: 'N/A',
      stage: ciJobStage,
    };
    let notifyCommitStories = 'N/A';
    let templateName: NotifyTemplateName;

    if (ciJobStage === 'post-destructive' && ciJobStatus === 'success') {
      templateName = 'project-success-notification';
      logger.info('Gathering stories for successful deployment...');
      const { stories, storiesWithUrl } = await getCommitStories(
        options.prevInstalledPackageVersion,
        options.targetPackageVersion,
        options.jiraProjectKey,
        {
          debug: options.debug,
          jiraBaseUrl: options.jiraBaseUrl,
        },
      );
      notifyCommitStories = stories;
      templateData.storiesLinked = storiesWithUrl;
    } else if (ciJobStatus === 'failed') {
      templateName = 'project-failure-notification';
    } else {
      logger.info(`No notification logic for job status: ${ciJobStatus ?? 'unknown'}`);
      return { sent: false };
    }

    const notifyMessage = renderNotifyTemplate(templateName, templateData);

    const payload = {
      content: notifyMessage,
      environmentName: options.ciEnvironmentName,
      refName: options.ciCommitRefName,
      pipelineId: options.ciPipelineId,
      pipelineUrl: options.ciPipelineUrl,
      projectTitle: options.ciProjectTitle,
      jobName: options.ciJobName,
      jobStage: ciJobStage,
      jobStatus: ciJobStatus,
      stories: notifyCommitStories,
      storiesLinked: templateData.storiesLinked,
      packageVersionPrevious: options.prevInstalledPackageVersion,
      packageVersion: options.targetPackageVersion,
    };

    await sendNotification(options.teamsWebhookUrl, payload);
    return { sent: true };
  }

  public async run(): Promise<NotifyProjectResult> {
    const { flags } = await this.parse(NotifyProject);

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

    const options: NotifyProjectOptions = {
      alias: flags.alias,
      ciCommitRefName: flags['ci-commit-ref-name'],
      ciEnvironmentName: flags['ci-environment-name'],
      ciJobName: flags['ci-job-name'],
      ciJobStage: flags['ci-job-stage'],
      ciJobStatus: flags['ci-job-status'],
      ciPipelineId: flags['ci-pipeline-id'],
      ciPipelineUrl: flags['ci-pipeline-url'],
      ciProjectTitle: flags['ci-project-title'],
      clientId: flags['client-id'],
      devhubToolingClientId: flags['devhub-tooling-client-id'],
      devhubToolingInstanceUrl: flags['devhub-tooling-instance-url'],
      devhubToolingUsername: flags['devhub-tooling-username'],
      instanceUrl: flags['instance-url'],
      jiraBaseUrl: flags['jira-base-url'],
      jiraProjectKey: flags['jira-project-key'],
      jwtKeyFile: flags['jwt-key-file'],
      prevInstalledPackageVersion: flags['prev-installed-package-version'],
      subscriberPackageVersionId: flags['subscriber-package-version-id'],
      targetPackageVersion: flags['target-package-version'],
      teamsWebhookUrl: flags['teams-webhook-url'],
      username: flags.username,
      debug: flags.debug,
    };

    try {
      let result: NotifyProjectResult;
      if (flags['before-script']) {
        await NotifyProject.beforeScript(options);
        result = { sent: false };
      } else if (flags['after-script']) {
        result = await NotifyProject.afterScript(options);
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
