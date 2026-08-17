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

import { Flags } from '@salesforce/sf-plugins-core';
import type { OptionFlag } from '@oclif/core/interfaces';
import type { Org } from '@salesforce/core';

/**
 * The `--target-org` / `--api-version` pair every org-touching command declares.
 *
 * These two always travel together — an API version is only meaningful against an org — and
 * neither carries per-command help text, since `sf-plugins-core` supplies both summaries. Spread
 * this into a command's `flags`, then read the result with {@link requireConnection}.
 *
 * ```ts
 * public static readonly flags = {
 *   ...SfCommand.baseFlags,
 *   ...targetOrgFlags,
 *   sobject: Flags.string({ summary: messages.getMessage('flags.sobject.summary'), required: true }),
 * };
 * ```
 */
export const targetOrgFlags: {
  'api-version': OptionFlag<string | undefined>;
  'target-org': OptionFlag<Org>;
} = {
  'api-version': Flags.orgApiVersion(),
  'target-org': Flags.requiredOrg(),
};
