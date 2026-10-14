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
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';
import {
  createStates,
  DEFAULT_CREATE_CONCURRENCY,
  formatStateKey,
  openSetupSession,
  parseAddressSettingsXml,
  planStateCreation,
  retrieveAddressSettingsXml,
  type StateCreationOutcome,
  type StateCreationStatus,
} from '@simplysf/simply-settings-core';
import { loadStateDefinitions } from '../../../../../common/loadStateDefinitions.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-settings', 'simply.settings.address.state.create');

const STATUSES: StateCreationStatus[] = ['created', 'would-create', 'exists', 'country-missing', 'rejected', 'failed'];
const PROBLEM_STATUSES = new Set<StateCreationStatus>(['rejected', 'failed']);

export type StateCreateResult = {
  summary: Record<StateCreationStatus, number>;
  states: StateCreationOutcome[];
};

export default class StateCreate extends SfCommand<StateCreateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    file: Flags.file({ char: 'f', summary: messages.getMessage('flags.file.summary'), required: true, exists: true }),
    country: Flags.string({ char: 'c', summary: messages.getMessage('flags.country.summary'), multiple: true }),
    concurrency: Flags.integer({
      summary: messages.getMessage('flags.concurrency.summary'),
      default: DEFAULT_CREATE_CONCURRENCY,
      min: 1,
      max: 10,
    }),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      unit: 'minutes',
      defaultValue: 33,
      min: 1,
    }),
    'dry-run': Flags.boolean({ summary: messages.getMessage('flags.dry-run.summary'), default: false }),
  };

  public async run(): Promise<StateCreateResult> {
    const { flags } = await this.parse(StateCreate);
    const definitions = await loadStateDefinitions(flags.file, flags.country);
    const connection = requireConnection(flags);

    this.spinner.start(messages.getMessage('info.retrieving'));
    const settings = parseAddressSettingsXml(await retrieveAddressSettingsXml({ connection, wait: flags.wait }));
    this.spinner.stop();

    const { pending, settled } = planStateCreation(definitions, settings);
    let submitted: StateCreationOutcome[];

    if (flags['dry-run']) {
      submitted = pending.map((definition) => ({ ...definition, status: 'would-create' }));
      this.log(messages.getMessage('info.dryRun', [pending.length]));
    } else if (pending.length === 0) {
      submitted = [];
      this.log(messages.getMessage('info.nothingToCreate', [definitions.length]));
    } else {
      this.spinner.start(messages.getMessage('info.openingSession'));
      const session = await openSetupSession({ connection });
      this.spinner.stop();

      let finished = 0;
      this.spinner.start(messages.getMessage('info.creating', [pending.length]));
      submitted = await createStates({
        session,
        states: pending,
        concurrency: flags.concurrency,
        onProgress: () => {
          finished++;
          this.spinner.status = messages.getMessage('info.progress', [finished, pending.length]);
        },
      });
      this.spinner.stop();
    }

    // Report in the file's order, whichever path settled each state.
    const byKey = new Map([...settled, ...submitted].map((outcome) => [formatStateKey(outcome), outcome]));
    const states = definitions.map((definition) => byKey.get(formatStateKey(definition))!);
    const summary = Object.fromEntries(STATUSES.map((status) => [status, 0])) as Record<StateCreationStatus, number>;
    for (const state of states) summary[state.status]++;

    this.table({
      data: STATUSES.filter((status) => summary[status] > 0).map((status) => ({ status, count: summary[status] })),
    });

    const problems = states.filter((state) => PROBLEM_STATUSES.has(state.status));
    if (problems.length > 0) {
      this.table({
        data: problems.map((state) => ({
          state: formatStateKey(state),
          name: state.name,
          status: state.status,
          message: state.message ?? '',
        })),
      });
      this.warn(messages.getMessage('warning.problems', [problems.length]));
      process.exitCode = 1;
    }

    if (summary.created > 0) {
      this.log(messages.getMessage('info.activateHint', [`${this.config.bin} simply settings address state activate`]));
    }

    return { summary, states };
  }
}
