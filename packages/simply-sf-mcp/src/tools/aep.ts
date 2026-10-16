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

import type { Connection } from '@salesforce/core';
import {
  ALL_BINDING_TYPES,
  BINDING_TYPE_BY_FLAG,
  filterDomainProcessBindingIssues,
  resolveBindings,
  resolveDomainProcessBindings,
  scanLocalApexTriggers,
  scanLocalBindings,
  scanLocalDomainProcessBindings,
  scanLocalFieldSetInclusions,
  scanLocalPlatformEventSubscriptions,
  scanOrgApexTriggers,
  scanOrgBindings,
  scanOrgDomainProcessBindings,
  scanOrgFieldSetInclusions,
  scanOrgPlatformEventSubscriptions,
  validateBindings,
  validateDomainProcessBindings,
  validateFieldSetInclusions,
  validatePlatformEventSubscriptions,
  type BindingType,
  type BindingTypeFlag,
} from '@simplysf/simply-aep-core';
import { z } from 'zod';
import { loadToolsetMessages } from '../messages.js';
import { ToolError } from '../toolError.js';
import {
  defineTool,
  limitArg,
  limitItems,
  orgArgs,
  resolveExistingDirs,
  type ToolContext,
  type ToolDefinition,
} from './defineTool.js';

const messages = loadToolsetMessages('aep');

/** The four custom metadata families, each with its own "not detected" and "query failed" wording. */
type Family = 'binding' | 'domainProcessBinding' | 'fieldSetInclusion' | 'platformEventSubscription';

const sourceArgs = {
  ...orgArgs,
  source_dir: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe(
      'Local source directories to read instead of an org, relative to the project root or absolute (for example ["force-app"]).',
    ),
};

type SourceArgs = { target_org?: string; api_version?: string; source_dir?: string[] };

/** Where to read from: local source, or an org with the username to report as the source. */
type Source = { kind: 'local'; sourceDirs: string[] } | { kind: 'org'; connection: Connection; username: string };

/**
 * `source_dir` reads local source, otherwise an org: `target_org`, or the project's default org.
 * The CLI makes the caller pick one; here the default org stands in when neither is given.
 */
async function chooseSource(args: SourceArgs, context: ToolContext): Promise<Source> {
  if (args.source_dir && args.target_org) {
    throw new ToolError('target-org-and-source-dir', messages.getMessage('error.targetOrgAndSourceDir'));
  }
  if (args.source_dir) {
    return { kind: 'local', sourceDirs: resolveExistingDirs(context, args.source_dir, 'source_dir') };
  }
  const connection = await context.connection(args);
  return { kind: 'org', connection, username: connection.getUsername() ?? 'org' };
}

function notDetected(family: Family): ToolError {
  return new ToolError('at4dx-not-detected', messages.getMessage(`error.${family}.notDetected`));
}

async function scanOrg<T>(family: Family, scan: () => Promise<T>): Promise<T> {
  try {
    return await scan();
  } catch (error) {
    throw new ToolError(
      'org-query-failed',
      messages.getMessage(`error.${family}.orgQueryFailed`, [(error as Error).message]),
    );
  }
}

function scanLocal<T>(scan: () => T): T {
  try {
    return scan();
  } catch (error) {
    throw new ToolError('local-scan-failed', messages.getMessage('error.localScanFailed', [(error as Error).message]));
  }
}

/** Every validation issue has these; the rest of its fields depend on the family. */
const issueSchema = z.looseObject({
  severity: z.enum(['error', 'warning']),
  rule: z.string(),
  message: z.string(),
  source: z.string(),
});

type Issue = z.infer<typeof issueSchema>;

const listOutput = <T extends z.ZodType>(item: T): z.ZodRawShape => ({
  source: z.string().describe('"local", or the username of the org that was read.'),
  items: z.array(item),
  total: z.number(),
  truncated: z.boolean(),
});

const validateOutput = {
  source: z.string().describe('"local", or the username of the org that was read.'),
  recordCount: z.number().describe('How many records were checked.'),
  errorCount: z.number(),
  warningCount: z.number(),
  items: z.array(issueSchema),
  total: z.number(),
  truncated: z.boolean(),
};

function validateResult(
  source: string,
  recordCount: number,
  issues: Issue[],
  limit: number,
): z.input<z.ZodObject<typeof validateOutput>> {
  return {
    source,
    recordCount,
    errorCount: issues.filter((issue) => issue.severity === 'error').length,
    warningCount: issues.filter((issue) => issue.severity === 'warning').length,
    ...limitItems(issues, limit),
  };
}

function summarizeValidate(noun: string) {
  return (result: z.input<z.ZodObject<typeof validateOutput>>): string =>
    result.total === 0
      ? `No issues in ${result.recordCount} ${noun} (${result.source}).`
      : `${result.total} issue(s) in ${result.recordCount} ${noun} (${result.errorCount} error, ${result.warningCount} warning) (${result.source}).`;
}

function summarizeList(noun: string) {
  return (result: { source: string; total: number; truncated: boolean; items: unknown[] }): string =>
    `${result.total} ${noun} (${result.source})${result.truncated ? `; showing the first ${result.items.length}` : ''}.`;
}

const bindingTypeArg = z
  .array(z.enum(['service', 'selector', 'domain', 'unit-of-work']))
  .min(1)
  .optional()
  .describe('Only these binding types. Defaults to all four.');

function requestedTypes(types: BindingTypeFlag[] | undefined): BindingType[] {
  return types?.length ? [...new Set(types.map((flag) => BINDING_TYPE_BY_FLAG[flag]))] : ALL_BINDING_TYPES;
}

const bindingRow = z.looseObject({
  bindingType: z.enum(['Service', 'Selector', 'Domain', 'UnitOfWork']),
  developerName: z.string(),
  key: z.string(),
  to: z.string().optional(),
  effective: z.boolean(),
  source: z.string(),
});

const bindingList = defineTool({
  name: 'simply_aep_binding_list',
  toolset: 'aep',
  tier: 'read',
  title: 'List AT4DX Application Factory bindings',
  description: messages.getMessage('simply_aep_binding_list'),
  inputSchema: {
    ...sourceArgs,
    type: bindingTypeArg,
    effective_only: z.boolean().default(false).describe('Only the record that wins for each key.'),
    limit: limitArg,
  },
  outputSchema: listOutput(bindingRow),
  async run(args, context) {
    const types = requestedTypes(args.type);
    const source = await chooseSource(args, context);

    let rows;
    if (source.kind === 'org') {
      const scan = await scanOrg('binding', () => scanOrgBindings(source.connection, types));
      if (scan.missingTypes.length === types.length) throw notDetected('binding');
      rows = resolveBindings(scan.records);
    } else {
      const { records } = scanLocal(() => scanLocalBindings(source.sourceDirs, types));
      if (records.length === 0) throw notDetected('binding');
      rows = resolveBindings(records);
    }

    const bindings = args.effective_only ? rows.filter((row) => row.effective) : rows;
    return { source: source.kind === 'org' ? source.username : 'local', ...limitItems(bindings, args.limit) };
  },
  summarize: summarizeList('binding(s)'),
});

const bindingValidate = defineTool({
  name: 'simply_aep_binding_validate',
  toolset: 'aep',
  tier: 'read',
  title: 'Validate AT4DX Application Factory bindings',
  description: messages.getMessage('simply_aep_binding_validate'),
  inputSchema: { ...sourceArgs, type: bindingTypeArg, limit: limitArg },
  outputSchema: validateOutput,
  async run(args, context) {
    const types = requestedTypes(args.type);
    // `missing-domain-trigger` is the only rule that reads triggers, so skip the scan without Domain.
    const wantsTriggers = types.includes('Domain');
    const source = await chooseSource(args, context);

    if (source.kind === 'org') {
      const scan = await scanOrg('binding', () => scanOrgBindings(source.connection, types));
      if (scan.missingTypes.length === types.length) throw notDetected('binding');
      const triggers = wantsTriggers
        ? await scanOrg('binding', () => scanOrgApexTriggers(source.connection))
        : undefined;
      const issues = validateBindings(scan.records, { malformed: scan.malformed, ambiguous: scan.ambiguous }, triggers);
      return validateResult(source.username, scan.records.length, issues, args.limit);
    }

    const scan = scanLocal(() => scanLocalBindings(source.sourceDirs, types));
    if (scan.records.length === 0 && scan.malformed.length === 0) throw notDetected('binding');
    const triggers = wantsTriggers ? scanLocal(() => scanLocalApexTriggers(source.sourceDirs)) : undefined;
    const issues = validateBindings(scan.records, { malformed: scan.malformed, ambiguous: scan.ambiguous }, triggers);
    return validateResult('local', scan.records.length, issues, args.limit);
  },
  summarize: summarizeValidate('binding(s)'),
});

const sobjectArg = z
  .array(z.string().min(1))
  .min(1)
  .optional()
  .describe('Only bindings for these SObject API names, for example ["Account"].');

async function scanDomainProcessBindings(source: Source): Promise<ReturnType<typeof scanLocalDomainProcessBindings>> {
  if (source.kind === 'org') {
    const scan = await scanOrg('domainProcessBinding', () => scanOrgDomainProcessBindings(source.connection));
    if (scan.missing) throw notDetected('domainProcessBinding');
    return scan;
  }
  return scanLocal(() => scanLocalDomainProcessBindings(source.sourceDirs));
}

const domainProcessBindingRow = z.looseObject({
  developerName: z.string(),
  sobject: z.string(),
  type: z.string(),
  classToInject: z.string(),
  order: z.number(),
  isActive: z.boolean(),
  source: z.string(),
});

const domainProcessBindingList = defineTool({
  name: 'simply_aep_domain_process_binding_list',
  toolset: 'aep',
  tier: 'read',
  title: 'List AT4DX Trigger Action Framework bindings',
  description: messages.getMessage('simply_aep_domain_process_binding_list'),
  inputSchema: {
    ...sourceArgs,
    sobject: sobjectArg,
    active_only: z.boolean().default(false).describe('Only active bindings.'),
    limit: limitArg,
  },
  outputSchema: listOutput(domainProcessBindingRow),
  async run(args, context) {
    const source = await chooseSource(args, context);
    const { records } = await scanDomainProcessBindings(source);
    if (source.kind === 'local' && records.length === 0) throw notDetected('domainProcessBinding');

    const sobjects = args.sobject ? new Set(args.sobject) : undefined;
    const rows = resolveDomainProcessBindings(sobjects ? records.filter((r) => sobjects.has(r.sobject)) : records);
    const bindings = args.active_only ? rows.filter((row) => row.isActive) : rows;
    return { source: source.kind === 'org' ? source.username : 'local', ...limitItems(bindings, args.limit) };
  },
  summarize: summarizeList('domain process binding(s)'),
});

const domainProcessBindingValidate = defineTool({
  name: 'simply_aep_domain_process_binding_validate',
  toolset: 'aep',
  tier: 'read',
  title: 'Validate AT4DX Trigger Action Framework bindings',
  description: messages.getMessage('simply_aep_domain_process_binding_validate'),
  inputSchema: { ...sourceArgs, sobject: sobjectArg, limit: limitArg },
  outputSchema: validateOutput,
  async run(args, context) {
    const source = await chooseSource(args, context);
    const { records, malformed, ambiguous } = await scanDomainProcessBindings(source);
    if (source.kind === 'local' && records.length === 0 && malformed.length === 0) {
      throw notDetected('domainProcessBinding');
    }

    const sobjects = args.sobject ? new Set(args.sobject) : undefined;
    const recordCount = sobjects ? records.filter((r) => sobjects.has(r.sobject)).length : records.length;
    // Validated unfiltered, so scan-wide problems still show; then split by the SObject filter.
    const { inScope, scanWide } = filterDomainProcessBindingIssues(
      validateDomainProcessBindings(records, { malformed, ambiguous }),
      { sobjects: args.sobject },
    );
    return validateResult(
      source.kind === 'org' ? source.username : 'local',
      recordCount,
      [...inScope, ...scanWide],
      args.limit,
    );
  },
  summarize: summarizeValidate('domain process binding(s)'),
});

async function scanFieldSetInclusions(source: Source): Promise<ReturnType<typeof scanLocalFieldSetInclusions>> {
  if (source.kind === 'org') {
    const scan = await scanOrg('fieldSetInclusion', () => scanOrgFieldSetInclusions(source.connection));
    if (scan.missing) throw notDetected('fieldSetInclusion');
    return scan;
  }
  return scanLocal(() => scanLocalFieldSetInclusions(source.sourceDirs));
}

const fieldSetInclusionRow = z.looseObject({
  developerName: z.string(),
  sobject: z.string(),
  fieldsetName: z.string(),
  isActive: z.boolean(),
  source: z.string(),
});

const fieldSetInclusionList = defineTool({
  name: 'simply_aep_field_set_inclusion_list',
  toolset: 'aep',
  tier: 'read',
  title: 'List AT4DX selector field set inclusions',
  description: messages.getMessage('simply_aep_field_set_inclusion_list'),
  inputSchema: { ...sourceArgs, limit: limitArg },
  outputSchema: listOutput(fieldSetInclusionRow),
  async run(args, context) {
    const source = await chooseSource(args, context);
    const { records } = await scanFieldSetInclusions(source);
    if (source.kind === 'local' && records.length === 0) throw notDetected('fieldSetInclusion');
    return { source: source.kind === 'org' ? source.username : 'local', ...limitItems(records, args.limit) };
  },
  summarize: summarizeList('field set inclusion(s)'),
});

const fieldSetInclusionValidate = defineTool({
  name: 'simply_aep_field_set_inclusion_validate',
  toolset: 'aep',
  tier: 'read',
  title: 'Validate AT4DX selector field set inclusions',
  description: messages.getMessage('simply_aep_field_set_inclusion_validate'),
  inputSchema: { ...sourceArgs, limit: limitArg },
  outputSchema: validateOutput,
  async run(args, context) {
    const source = await chooseSource(args, context);
    const scan = await scanFieldSetInclusions(source);
    if (source.kind === 'local' && scan.records.length === 0 && scan.malformed.length === 0) {
      throw notDetected('fieldSetInclusion');
    }
    const issues = validateFieldSetInclusions(scan.records, { malformed: scan.malformed, ambiguous: scan.ambiguous });
    return validateResult(source.kind === 'org' ? source.username : 'local', scan.records.length, issues, args.limit);
  },
  summarize: summarizeValidate('field set inclusion(s)'),
});

async function scanPlatformEventSubscriptions(
  source: Source,
): Promise<Pick<ReturnType<typeof scanLocalPlatformEventSubscriptions>, 'records' | 'malformed'>> {
  if (source.kind === 'org') {
    const scan = await scanOrg('platformEventSubscription', () => scanOrgPlatformEventSubscriptions(source.connection));
    if (scan.missing) throw notDetected('platformEventSubscription');
    return scan;
  }
  const scan = scanLocal(() => scanLocalPlatformEventSubscriptions(source.sourceDirs));
  if (scan.records.length === 0 && scan.malformed.length === 0) throw notDetected('platformEventSubscription');
  return scan;
}

const platformEventSubscriptionRow = z.looseObject({
  developerName: z.string(),
  eventBus: z.string(),
  eventCategory: z.string().optional(),
  consumer: z.string(),
  matcherRule: z.string(),
  isActive: z.boolean(),
  source: z.string(),
});

const platformEventSubscriptionList = defineTool({
  name: 'simply_aep_platform_event_subscription_list',
  toolset: 'aep',
  tier: 'read',
  title: 'List AT4DX platform event subscriptions',
  description: messages.getMessage('simply_aep_platform_event_subscription_list'),
  inputSchema: { ...sourceArgs, limit: limitArg },
  outputSchema: listOutput(platformEventSubscriptionRow),
  async run(args, context) {
    const source = await chooseSource(args, context);
    const { records } = await scanPlatformEventSubscriptions(source);
    const sorted = [...records].sort(
      (a, b) =>
        a.eventBus.localeCompare(b.eventBus) ||
        (a.eventCategory ?? '').localeCompare(b.eventCategory ?? '') ||
        a.developerName.localeCompare(b.developerName),
    );
    return { source: source.kind === 'org' ? source.username : 'local', ...limitItems(sorted, args.limit) };
  },
  summarize: summarizeList('platform event subscription(s)'),
});

const platformEventSubscriptionValidate = defineTool({
  name: 'simply_aep_platform_event_subscription_validate',
  toolset: 'aep',
  tier: 'read',
  title: 'Validate AT4DX platform event subscriptions',
  description: messages.getMessage('simply_aep_platform_event_subscription_validate'),
  inputSchema: { ...sourceArgs, limit: limitArg },
  outputSchema: validateOutput,
  async run(args, context) {
    const source = await chooseSource(args, context);
    const scan = await scanPlatformEventSubscriptions(source);
    return validateResult(
      source.kind === 'org' ? source.username : 'local',
      scan.records.length,
      validatePlatformEventSubscriptions(scan),
      args.limit,
    );
  },
  summarize: summarizeValidate('platform event subscription(s)'),
});

export const aepTools: ToolDefinition[] = [
  bindingList,
  bindingValidate,
  domainProcessBindingList,
  domainProcessBindingValidate,
  fieldSetInclusionList,
  fieldSetInclusionValidate,
  platformEventSubscriptionList,
  platformEventSubscriptionValidate,
];
