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
  assertReleaseDate,
  createReleaseBranch,
  resolveHappySoupVcs,
  type CreateReleaseBranchResult,
} from '@simplysf/simply-cicd-core';
import { spinner, text } from '@simplysf/simply-plugin-kit';
import { canPrompt, mergeRequestVcsFlags, releaseConfigFlags } from '../../../../../common/happySoup/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.happy-soup.release.create');

export type HappySoupReleaseCreateResult = CreateReleaseBranchResult;

/** Opens a dated happy-soup release: branch, deployment files from templates, push, and a draft merge request. */
export default class HappySoupReleaseCreate extends SfCommand<HappySoupReleaseCreateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    ...SfCommand.baseFlags,
    date: Flags.string({ char: 'd', summary: messages.getMessage('flags.date.summary') }),
    ...releaseConfigFlags,
    message: Flags.string({ summary: messages.getMessage('flags.message.summary') }),
    'no-push': Flags.boolean({ summary: messages.getMessage('flags.no-push.summary'), default: false }),
    'no-merge-request': Flags.boolean({
      summary: messages.getMessage('flags.no-merge-request.summary'),
      default: false,
    }),
    ...mergeRequestVcsFlags,
  };

  public async run(): Promise<HappySoupReleaseCreateResult> {
    const { flags } = await this.parse(HappySoupReleaseCreate);
    const interactive = canPrompt(flags['no-prompt'], this.jsonEnabled());

    const date = flags.date ?? (interactive ? await this.promptForDate() : undefined);
    if (!date) {
      this.error(messages.getMessage('error.dateRequired'));
    }

    const push = !flags['no-push'];
    const mergeRequest = push && !flags['no-merge-request'];
    const vcs = mergeRequest
      ? resolveHappySoupVcs({
          provider: flags['vcs-provider'],
          host: flags['vcs-host'],
          projectId: flags['vcs-project-id'],
          token: flags['vcs-token'],
          warn: (message) => this.warn(message),
        })
      : undefined;

    const result = await spinner(
      {
        message: messages.getMessage('spinner.working'),
        doneMessage: (created: CreateReleaseBranchResult) =>
          messages.getMessage('spinner.done', [created.branch, created.status]),
        enabled: interactive,
      },
      () =>
        createReleaseBranch({
          date,
          baseBranch: flags['base-branch'],
          configPath: flags.config,
          remote: flags.remote,
          message: flags.message,
          push,
          mergeRequest,
          vcs,
          dryRun: flags['dry-run'],
        }),
    );

    for (const warning of result.warnings) {
      this.warn(warning);
    }
    this.table({
      title: messages.getMessage('tableTitle'),
      data: [
        { field: 'Branch', value: result.branch },
        { field: 'Base', value: result.base },
        { field: 'Status', value: result.status },
        ...(result.commit ? [{ field: 'Commit', value: result.commit }] : []),
        { field: 'Files', value: result.files.join(', ') || '(none)' },
        ...(result.skippedTemplates.length > 0
          ? [{ field: 'Missing templates', value: result.skippedTemplates.join(', ') }]
          : []),
        { field: 'Pushed', value: result.pushed ? 'Yes' : 'No' },
        ...(result.mergeRequest
          ? [
              {
                field: 'Merge request',
                value: [result.mergeRequest.status, result.mergeRequest.webUrl ?? result.mergeRequest.title].join(': '),
              },
            ]
          : []),
      ],
    });
    return result;
  }

  // eslint-disable-next-line class-methods-use-this -- kept as a method so tests can stub the prompt
  protected async promptForDate(): Promise<string> {
    return text({
      message: messages.getMessage('prompt.date'),
      placeholder: new Date().toISOString().slice(0, 10),
      validate: (value) => {
        try {
          assertReleaseDate(value);
          return undefined;
        } catch (error) {
          return error instanceof Error ? error.message : String(error);
        }
      },
    });
  }
}
