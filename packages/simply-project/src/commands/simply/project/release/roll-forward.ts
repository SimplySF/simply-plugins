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
import { confirm, spinner } from '@simplysf/simply-plugin-kit';
import { rollForward, type RollForwardHop, type RollForwardResult } from '@simplysf/simply-project-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-project', 'simply.project.release.roll-forward');

export type ProjectReleaseRollForwardResult = RollForwardResult;

/** Merges each release branch into the next higher one, keeping version tags in the target's history. */
export default class ProjectReleaseRollForward extends SfCommand<ProjectReleaseRollForwardResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    ...SfCommand.baseFlags,
    source: Flags.string({ summary: messages.getMessage('flags.source.summary') }),
    target: Flags.string({ summary: messages.getMessage('flags.target.summary') }),
    'package-release-branch-prefix': Flags.string({
      summary: messages.getMessage('flags.package-release-branch-prefix.summary'),
      default: 'release/',
    }),
    remote: Flags.string({ summary: messages.getMessage('flags.remote.summary'), default: 'origin' }),
    message: Flags.string({ summary: messages.getMessage('flags.message.summary') }),
    'dry-run': Flags.boolean({ summary: messages.getMessage('flags.dry-run.summary'), default: false }),
    'no-push': Flags.boolean({ summary: messages.getMessage('flags.no-push.summary'), default: false }),
    'no-prompt': Flags.boolean({ summary: messages.getMessage('flags.no-prompt.summary'), default: false }),
  };

  public async run(): Promise<ProjectReleaseRollForwardResult> {
    const { flags } = await this.parse(ProjectReleaseRollForward);
    const prompt = !flags['no-prompt'] && !flags['no-push'] && !this.jsonEnabled();

    const result = await spinner(
      {
        message: messages.getMessage('spinner.working'),
        doneMessage: (rolled: RollForwardResult) =>
          messages.getMessage(rolled.declined ? 'spinner.declined' : 'spinner.done', [rolled.hops.length]),
        enabled: prompt,
      },
      (control) =>
        rollForward({
          source: flags.source,
          target: flags.target,
          packageReleaseBranchPrefix: flags['package-release-branch-prefix'],
          remote: flags.remote,
          message: flags.message,
          dryRun: flags['dry-run'],
          noPush: flags['no-push'],
          confirm: prompt ? (hops): Promise<boolean> => control.pause(() => this.confirmPush(hops)) : undefined,
        }),
    );

    this.table({
      title: messages.getMessage('tableTitle'),
      data: result.hops.map((hop) => ({
        source: hop.source,
        target: hop.target,
        status: hop.status,
        mergeCommit: hop.mergeCommit ?? '',
        tags: hop.tags.join(', '),
      })),
    });

    if (result.hops.some((hop) => hop.status === 'Conflict' || hop.status === 'Commit rejected')) {
      process.exitCode = 1;
    }
    return result;
  }

  // eslint-disable-next-line class-methods-use-this -- kept as a method so tests can stub the prompt
  protected async confirmPush(hops: RollForwardHop[]): Promise<boolean> {
    const route = hops.map((hop) => `${hop.source} -> ${hop.target}`).join('\n');
    return confirm({ message: messages.getMessage('confirm', [route, hops.length]) });
  }
}
