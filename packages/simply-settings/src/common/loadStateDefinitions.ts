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

import { readFile } from 'node:fs/promises';
import { Messages } from '@salesforce/core';
import { filterStateDefinitions, parseStateDefinitions, type StateDefinition } from '@simplysf/simply-settings-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-settings', 'simply.settings.address.state');

/**
 * Reads `--file`, validates it, and applies `--country`: the input step `state create` and
 * `state activate` share.
 *
 * @param file - Path to the JSON definitions file.
 * @param countries - `--country` values, if any.
 * @returns The definitions to act on.
 */
export async function loadStateDefinitions(file: string, countries?: string[]): Promise<StateDefinition[]> {
  let json: unknown;
  try {
    json = JSON.parse(await readFile(file, 'utf8')) as unknown;
  } catch (error) {
    throw messages.createError('error.unreadableFile', [file, error instanceof Error ? error.message : String(error)]);
  }

  return filterStateDefinitions(parseStateDefinitions(json), countries);
}
