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

import fs from 'node:fs/promises';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { readPackageManifestMembers } from '@simplysf/simply-core';
import { deleteFlows, type FlowDeleteResult } from '@simplysf/simply-flow-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-flow', 'simply.flow.delete');

// Re-exported so the `--json` result types stay importable from this command, as before 0046.
export type { FlowDeleteFailure, FlowDeleteResult } from '@simplysf/simply-flow-core';

const FAILURE_TABLE_COLUMNS = [
  { key: 'developerName' as const, name: 'FLOW' },
  { key: 'stage' as const, name: 'STAGE' },
  { key: 'message' as const, name: 'MESSAGE' },
];

/**
 * Deactivates and hard-deletes every version of the named Flows — the pre-step a destructive
 * metadata deploy needs, since Salesforce won't remove a Flow that still has an active version.
 */
export default class FlowDelete extends SfCommand<FlowDeleteResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    manifest: Flags.string({ summary: messages.getMessage('flags.manifest.summary'), char: 'x' }),
    'flow-name': Flags.string({
      summary: messages.getMessage('flags.flow-name.summary'),
      char: 'n',
      multiple: true,
    }),
  };

  /** @returns Which flows were deactivated/deleted, and any per-flow failures. Sets `process.exitCode = 1` if any failure occurred. */
  public async run(): Promise<FlowDeleteResult> {
    const { flags } = await this.parse(FlowDelete);

    const hasFlowNames = Boolean(flags['flow-name']?.length);
    if ((flags.manifest && hasFlowNames) || (!flags.manifest && !hasFlowNames)) {
      throw messages.createError('error.manifestOrFlowNameRequired');
    }

    const flowNames = flags.manifest
      ? readPackageManifestMembers(await fs.readFile(flags.manifest, 'utf-8'), 'Flow')
      : (flags['flow-name'] as string[]);

    if (flowNames.length === 0) {
      this.info(messages.getMessage('info.nothingToDelete'));
      return { deactivated: [], deleted: [], failures: [] };
    }

    const connection = requireConnection(flags);
    const { deactivated, deleted, failures } = await deleteFlows(connection, flowNames, {
      onStage: (stage) => {
        this.spinner.stop();
        this.spinner.start(messages.getMessage(stage === 'deactivate' ? 'info.deactivating' : 'info.deleting'));
      },
    });
    this.spinner.stop();

    if (failures.length > 0) {
      this.table({ data: failures, columns: FAILURE_TABLE_COLUMNS });
      process.exitCode = 1;
    }
    this.info(messages.getMessage('info.summary', [deactivated.length, deleted.length, failures.length]));

    return { deactivated, deleted, failures };
  }
}
