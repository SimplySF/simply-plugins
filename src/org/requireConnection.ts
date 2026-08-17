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

import { Connection, Messages, type Org } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-plugin-kit', 'simply.plugin-kit');

/**
 * The parsed flags this needs: whatever a command's `target-org`/`api-version` flags produced.
 * Structural rather than tied to a specific command's flag type, so any command whose flags
 * include this pair satisfies it.
 */
export type TargetOrgFlagValues = {
  'target-org'?: Org;
  'api-version'?: string;
};

/**
 * Resolve the connection for a command's `--target-org`, at its `--api-version` if one was given.
 *
 * `Flags.requiredOrg()` already guarantees an org is present, so the undefined case here is
 * defensive — but every command was writing the same four lines to handle it, against its own
 * copy of the same error message. This is that, once.
 *
 * @param flags - The command's parsed flags.
 * @returns The org connection.
 * @throws {SfError} `TargetOrgConnectionFailedError` if no connection could be established.
 */
export function requireConnection(flags: TargetOrgFlagValues): Connection {
  const connection = flags['target-org']?.getConnection(flags['api-version']);

  if (!connection) {
    throw messages.createError('error.targetOrgConnectionFailed');
  }

  return connection;
}
