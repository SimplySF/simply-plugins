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
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import {
  findFlowNamesInSource,
  pruneObsoleteFlowVersions,
  type FlowVersionPruneResult,
} from '@simplysf/simply-flow-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-flow', 'simply.flow.version.prune');

// Re-exported so the `--json` result types stay importable from this command, as before 0046.
export type {
  FlowVersionPruneCandidate,
  FlowVersionPruneFailure,
  FlowVersionPruneResult,
} from '@simplysf/simply-flow-core';

const CANDIDATE_TABLE_COLUMNS = [
  { key: 'developerName' as const, name: 'FLOW' },
  { key: 'id' as const, name: 'VERSION ID' },
];

const FAILURE_TABLE_COLUMNS = [
  { key: 'developerName' as const, name: 'FLOW' },
  { key: 'message' as const, name: 'MESSAGE' },
];

/**
 * Deletes obsolete Flow versions (`Status = 'Obsolete'`) for the Flows found under `--source-dir`,
 * or for explicitly named Flows via `--flow-name`. Unlike `flow delete`, this never removes an
 * active Flow — only versions the org itself already marked obsolete.
 */
export default class FlowVersionPrune extends SfCommand<FlowVersionPruneResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    'source-dir': Flags.directory({
      summary: messages.getMessage('flags.source-dir.summary'),
      char: 'd',
      exists: true,
      multiple: true,
    }),
    'flow-name': Flags.string({
      summary: messages.getMessage('flags.flow-name.summary'),
      char: 'n',
      multiple: true,
    }),
    'dry-run': Flags.boolean({ summary: messages.getMessage('flags.dry-run.summary'), default: false }),
  };

  /** @returns The obsolete versions found (and deleted, unless `--dry-run`), plus any per-version failures. Sets `process.exitCode = 1` if any failure occurred. */
  public async run(): Promise<FlowVersionPruneResult> {
    const { flags } = await this.parse(FlowVersionPrune);

    const hasSourceDir = Boolean(flags['source-dir']?.length);
    const hasFlowNames = Boolean(flags['flow-name']?.length);
    if ((hasSourceDir && hasFlowNames) || (!hasSourceDir && !hasFlowNames)) {
      throw messages.createError('error.sourceDirOrFlowNameRequired');
    }

    let flowNames: string[];
    if (hasSourceDir) {
      this.spinner.start(messages.getMessage('info.scanningLocalSource'));
      flowNames = await findFlowNamesInSource(flags['source-dir'] as string[]);
      this.spinner.stop();
    } else {
      flowNames = flags['flow-name'] as string[];
    }

    const connection = requireConnection(flags);

    const { dryRun, candidates, deleted, failures } = await pruneObsoleteFlowVersions(connection, flowNames, {
      dryRun: flags['dry-run'],
      onStage: (stage) => {
        this.spinner.stop();
        this.spinner.start(messages.getMessage(stage === 'query' ? 'info.queryingObsoleteVersions' : 'info.deleting'));
      },
    });
    this.spinner.stop();

    if (dryRun) {
      if (candidates.length > 0) {
        this.table({ data: candidates, columns: CANDIDATE_TABLE_COLUMNS });
      }
      this.info(messages.getMessage('info.dryRunSummary', [candidates.length]));
      return { dryRun, candidates, deleted, failures };
    }

    if (failures.length > 0) {
      this.table({ data: failures, columns: FAILURE_TABLE_COLUMNS });
      process.exitCode = 1;
    }
    this.info(messages.getMessage('info.summary', [deleted.length, failures.length]));

    return { dryRun: false, candidates, deleted, failures };
  }
}
