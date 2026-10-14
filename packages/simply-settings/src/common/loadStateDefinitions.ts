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
import { Flags } from '@salesforce/sf-plugins-core';
import {
  fetchIsoCodesStateDefinitions,
  filterStateDefinitions,
  ISO_CODES_SOURCE_IDS,
  parseStateDefinitions,
  type IsoCodesSourceId,
  type IsoCodesStateDefinitions,
  type StateDefinition,
} from '@simplysf/simply-settings-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-settings', 'simply.settings.address.state');

const SOURCE_FLAGS = ['file', 'iso-codes'];

/**
 * Where the states come from, shared by `state create` and `state activate`: exactly one of a
 * `--file` or an `--iso-codes` source. See docs/design/0044-settings-address-states-iso-codes.md.
 */
export const stateSourceFlags = {
  file: Flags.file({
    char: 'f',
    summary: messages.getMessage('flags.file.summary'),
    exists: true,
    exactlyOne: SOURCE_FLAGS,
  }),
  'iso-codes': Flags.option({
    summary: messages.getMessage('flags.iso-codes.summary'),
    description: messages.getMessage('flags.iso-codes.description'),
    options: ISO_CODES_SOURCE_IDS,
    exactlyOne: SOURCE_FLAGS,
  })(),
  'iso-codes-version': Flags.string({
    summary: messages.getMessage('flags.iso-codes-version.summary'),
    dependsOn: ['iso-codes'],
  }),
  // No `default: false`: oclif would then count the flag as given and fail `dependsOn`.
  'all-levels': Flags.boolean({
    summary: messages.getMessage('flags.all-levels.summary'),
    dependsOn: ['iso-codes'],
  }),
};

/** Reported in a command's JSON result when the states came from `--iso-codes`. */
export type StateDefinitionsSource = {
  kind: 'iso-codes';
  provider: IsoCodesSourceId;
  version: string;
  allLevels: boolean;
};

export type LoadedStateDefinitions = {
  definitions: StateDefinition[];
  /** Absent for `--file`. */
  source?: StateDefinitionsSource;
  /** A line saying which source and version were used, for the command to log. Absent for `--file`. */
  sourceSummary?: string;
};

export type StateSourceFlagValues = {
  file?: string;
  'iso-codes'?: IsoCodesSourceId;
  'iso-codes-version'?: string;
  'all-levels'?: boolean;
  country?: string[];
};

/**
 * Reads the states from `--file` or downloads them from the `--iso-codes` source, then applies
 * `--country`: the input step `state create` and `state activate` share.
 *
 * @param flags - The command's parsed flags.
 * @param spinner - Shown while downloading, which can take a few seconds.
 * @returns The definitions to act on, and where they came from.
 */
export async function loadStateDefinitions(
  flags: StateSourceFlagValues,
  spinner?: { start(action: string): void; stop(): void },
): Promise<LoadedStateDefinitions> {
  const source = flags['iso-codes'];

  if (!source) {
    // `exactlyOne` guarantees `--file` here.
    const file = flags.file!;
    let json: unknown;
    try {
      json = JSON.parse(await readFile(file, 'utf8')) as unknown;
    } catch (error) {
      throw messages.createError('error.unreadableFile', [
        file,
        error instanceof Error ? error.message : String(error),
      ]);
    }
    return { definitions: filterStateDefinitions(parseStateDefinitions(json), flags.country) };
  }

  const allLevels = flags['all-levels'] ?? false;
  spinner?.start(messages.getMessage('info.downloading', [source]));
  let fetched: IsoCodesStateDefinitions;
  try {
    fetched = await fetchIsoCodesStateDefinitions({ source, version: flags['iso-codes-version'], allLevels });
  } finally {
    spinner?.stop();
  }

  const definitions = filterStateDefinitions(fetched.definitions, flags.country);
  const countries = [...new Set(definitions.map((definition) => definition.country))];
  const levels = messages.getMessage(allLevels ? 'info.source.allLevels' : 'info.source.topLevel');

  return {
    definitions,
    source: { kind: 'iso-codes', provider: fetched.source, version: fetched.version, allLevels },
    sourceSummary: flags.country?.length
      ? messages.getMessage('info.sourceForCountries', [
          fetched.label,
          fetched.version,
          definitions.length,
          countries.join(', '),
          levels,
        ])
      : messages.getMessage('info.source', [fetched.label, fetched.version, definitions.length, levels]),
  };
}
