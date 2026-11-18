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
import { confirm, outro, select, spinner, step } from '@simplysf/simply-plugin-kit';
import {
  createRelease,
  RELEASE_TYPES,
  resolveReleaseVcs,
  type CreateReleaseResult,
  type CreateReleaseVcs,
  type ReleaseType,
} from '@simplysf/simply-project-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-project', 'simply.project.release.create');

const VCS_PLATFORM_NAMES: Record<VcsProviderKind, string> = { gitlab: 'GitLab', github: 'GitHub' };

type VcsStepFlags = {
  'create-release': boolean;
  'release-tag'?: string;
  'set-default': boolean;
  'vcs-provider'?: VcsProviderKind;
  'vcs-host'?: string;
  'vcs-project-id'?: string;
  'vcs-token'?: string;
};

export type ProjectReleaseCreateResult = CreateReleaseResult;

/** The length git abbreviates a commit SHA to by default. */
const SHORT_SHA_LENGTH = 7;

/** The line reporting the branch itself: the spinner's done line, or the first logged line. */
function branchLine(result: CreateReleaseResult): string {
  switch (result.status) {
    case 'Created':
      return messages.getMessage('result.created', [
        result.branch,
        result.source,
        (result.commit ?? '').slice(0, SHORT_SHA_LENGTH),
      ]);
    case 'Would create':
      return messages.getMessage('result.wouldCreate', [result.branch, result.source, result.version]);
    case 'Commit rejected':
      return messages.getMessage('result.commitRejected', [result.branch]);
    case 'Declined':
      return messages.getMessage('result.declined');
  }
}

/** A line for each VCS step that was asked for and reached; none once the plan was declined. */
function vcsStepLines(result: CreateReleaseResult): string[] {
  if (result.status === 'Declined') {
    return [];
  }
  const lines: string[] = [];
  if (result.release) {
    const { name, tagName, status, webUrl } = result.release;
    const key = { Created: 'created', 'Already exists': 'alreadyExists', 'Would create': 'wouldCreate' }[status];
    const line = messages.getMessage(`result.release.${key}`, [name, tagName]);
    lines.push(webUrl ? `${line}\n${webUrl}` : line);
  }
  if (result.defaultBranch) {
    const key = { Set: 'set', 'Would set': 'wouldSet', 'Not set': 'notSet' }[result.defaultBranch.status];
    lines.push(messages.getMessage(`result.default.${key}`, [result.branch]));
  }
  return lines;
}

/** The outro that closes an interactive run, or none when the run ended some other way. */
function outroLine(result: CreateReleaseResult): string | undefined {
  switch (result.status) {
    case 'Created':
      return messages.getMessage('outro.created');
    case 'Declined':
      return messages.getMessage('outro.declined');
    // simply-project-core already printed how to recover from a rejected commit, and a dry run is
    // never interactive, so neither has a session to close.
    case 'Commit rejected':
    case 'Would create':
      return undefined;
  }
}

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

    const { wantsRelease, setDefault, vcs } = await this.chooseVcsSteps(flags, interactive);

    const result = await spinner(
      {
        message: messages.getMessage('spinner.working'),
        doneMessage: branchLine,
        enabled: interactive,
      },
      (control) =>
        createRelease({
          type,
          // Only the chosen type's increment applies. Unset, createRelease falls back to the source
          // branch's plugins.simply.release.increments in sfdx-project.json, then 1.
          increment: flags[`${type}-increment`],
          source: flags.source,
          packageReleaseBranchPrefix: flags['package-release-branch-prefix'],
          remote: flags.remote,
          message: flags.message,
          createRelease: wantsRelease,
          releaseTag: flags['release-tag'],
          setDefault,
          vcs,
          dryRun: flags['dry-run'],
          confirm: interactive ? (plan): Promise<boolean> => control.pause(() => this.confirmPlan(plan)) : undefined,
        }),
    );

    this.report(result, interactive);

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
  protected async promptForCreateRelease(platform: string): Promise<boolean> {
    return confirm({ message: messages.getMessage('prompt.createRelease', [platform]) });
  }

  // eslint-disable-next-line class-methods-use-this -- kept as a method so tests can stub the prompt
  protected async promptForSetDefault(): Promise<boolean> {
    return confirm({ message: messages.getMessage('prompt.setDefault') });
  }

  // eslint-disable-next-line class-methods-use-this -- kept as a method so tests can stub the prompt
  protected async confirmPlan(plan: CreateReleaseResult): Promise<boolean> {
    const steps = [
      ...(plan.release ? [messages.getMessage('confirm.release', [plan.release.name, plan.release.tagName])] : []),
      messages.getMessage('confirm.branch', [plan.branch, plan.source, plan.version]),
      ...(plan.defaultBranch ? [messages.getMessage('confirm.default', [plan.branch])] : []),
    ];
    // Printed once, apart from the prompt: clack redraws a prompt's whole message, and a long line
    // that wraps more than it expects leaves the top of the old frame behind.
    step(messages.getMessage('confirm.plan', [steps.map((line) => `- ${line}`).join('\n')]));
    return confirm({ message: messages.getMessage('confirm') });
  }

  /**
   * Reports what ran, one line per step. In a terminal the spinner's done line already reported the
   * branch, so the rest follow it in clack's gutter and an outro closes the session.
   */
  private report(result: CreateReleaseResult, interactive: boolean): void {
    if (this.jsonEnabled()) {
      return;
    }
    if (!interactive) {
      for (const line of [branchLine(result), ...vcsStepLines(result)]) {
        this.log(line);
      }
      return;
    }
    for (const line of vcsStepLines(result)) {
      step(line);
    }
    const closing = outroLine(result);
    if (closing) {
      outro(closing);
    }
  }

  /**
   * Works out which VCS steps run. Flags turn them on; in a terminal, each step left off is offered
   * too, but only when the VCS settings resolve, so a "yes" can't then fail for want of a token.
   */
  private async chooseVcsSteps(
    flags: VcsStepFlags,
    interactive: boolean,
  ): Promise<{ wantsRelease: boolean; setDefault: boolean; vcs: CreateReleaseVcs | undefined }> {
    let wantsRelease = flags['create-release'] || flags['release-tag'] !== undefined;
    let setDefault = flags['set-default'];
    const resolveVcs = (): CreateReleaseVcs =>
      resolveReleaseVcs({
        provider: flags['vcs-provider'],
        host: flags['vcs-host'],
        projectId: flags['vcs-project-id'],
        token: flags['vcs-token'],
        warn: (message) => this.warn(message),
      });

    // A step asked for by flag needs the VCS settings, so missing ones fail here, before anything changes.
    let vcs = wantsRelease || setDefault ? resolveVcs() : undefined;
    if (!interactive || (wantsRelease && setDefault)) {
      return { wantsRelease, setDefault, vcs };
    }

    if (!vcs) {
      try {
        vcs = resolveVcs();
      } catch {
        this.info(messages.getMessage('info.vcsUnavailable'));
        return { wantsRelease, setDefault, vcs: undefined };
      }
    }
    if (!wantsRelease) {
      wantsRelease = await this.promptForCreateRelease(VCS_PLATFORM_NAMES[vcs.provider.kind]);
    }
    if (!setDefault) {
      setDefault = await this.promptForSetDefault();
    }
    return { wantsRelease, setDefault, vcs: wantsRelease || setDefault ? vcs : undefined };
  }
}
