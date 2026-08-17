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
import { runSfJson } from '../../../common/exec/sfCli.js';
import { logger } from '../../../common/logger.js';
import { resolveBoolean, resolveOptionalString, resolveString } from '../../../common/flags/env.js';
import { updateSfdxProject } from '../../../common/sfdxDependabot/updater.js';
import type { UpdateSfdxProjectResult } from '../../../common/sfdxDependabot/updater.js';
import { getVcsProvider } from '../../../common/vcs/index.js';
import type { VcsProject, VcsProvider, VcsProviderKind } from '../../../common/vcs/index.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.sfdx-dependabot');

type SubscriberPackageVersionRecord = {
  Name?: string;
  MajorVersion?: number;
  MinorVersion?: number;
  PatchVersion?: number;
  BuildNumber?: number;
};

export type ResolvePackageDetailsResult = { packageName: string; packageVersion: string };

/** Queries the DevHub for a released subscriber package version's name and semantic version. */
export async function resolvePackageDetails(
  devhubUsername: string,
  subscriberPackageVersionId: string,
): Promise<ResolvePackageDetailsResult> {
  if (!devhubUsername) {
    throw new Error('Missing DevHub username/alias (DEVHUB_TOOLING_USERNAME).');
  }
  if (!subscriberPackageVersionId) {
    throw new Error('Missing subscriber package version ID (SUBSCRIBER_PACKAGE_VERSION_ID).');
  }

  logger.info(`Querying DevHub ${devhubUsername} for package details of 04t version: ${subscriberPackageVersionId}...`);

  const query = `SELECT MajorVersion, MinorVersion, PatchVersion, Name, BuildNumber FROM SubscriberPackageVersion WHERE Id = '${subscriberPackageVersionId}'`;
  const args = ['data', 'query', '-o', devhubUsername, '-q', query, '--use-tooling-api', '--json'];

  try {
    const queryResult = await runSfJson<{
      records?: SubscriberPackageVersionRecord[];
      result?: { records?: SubscriberPackageVersionRecord[] };
    }>(args);
    const records = queryResult.result?.records ?? queryResult.records;

    if (!records || records.length === 0) {
      throw new Error(`No records found for Id: ${subscriberPackageVersionId}`);
    }

    const record = records[0];
    const rawName = record.Name ?? '';
    const packageName = rawName.replace(/\s+v\d+\.\d+(\.\d+)?.*$/, '');
    const { MajorVersion: major, MinorVersion: minor, PatchVersion: patch, BuildNumber: build } = record;

    if (!packageName || major === undefined || minor === undefined || patch === undefined || build === undefined) {
      throw new Error(`Incomplete package details returned from DevHub query for ID: ${subscriberPackageVersionId}`);
    }

    const packageVersion = `${major}.${minor}.${patch}-${build}`;
    logger.success(`Resolved package details: ${packageName}@${packageVersion}`);
    return { packageName, packageVersion };
  } catch (error) {
    logger.error(`Failed to query DevHub for package version details: ${(error as Error).message}`);
    throw error;
  }
}

export type FilterProjectOptions = {
  upstreamProjectPath?: string;
  upstreamProjectId?: string;
  skipArchived?: boolean;
  skipForks?: boolean;
  allowlist?: string;
  denylist?: string;
};

export type FilterProjectResult = { keep: boolean; reason?: string };

/** Decides whether a discovered project should be scanned, per the upstream/archived/fork/allow-deny rules. */
export function filterProject(project: VcsProject, options: FilterProjectOptions = {}): FilterProjectResult {
  const { upstreamProjectPath, upstreamProjectId, skipArchived, skipForks, allowlist, denylist } = options;
  const pathWithNamespace = project.pathWithNamespace;

  if (pathWithNamespace.toLowerCase() === upstreamProjectPath?.toLowerCase()) {
    return { keep: false, reason: 'Upstream repository (CI_PROJECT_PATH)' };
  }
  if (upstreamProjectId && project.id === Number(upstreamProjectId)) {
    return { keep: false, reason: 'Upstream repository (CI_PROJECT_ID)' };
  }

  if (skipArchived && project.archived) {
    return { keep: false, reason: 'Archived project' };
  }

  if (project.empty || !project.defaultBranch) {
    return { keep: false, reason: 'Empty repository or missing default branch' };
  }

  if (skipForks && project.isFork) {
    return { keep: false, reason: 'Forked repository' };
  }

  if (allowlist && allowlist.trim() !== '') {
    const list = allowlist.split(',').map((item) => item.trim().toLowerCase());
    const matches = list.some(
      (item) => pathWithNamespace.toLowerCase() === item || pathWithNamespace.toLowerCase().includes(item),
    );
    if (!matches) {
      return { keep: false, reason: 'Not in project allowlist' };
    }
  }

  if (denylist && denylist.trim() !== '') {
    const list = denylist.split(',').map((item) => item.trim().toLowerCase());
    const matches = list.some(
      (item) => pathWithNamespace.toLowerCase() === item || pathWithNamespace.toLowerCase().includes(item),
    );
    if (matches) {
      return { keep: false, reason: 'In project denylist' };
    }
  }

  return { keep: true };
}

export type GenerateMrDescriptionInput = {
  packageName: string;
  oldVersions: string[];
  packageVersion: string;
  subscriberPackageVersionId: string;
};

/** Renders the markdown description body for a dependency-bump merge request. */
export function generateMrDescription({
  packageName,
  oldVersions,
  packageVersion,
  subscriberPackageVersionId,
}: GenerateMrDescriptionInput): string {
  const previousVersionsStr = oldVersions.length > 0 ? oldVersions.join(', ') : 'unknown';
  return `## SFDX Project Dependabot Update

This merge request updates a Salesforce 2GP package dependency.

| Field                         | Value            |
| ----------------------------- | ---------------- |
| Package                       | \`${packageName}\` |
| Previous version              | \`${previousVersionsStr}\`  |
| New version                   | \`${packageVersion}\`  |
| Subscriber package version ID | \`${subscriberPackageVersionId}\`       |

### Files changed

- \`sfdx-project.json\`

### Validation

This merge request should be validated by the downstream repository pipeline
before merge.

### Notes

This merge request was generated automatically by \`sf simply cicd sfdx-dependabot\`.`;
}

export type SfdxDependabotSummary = {
  packageName: string;
  packageVersion: string;
  subscriberPackageVersionId: string;
  projectsDiscovered: number;
  projectsEligible: number;
  projectsUpdated: number;
  mergeRequestsCreated: number;
  mergeRequestsAlreadyOpen: number;
  alreadyCurrent: number;
  noDependencyFound: number;
  missingSfdxProjectFile: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
};

type ResolvedOptions = {
  gitlabApiUrl: string;
  gitlabToken: string;
  rootGroupId: string;
  subscriberPackageVersionId: string;
  devhubUsername: string;
  dryRun: boolean;
  projectAllowlist: string;
  projectDenylist: string;
  skipArchived: boolean;
  skipForks: boolean;
  branchPrefix: string;
  mrLabels: string;
  failOnError: boolean;
  maxProjects?: number;
};

type SfdxDependabotCounters = {
  projectsUpdated: number;
  mergeRequestsCreated: number;
  mergeRequestsAlreadyOpen: number;
  alreadyCurrent: number;
  noDependencyFound: number;
  missingSfdxProjectFile: number;
  skipped: number;
  failed: number;
};

/** Applies the `--max-projects` safety cap, returning the trimmed list and how many extra projects that skipped. */
function applyMaxProjectsLimit(
  filteredProjects: VcsProject[],
  maxProjects: number | undefined,
): { projectsToProcess: VcsProject[]; additionalSkipped: number } {
  if (maxProjects === undefined || maxProjects <= 0 || maxProjects >= filteredProjects.length) {
    return { projectsToProcess: filteredProjects, additionalSkipped: 0 };
  }

  logger.warn(
    `Applying safety limit: only scanning first ${maxProjects} of ${filteredProjects.length} eligible projects.`,
  );
  return {
    projectsToProcess: filteredProjects.slice(0, maxProjects),
    additionalSkipped: filteredProjects.length - maxProjects,
  };
}

/**
 * Discovers downstream repositories that depend on a just-released Salesforce 2GP package,
 * opens or updates a merge request bumping each opted-in repository to the new version.
 */
export default class SfdxDependabot extends SfCommand<SfdxDependabotSummary> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'gitlab-api-url': Flags.string({
      summary: messages.getMessage('flags.gitlab-api-url.summary'),
      description: messages.getMessage('flags.gitlab-api-url.description'),
      env: 'SIMPLY_CICD_GITLAB_API_URL',
    }),
    'gitlab-token': Flags.string({
      summary: messages.getMessage('flags.gitlab-token.summary'),
      env: 'SIMPLY_CICD_GITLAB_TOKEN',
    }),
    'root-group-id': Flags.string({
      summary: messages.getMessage('flags.root-group-id.summary'),
      env: 'SIMPLY_CICD_ROOT_GROUP_ID',
    }),
    'subscriber-package-version-id': Flags.string({
      summary: messages.getMessage('flags.subscriber-package-version-id.summary'),
    }),
    'devhub-username': Flags.string({
      summary: messages.getMessage('flags.devhub-username.summary'),
      env: 'SIMPLY_CICD_DEVHUB_USERNAME',
    }),
    'dry-run': Flags.boolean({
      summary: messages.getMessage('flags.dry-run.summary'),
      env: 'SIMPLY_CICD_DRY_RUN',
    }),
    'project-allowlist': Flags.string({
      summary: messages.getMessage('flags.project-allowlist.summary'),
      env: 'SIMPLY_CICD_PROJECT_ALLOWLIST',
    }),
    'project-denylist': Flags.string({
      summary: messages.getMessage('flags.project-denylist.summary'),
      env: 'SIMPLY_CICD_PROJECT_DENYLIST',
    }),
    'skip-archived': Flags.boolean({
      summary: messages.getMessage('flags.skip-archived.summary'),
      allowNo: true,
      env: 'SIMPLY_CICD_SKIP_ARCHIVED',
    }),
    'skip-forks': Flags.boolean({
      summary: messages.getMessage('flags.skip-forks.summary'),
      allowNo: true,
      env: 'SIMPLY_CICD_SKIP_FORKS',
    }),
    'branch-prefix': Flags.string({
      summary: messages.getMessage('flags.branch-prefix.summary'),
      env: 'SIMPLY_CICD_BRANCH_PREFIX',
    }),
    'mr-labels': Flags.string({
      summary: messages.getMessage('flags.mr-labels.summary'),
      env: 'SIMPLY_CICD_MR_LABELS',
    }),
    'fail-on-error': Flags.boolean({
      summary: messages.getMessage('flags.fail-on-error.summary'),
      env: 'SIMPLY_CICD_FAIL_ON_ERROR',
    }),
    'max-projects': Flags.integer({
      summary: messages.getMessage('flags.max-projects.summary'),
      env: 'SIMPLY_CICD_MAX_PROJECTS',
    }),
    'vcs-provider': Flags.custom<VcsProviderKind>({ options: ['gitlab'] })({
      summary: messages.getMessage('flags.vcs-provider.summary'),
      default: 'gitlab',
      env: 'SIMPLY_CICD_VCS_PROVIDER',
    }),
  };

  /** Discovers all projects under the root group and applies the upstream/archived/fork/allow-deny filters. */
  private static async discoverEligibleProjects(
    vcsProvider: VcsProvider,
    rootGroupId: string,
    options: ResolvedOptions,
  ): Promise<{ allProjects: VcsProject[]; filteredProjects: VcsProject[]; skippedCount: number }> {
    logger.info(`Discovering projects in GitLab group/path: ${rootGroupId}...`);
    let allProjects: VcsProject[];
    try {
      allProjects = await vcsProvider.getGroupProjects(rootGroupId);
    } catch (error) {
      throw new Error(`Failed to access GitLab root group "${rootGroupId}": ${(error as Error).message}`);
    }

    logger.info(`Discovered ${allProjects.length} projects in group.`);

    const upstreamProjectPath = process.env.CI_PROJECT_PATH;
    const upstreamProjectId = process.env.CI_PROJECT_ID;

    const filteredProjects: VcsProject[] = [];
    let skippedCount = 0;

    for (const project of allProjects) {
      const filterResult = filterProject(project, {
        upstreamProjectPath,
        upstreamProjectId,
        skipArchived: options.skipArchived,
        skipForks: options.skipForks,
        allowlist: options.projectAllowlist,
        denylist: options.projectDenylist,
      });

      if (filterResult.keep) {
        filteredProjects.push(project);
      } else {
        skippedCount++;
        logger.debug(`Skipping project ${project.pathWithNamespace}: ${filterResult.reason ?? 'unknown reason'}`);
      }
    }

    logger.info(`Identified ${filteredProjects.length} eligible projects after filtering.`);

    return { allProjects, filteredProjects, skippedCount };
  }

  /**
   * Processes a single eligible project: reads its `sfdx-project.json`, checks its opt-in status,
   * and (unless already current, not opted in, or a dry run) opens or updates a merge request.
   */
  private static async processProject(
    project: VcsProject,
    vcsProvider: VcsProvider,
    options: ResolvedOptions,
    packageName: string,
    packageVersion: string,
    counters: SfdxDependabotCounters,
  ): Promise<void> {
    const projectPath = project.pathWithNamespace;
    logger.info(`Processing project: ${projectPath}...`);

    let sfdxProjectContent: string;
    try {
      sfdxProjectContent = await vcsProvider.getFileContent(
        project.id,
        'sfdx-project.json',
        project.defaultBranch ?? 'HEAD',
      );
    } catch (error) {
      if ((error as Error).message.includes('404')) {
        logger.info(`Project ${projectPath} is missing sfdx-project.json.`);
        counters.missingSfdxProjectFile++;
        return;
      }
      throw error;
    }

    let isExplicitlyEnabled = false;
    try {
      const variables = await vcsProvider.getProjectVariables(project.id);
      const enabledVar = variables.find((variable) => variable.key === 'SFDX_DEPENDABOT_ENABLED');
      if (enabledVar?.value === 'TRUE') {
        isExplicitlyEnabled = true;
      }
    } catch (err) {
      logger.debug(`Could not retrieve project variables for ${projectPath}: ${(err as Error).message}`);
    }

    if (!isExplicitlyEnabled) {
      logger.info(
        `Project ${projectPath} is skipped because automatic dependabot updates are off by default. To enable, configure the project-level GitLab CI/CD variable SFDX_DEPENDABOT_ENABLED=TRUE.`,
      );
      counters.skipped++;
      return;
    }

    const updateResult = updateSfdxProject(
      sfdxProjectContent,
      packageName,
      packageVersion,
      options.subscriberPackageVersionId,
    );

    if (!updateResult.hasDependency) {
      logger.debug(`Project ${projectPath} does not depend on ${packageName}.`);
      counters.noDependencyFound++;
      return;
    }

    if (!updateResult.changed) {
      logger.info(`Project ${projectPath} is already current for dependency ${packageName}.`);
      counters.alreadyCurrent++;
      return;
    }

    const branchName = `${options.branchPrefix}/${packageName}`;
    logger.info(`Project ${projectPath} requires update on branch: ${branchName}`);

    if (options.dryRun) {
      logger.info(`[DRY-RUN] Planned update in ${projectPath}:`);
      logger.info(`[DRY-RUN] - Branch: ${branchName}`);
      logger.info(
        `[DRY-RUN] - Dependency update: ${packageName} (previous: ${updateResult.oldVersions.join(', ') || 'unknown'} -> current: ${packageVersion})`,
      );
      logger.info(
        `[DRY-RUN] - Package alias added: "${packageName}@${packageVersion}": "${options.subscriberPackageVersionId}"`,
      );
      counters.projectsUpdated++;
      counters.mergeRequestsCreated++;
      return;
    }

    await SfdxDependabot.applyProjectUpdate(
      project,
      vcsProvider,
      options,
      packageName,
      packageVersion,
      branchName,
      updateResult,
      counters,
    );
  }

  /** Creates/reuses the update branch, commits the dependency bump if needed, and opens/updates the merge request. */
  private static async applyProjectUpdate(
    project: VcsProject,
    vcsProvider: VcsProvider,
    options: ResolvedOptions,
    packageName: string,
    packageVersion: string,
    branchName: string,
    updateResult: UpdateSfdxProjectResult,
    counters: SfdxDependabotCounters,
  ): Promise<void> {
    const projectPath = project.pathWithNamespace;
    const defaultBranch = project.defaultBranch ?? 'HEAD';

    const branchAlreadyExists = await vcsProvider.branchExists(project.id, branchName);
    if (!branchAlreadyExists) {
      logger.info(`Creating branch ${branchName} in ${projectPath}...`);
      await vcsProvider.createBranch(project.id, branchName, defaultBranch);
    } else {
      logger.info(`Branch ${branchName} already exists in ${projectPath}.`);
    }

    let branchNeedsCommit = true;
    if (branchAlreadyExists) {
      try {
        const branchContent = await vcsProvider.getFileContent(project.id, 'sfdx-project.json', branchName);
        const branchUpdateCheck = updateSfdxProject(
          branchContent,
          packageName,
          packageVersion,
          options.subscriberPackageVersionId,
        );
        if (!branchUpdateCheck.changed) {
          branchNeedsCommit = false;
          logger.info(`Branch ${branchName} is already up to date in ${projectPath}.`);
        }
      } catch (e) {
        logger.warn(`Could not parse sfdx-project.json from existing branch ${branchName}: ${(e as Error).message}`);
      }
    }

    if (branchNeedsCommit) {
      logger.info(`Committing updated sfdx-project.json to ${branchName} in ${projectPath}...`);
      const commitMessage = `chore: bump ${packageName} dependency to ${packageVersion}`;
      await vcsProvider.commitFile(
        project.id,
        branchName,
        commitMessage,
        'sfdx-project.json',
        updateResult.newJsonContent,
      );
    }

    logger.info(`Checking for existing open MR for branch ${branchName} in ${projectPath}...`);
    const existingMr = await vcsProvider.findOpenMergeRequest(project.id, branchName, defaultBranch);

    const mrTitle = `chore: bump ${packageName} to ${packageVersion}`;
    const mrDescription = generateMrDescription({
      packageName,
      oldVersions: updateResult.oldVersions,
      packageVersion,
      subscriberPackageVersionId: options.subscriberPackageVersionId,
    });

    if (existingMr) {
      logger.info(
        `Found existing open MR for ${projectPath}: ${existingMr.webUrl ?? 'unknown URL'}. Updating MR title, description, and labels...`,
      );
      const updatedMr = await vcsProvider.updateMergeRequest(
        project.id,
        existingMr.iid,
        mrTitle,
        mrDescription,
        options.mrLabels,
      );
      logger.success(`Successfully updated Merge Request in ${projectPath}: ${updatedMr.webUrl ?? 'unknown URL'}`);
      counters.mergeRequestsAlreadyOpen++;
      counters.projectsUpdated++;
    } else {
      logger.info(`Creating new MR for branch ${branchName} in ${projectPath}...`);
      const createdMr = await vcsProvider.createMergeRequest(
        project.id,
        branchName,
        defaultBranch,
        mrTitle,
        mrDescription,
        options.mrLabels,
      );
      logger.success(`Successfully created Merge Request in ${projectPath}: ${createdMr.webUrl ?? 'unknown URL'}`);
      counters.mergeRequestsCreated++;
      counters.projectsUpdated++;
    }
  }

  public async run(): Promise<SfdxDependabotSummary> {
    const { flags } = await this.parse(SfdxDependabot);

    const gitlabApiUrl = resolveOptionalString(flags['gitlab-api-url'], [
      process.env.SFDX_DEPENDABOT_GITLAB_API_URL,
      process.env.CI_API_V4_URL,
    ]);
    const gitlabToken = resolveOptionalString(flags['gitlab-token'], [process.env.SFDX_DEPENDABOT_GITLAB_TOKEN]);
    const rootGroupId = resolveOptionalString(flags['root-group-id'], [process.env.SFDX_DEPENDABOT_ROOT_GROUP_ID]);
    const subscriberPackageVersionId = resolveOptionalString(flags['subscriber-package-version-id'], [
      process.env.SUBSCRIBER_PACKAGE_VERSION_ID,
    ]);
    const devhubUsername = resolveOptionalString(flags['devhub-username'], [process.env.DEVHUB_TOOLING_USERNAME]);

    if (!gitlabApiUrl) {
      throw messages.createError('error.missingGitlabApiUrl');
    }
    if (!gitlabToken) {
      throw new Error('Missing GitLab token. Provide --gitlab-token or set SFDX_DEPENDABOT_GITLAB_TOKEN.');
    }
    if (!rootGroupId) {
      throw new Error('Missing GitLab root group ID. Provide --root-group-id or set SFDX_DEPENDABOT_ROOT_GROUP_ID.');
    }
    if (!subscriberPackageVersionId) {
      throw new Error(
        'Missing subscriber package version ID. Provide --subscriber-package-version-id or set SUBSCRIBER_PACKAGE_VERSION_ID.',
      );
    }
    if (!devhubUsername) {
      throw new Error('Missing DevHub username/alias. Provide --devhub-username or set DEVHUB_TOOLING_USERNAME.');
    }

    const options: ResolvedOptions = {
      gitlabApiUrl,
      gitlabToken,
      rootGroupId,
      subscriberPackageVersionId,
      devhubUsername,
      dryRun: resolveBoolean(flags['dry-run'], process.env.SFDX_DEPENDABOT_DRY_RUN, false),
      projectAllowlist: resolveString(flags['project-allowlist'], [process.env.SFDX_DEPENDABOT_PROJECT_ALLOWLIST]),
      projectDenylist: resolveString(flags['project-denylist'], [process.env.SFDX_DEPENDABOT_PROJECT_DENYLIST]),
      skipArchived: resolveBoolean(flags['skip-archived'], process.env.SFDX_DEPENDABOT_SKIP_ARCHIVED, true),
      skipForks: resolveBoolean(flags['skip-forks'], process.env.SFDX_DEPENDABOT_SKIP_FORKS, true),
      branchPrefix: resolveString(
        flags['branch-prefix'],
        [process.env.SFDX_DEPENDABOT_BRANCH_PREFIX],
        'devops/dependabot',
      ),
      mrLabels: resolveString(flags['mr-labels'], [process.env.SFDX_DEPENDABOT_MR_LABELS]),
      failOnError: resolveBoolean(flags['fail-on-error'], process.env.SFDX_DEPENDABOT_FAIL_ON_ERROR, false),
      maxProjects:
        flags['max-projects'] ??
        (process.env.SFDX_DEPENDABOT_MAX_PROJECTS !== undefined
          ? Number(process.env.SFDX_DEPENDABOT_MAX_PROJECTS)
          : undefined),
    };

    logger.info(messages.getMessage('info.starting'));
    if (options.dryRun) {
      logger.info(messages.getMessage('info.dryRun'));
    }

    const { packageName, packageVersion } = await resolvePackageDetails(
      options.devhubUsername,
      options.subscriberPackageVersionId,
    );
    const vcsProvider = getVcsProvider(flags['vcs-provider'], options.gitlabApiUrl, options.gitlabToken);

    const { allProjects, filteredProjects, skippedCount } = await SfdxDependabot.discoverEligibleProjects(
      vcsProvider,
      options.rootGroupId,
      options,
    );
    const { projectsToProcess, additionalSkipped } = applyMaxProjectsLimit(filteredProjects, options.maxProjects);

    const counters: SfdxDependabotCounters = {
      projectsUpdated: 0,
      mergeRequestsCreated: 0,
      mergeRequestsAlreadyOpen: 0,
      alreadyCurrent: 0,
      noDependencyFound: 0,
      missingSfdxProjectFile: 0,
      skipped: skippedCount + additionalSkipped,
      failed: 0,
    };

    for (const project of projectsToProcess) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await SfdxDependabot.processProject(project, vcsProvider, options, packageName, packageVersion, counters);
      } catch (error) {
        logger.error(`Failed to process project ${project.pathWithNamespace}: ${(error as Error).message}`);
        counters.failed++;
      }
    }

    const summary: SfdxDependabotSummary = {
      packageName,
      packageVersion,
      subscriberPackageVersionId: options.subscriberPackageVersionId,
      projectsDiscovered: allProjects.length,
      projectsEligible: filteredProjects.length,
      projectsUpdated: counters.projectsUpdated,
      mergeRequestsCreated: counters.mergeRequestsCreated,
      mergeRequestsAlreadyOpen: counters.mergeRequestsAlreadyOpen,
      alreadyCurrent: counters.alreadyCurrent,
      noDependencyFound: counters.noDependencyFound,
      missingSfdxProjectFile: counters.missingSfdxProjectFile,
      skipped: counters.skipped,
      failed: counters.failed,
      dryRun: options.dryRun,
    };

    this.logSummary(summary);

    if (options.failOnError && counters.failed > 0) {
      throw new Error(`Dependabot run failed because ${counters.failed} per-project operation(s) failed.`);
    }

    return summary;
  }

  private logSummary(summary: SfdxDependabotSummary): void {
    this.styledHeader('SFDX Dependabot Summary');
    this.log(`Package: ${summary.packageName}`);
    this.log(`Version: ${summary.packageVersion}`);
    this.log(`Subscriber Package Version ID: ${summary.subscriberPackageVersionId}`);
    this.log('');
    this.log(`Projects discovered: ${summary.projectsDiscovered}`);
    this.log(`Projects eligible after filters: ${summary.projectsEligible}`);
    this.log(`Projects updated: ${summary.projectsUpdated}`);
    this.log(`Merge requests created: ${summary.mergeRequestsCreated}`);
    this.log(`Merge requests already open: ${summary.mergeRequestsAlreadyOpen}`);
    this.log(`Already current: ${summary.alreadyCurrent}`);
    this.log(`No dependency found: ${summary.noDependencyFound}`);
    this.log(`Missing sfdx-project.json: ${summary.missingSfdxProjectFile}`);
    this.log(`Skipped: ${summary.skipped}`);
    this.log(`Failed: ${summary.failed}`);
    this.log(`Dry run: ${summary.dryRun}`);
  }
}
