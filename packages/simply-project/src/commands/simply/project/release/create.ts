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
import { VCS_PROVIDER_KINDS, type VcsProviderKind } from '@simplysf/simply-core';
import { confirm, select } from '@simplysf/simply-plugin-kit';
import {
  createRelease,
  RELEASE_TYPES,
  resolveReleaseVcs,
  type CreateReleaseResult,
  type ReleaseType,
} from '@simplysf/simply-project-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-project', 'simply.project.release.create');

export type ProjectReleaseCreateResult = CreateReleaseResult;

/** Cuts the next release branch, and optionally publishes a release and sets the default branch. */
export default class ProjectReleaseCreate extends SfCommand<ProjectReleaseCreateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    ...SfCommand.baseFlags,
    type: Flags.custom<ReleaseType>({ options: [...RELEASE_TYPES] })({
      char: 't',
      summary: messages.getMessage('flags.type.summary'),
    }),
    'major-increment': Flags.integer({
      summary: messages.getMessage('flags.major-increment.summary'),
      env: 'SIMPLY_PROJECT_RELEASE_MAJOR_INCREMENT',
      min: 1,
    }),
    'minor-increment': Flags.integer({
      summary: messages.getMessage('flags.minor-increment.summary'),
      env: 'SIMPLY_PROJECT_RELEASE_MINOR_INCREMENT',
      min: 1,
    }),
    'patch-increment': Flags.integer({
      summary: messages.getMessage('flags.patch-increment.summary'),
      env: 'SIMPLY_PROJECT_RELEASE_PATCH_INCREMENT',
      min: 1,
    }),
    source: Flags.string({ summary: messages.getMessage('flags.source.summary') }),
    'package-release-branch-prefix': Flags.string({
      summary: messages.getMessage('flags.package-release-branch-prefix.summary'),
      default: 'release/',
    }),
    remote: Flags.string({ summary: messages.getMessage('flags.remote.summary'), default: 'origin' }),
    message: Flags.string({ summary: messages.getMessage('flags.message.summary') }),
    'create-release': Flags.boolean({ summary: messages.getMessage('flags.create-release.summary'), default: false }),
    'release-tag': Flags.string({ summary: messages.getMessage('flags.release-tag.summary') }),
    'set-default': Flags.boolean({
      char: 's',
      summary: messages.getMessage('flags.set-default.summary'),
      default: false,
    }),
    'vcs-provider': Flags.custom<VcsProviderKind>({ options: [...VCS_PROVIDER_KINDS] })({
      summary: messages.getMessage('flags.vcs-provider.summary'),
    }),
    'vcs-host': Flags.string({ summary: messages.getMessage('flags.vcs-host.summary') }),
    'vcs-project-id': Flags.string({ summary: messages.getMessage('flags.vcs-project-id.summary') }),
    'vcs-token': Flags.string({ summary: messages.getMessage('flags.vcs-token.summary'), env: 'SIMPLY_VCS_TOKEN' }),
    'dry-run': Flags.boolean({ summary: messages.getMessage('flags.dry-run.summary'), default: false }),
    'no-prompt': Flags.boolean({ summary: messages.getMessage('flags.no-prompt.summary'), default: false }),
  };

  public async run(): Promise<ProjectReleaseCreateResult> {
    const { flags } = await this.parse(ProjectReleaseCreate);
    const interactive = !flags['no-prompt'] && !flags['dry-run'] && !this.jsonEnabled();

    const type = flags.type ?? (interactive ? await this.promptForType() : undefined);
    if (!type) {
      this.error(messages.getMessage('error.typeRequired'));
    }

    const wantsVcs = flags['create-release'] || flags['release-tag'] !== undefined || flags['set-default'];
    const vcs = wantsVcs
      ? resolveReleaseVcs({
          provider: flags['vcs-provider'],
          host: flags['vcs-host'],
          projectId: flags['vcs-project-id'],
          token: flags['vcs-token'],
          warn: (message) => this.warn(message),
        })
      : undefined;

    const result = await createRelease({
      type,
      // Only the chosen type's increment applies. Unset, createRelease falls back to the source
      // branch's plugins.simply.release.increments in sfdx-project.json, then 1.
      increment: flags[`${type}-increment`],
      source: flags.source,
      packageReleaseBranchPrefix: flags['package-release-branch-prefix'],
      remote: flags.remote,
      message: flags.message,
      createRelease: flags['create-release'],
      releaseTag: flags['release-tag'],
      setDefault: flags['set-default'],
      vcs,
      dryRun: flags['dry-run'],
      confirm: interactive ? (plan): Promise<boolean> => this.confirmPlan(plan) : undefined,
    });

    this.table({
      title: messages.getMessage('tableTitle'),
      data: [
        { field: 'Source', value: result.source },
        { field: 'Branch', value: result.branch },
        { field: 'Status', value: result.status },
        { field: 'Commit', value: result.commit ?? '' },
        ...(result.release
          ? [
              {
                field: 'Release',
                value: `${result.release.name} (${result.release.tagName}): ${result.release.status}`,
              },
            ]
          : []),
        ...(result.release?.webUrl ? [{ field: 'Release URL', value: result.release.webUrl }] : []),
        ...(result.defaultBranch ? [{ field: 'Default branch', value: result.defaultBranch.status }] : []),
      ],
    });

    if (result.status === 'Commit rejected') {
      process.exitCode = 1;
    }
    return result;
  }

  // eslint-disable-next-line class-methods-use-this -- kept as a method so tests can stub the prompt
  protected async promptForType(): Promise<ReleaseType> {
    return select<ReleaseType>({
      message: messages.getMessage('prompt.type'),
      options: RELEASE_TYPES.map((value) => ({
        value,
        label: value,
        hint: messages.getMessage(`type.${value}`),
      })),
      initialValue: 'minor',
    });
  }

  // eslint-disable-next-line class-methods-use-this -- kept as a method so tests can stub the prompt
  protected async confirmPlan(plan: CreateReleaseResult): Promise<boolean> {
    const steps = [
      ...(plan.release ? [messages.getMessage('confirm.release', [plan.release.name, plan.release.tagName])] : []),
      messages.getMessage('confirm.branch', [plan.branch, plan.source, plan.version]),
      ...(plan.defaultBranch ? [messages.getMessage('confirm.default', [plan.branch])] : []),
    ];
    return confirm({ message: messages.getMessage('confirm', [steps.map((step) => `- ${step}`).join('\n')]) });
  }
}
