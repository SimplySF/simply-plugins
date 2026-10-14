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
import { activateStates, formatStateKey, type StateDefinition } from '@simplysf/simply-settings-core';
import { loadStateDefinitions } from '../../../../../common/loadStateDefinitions.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-settings', 'simply.settings.address.state.activate');

/** How many skipped states the not-in-org warning names before summarizing the rest. */
const NAMED_IN_WARNING = 20;

export type StateActivateResult = {
  activated: StateDefinition[];
  alreadyActive: StateDefinition[];
  notInOrg: StateDefinition[];
  /** Present when a deploy ran — not for a dry run, or when nothing needed activating. */
  deployId?: string;
};

export default class StateActivate extends SfCommand<StateActivateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    file: Flags.file({ char: 'f', summary: messages.getMessage('flags.file.summary'), required: true, exists: true }),
    country: Flags.string({ char: 'c', summary: messages.getMessage('flags.country.summary'), multiple: true }),
    wait: Flags.duration({
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      unit: 'minutes',
      defaultValue: 33,
      min: 1,
    }),
    'dry-run': Flags.boolean({ summary: messages.getMessage('flags.dry-run.summary'), default: false }),
  };

  public async run(): Promise<StateActivateResult> {
    const { flags } = await this.parse(StateActivate);
    const states = await loadStateDefinitions(flags.file, flags.country);
    const connection = requireConnection(flags);

    this.spinner.start(messages.getMessage('info.activating'));
    const result = await activateStates({ connection, wait: flags.wait, states, dryRun: flags['dry-run'] });
    this.spinner.stop();

    this.table({
      data: [
        { status: 'activated', count: result.activated.length },
        { status: 'already active', count: result.alreadyActive.length },
        { status: 'not in org', count: result.notInOrg.length },
      ],
    });

    if (result.notInOrg.length > 0) {
      const keys = result.notInOrg.map(formatStateKey);
      const named =
        keys.length > NAMED_IN_WARNING
          ? `${keys.slice(0, NAMED_IN_WARNING).join(', ')}, and ${keys.length - NAMED_IN_WARNING} more`
          : keys.join(', ');
      this.warn(
        messages.getMessage('warning.notInOrg', [
          keys.length,
          named,
          `${this.config.bin} simply settings address state create`,
        ]),
      );
    }

    if (result.deploy && !result.deploy.success) {
      const failures = result.deploy.failures.map((failure) => failure.error).join('; ');
      throw messages.createError('error.deployFailed', [result.deploy.id, failures || result.deploy.status]);
    }

    if (flags['dry-run']) {
      this.log(messages.getMessage('info.dryRun', [result.activated.length]));
    } else if (result.deploy) {
      this.log(messages.getMessage('info.deployed', [result.activated.length, result.deploy.id]));
    } else {
      this.log(messages.getMessage('info.nothingToActivate'));
    }

    return {
      activated: result.activated,
      alreadyActive: result.alreadyActive,
      notInOrg: result.notInOrg,
      deployId: result.deploy?.id,
    };
  }
}
