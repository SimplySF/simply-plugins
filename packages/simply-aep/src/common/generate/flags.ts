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
import { Flags } from '@salesforce/sf-plugins-core';
import { DEFAULT_OUTPUT_PATH, type Flavor } from '@simplysf/simply-aep-core';
import { targetOrgFlags } from '@simplysf/simply-plugin-kit';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-aep', 'simply.aep.generate.common');

const FLAVORS: readonly Flavor[] = ['at4dx', 'fflib'];

/** The flags every `simply aep generate` command declares: where to write, and the write guards. */
export const generateWriteFlags = {
  'output-dir': Flags.directory({
    char: 'd',
    summary: messages.getMessage('flags.output-dir.summary'),
    description: messages.getMessage('flags.output-dir.description'),
    default: DEFAULT_OUTPUT_PATH,
  }),
  'dry-run': Flags.boolean({ summary: messages.getMessage('flags.dry-run.summary'), default: false }),
  overwrite: Flags.boolean({ summary: messages.getMessage('flags.overwrite.summary'), default: false }),
  force: Flags.boolean({ summary: messages.getMessage('flags.force.summary'), default: false }),
};

/** `--flavor` and `--prefix`, for the generators that support both frameworks. */
export const flavorFlags = {
  flavor: Flags.custom<Flavor>({ options: [...FLAVORS] })({
    char: 'f',
    summary: messages.getMessage('flags.flavor.summary'),
    description: messages.getMessage('flags.flavor.description'),
    required: true,
  }),
  prefix: Flags.string({ summary: messages.getMessage('flags.prefix.summary') }),
};

/**
 * `--target-org`/`--api-version` for the generators that describe an SObject: the plugin kit's pair,
 * keeping apx's `-a` short form. Read with the kit's `requireConnection`.
 */
export const orgFlags = {
  ...targetOrgFlags,
  'api-version': Flags.orgApiVersion({ char: 'a' }),
};

/** The same, with the org optional, for `generate service` — which only uses one for its API version. */
export const optionalOrgFlags = {
  'target-org': Flags.optionalOrg({ char: 'o', summary: messages.getMessage('flags.optional-target-org.summary') }),
  'api-version': Flags.orgApiVersion({ char: 'a' }),
};

export const sobjectFlag = Flags.string({
  char: 's',
  summary: messages.getMessage('flags.sobject.summary'),
  required: true,
});
