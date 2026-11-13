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

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Messages } from '@salesforce/core';
import { Flags } from '@salesforce/sf-plugins-core';
import { listVcsProviderKinds, type VcsProviderKind } from '@simplysf/simply-cicd-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.happy-soup');

/**
 * Flags shared by the developer-run `happy-soup` commands. Unlike the pipeline stages' flags, these
 * read no `SIMPLY_CICD_*` variables: a developer's shell isn't a CI job.
 */
export const releaseConfigFlags = {
  config: Flags.string({ char: 'c', summary: messages.getMessage('flags.config.summary') }),
  'base-branch': Flags.string({ char: 'b', summary: messages.getMessage('flags.base-branch.summary') }),
  remote: Flags.string({ summary: messages.getMessage('flags.remote.summary'), default: 'origin' }),
  'dry-run': Flags.boolean({ summary: messages.getMessage('flags.dry-run.summary'), default: false }),
  'no-prompt': Flags.boolean({ summary: messages.getMessage('flags.no-prompt.summary'), default: false }),
};

/**
 * The merge request's VCS settings. No default provider: an unset flag falls through to
 * `SIMPLY_VCS_PROVIDER`, then `.sfdevrc.json`, then GitLab, in `resolveVcsSettings`.
 */
export const mergeRequestVcsFlags = {
  'vcs-provider': Flags.custom<VcsProviderKind>({ options: listVcsProviderKinds() })({
    summary: messages.getMessage('flags.vcs-provider.summary'),
  }),
  'vcs-host': Flags.string({ summary: messages.getMessage('flags.vcs-host.summary') }),
  'vcs-project-id': Flags.string({ summary: messages.getMessage('flags.vcs-project-id.summary') }),
  'vcs-token': Flags.string({ summary: messages.getMessage('flags.vcs-token.summary'), env: 'SIMPLY_VCS_TOKEN' }),
};

/** Sentinel for the "Other" entry at the end of a prompt's list. Can't collide with a git ref name. */
export const OTHER = '\0other';

/** Prompts run only in a terminal, and never with `--no-prompt` or `--json`. */
export function canPrompt(noPrompt: boolean, jsonEnabled: boolean): boolean {
  return !noPrompt && !jsonEnabled && Boolean(process.stdin.isTTY);
}

/** @returns The root of the git repository containing the current directory. Runs git without a shell. */
export async function repositoryRoot(): Promise<string> {
  const { stdout } = await promisify(execFile)('git', ['rev-parse', '--show-toplevel']);
  return stdout.trim();
}
