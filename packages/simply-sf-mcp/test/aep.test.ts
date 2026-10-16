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

import fs from 'node:fs';
import path from 'node:path';
import * as aepCore from '@simplysf/simply-aep-core';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { connect, errorCodeOf, fakeBackend, tempDir, textOf, type Harness } from './helpers.js';

vi.mock('@simplysf/simply-aep-core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@simplysf/simply-aep-core')>();
  return {
    ...actual,
    scanOrgBindings: vi.fn(),
    scanLocalBindings: vi.fn(),
    scanOrgApexTriggers: vi.fn(),
    scanLocalApexTriggers: vi.fn(),
    scanOrgDomainProcessBindings: vi.fn(),
    scanLocalDomainProcessBindings: vi.fn(),
    scanOrgFieldSetInclusions: vi.fn(),
    scanLocalFieldSetInclusions: vi.fn(),
    scanOrgPlatformEventSubscriptions: vi.fn(),
    scanLocalPlatformEventSubscriptions: vi.fn(),
  };
});

const core = vi.mocked(aepCore);

function binding(key: string, to: string, priority: number, source = 'force-app'): aepCore.RawBindingRecord {
  return { bindingType: 'Service', developerName: `${key}_${to}`, label: to, key, to, priority, source };
}

describe('aep tools', () => {
  let dir: string;
  let cleanup: () => void;
  let harness: Harness;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ dir, cleanup } = tempDir());
    fs.mkdirSync(path.join(dir, 'force-app'));
    harness = await connect({
      directory: dir,
      backend: fakeBackend({ aliases: { dev: 'dev@example.com' }, orgs: ['dev@example.com'], defaultOrg: 'dev' }),
      allow: 'read',
    });
  });

  afterEach(async () => {
    await harness.close();
    cleanup();
  });

  describe('choosing the source', () => {
    const records = [binding('IAccounts', 'AccountsImpl', 1), binding('IAccounts', 'AccountsMock', 2)];

    it('reads local source when source_dir is given', async () => {
      core.scanLocalBindings.mockReturnValue({ records, malformed: [], ambiguous: [] });

      const result = await harness.call('simply_aep_binding_list', { source_dir: ['force-app'] });

      expect(core.scanLocalBindings).toHaveBeenCalledWith([path.join(dir, 'force-app')], aepCore.ALL_BINDING_TYPES);
      expect(result.structuredContent).toMatchObject({ source: 'local', total: 2, truncated: false });
    });

    it('reads the named org', async () => {
      core.scanOrgBindings.mockResolvedValue({ records, malformed: [], ambiguous: [], missingTypes: [] });

      const result = await harness.call('simply_aep_binding_list', { target_org: 'dev', type: ['service'] });

      expect(core.scanOrgBindings.mock.calls[0][1]).toStrictEqual(['Service']);
      expect(result.structuredContent).toMatchObject({ source: 'dev@example.com' });
    });

    it("falls back to the project's default org", async () => {
      core.scanOrgBindings.mockResolvedValue({ records, malformed: [], ambiguous: [], missingTypes: [] });

      const result = await harness.call('simply_aep_binding_list', {});

      expect(result.structuredContent).toMatchObject({ source: 'dev@example.com' });
    });

    it('refuses both at once', async () => {
      const result = await harness.call('simply_aep_binding_list', { target_org: 'dev', source_dir: ['force-app'] });
      expect(textOf(result)).toBe('Pass either target_org or source_dir, not both.');
      expect(errorCodeOf(result)).toBe('target-org-and-source-dir');
    });
  });

  describe('simply_aep_binding_list', () => {
    it('resolves the winner and filters with effective_only', async () => {
      core.scanLocalBindings.mockReturnValue({
        records: [binding('IAccounts', 'AccountsImpl', 1), binding('IAccounts', 'AccountsMock', 2)],
        malformed: [],
        ambiguous: [],
      });

      const result = await harness.call('simply_aep_binding_list', { source_dir: ['force-app'], effective_only: true });

      expect(result.structuredContent).toMatchObject({ total: 1, items: [{ key: 'IAccounts', effective: true }] });
      expect(textOf(result)).toBe('1 binding(s) (local).');
    });

    it('truncates to limit and says so', async () => {
      core.scanLocalBindings.mockReturnValue({
        records: [binding('IA', 'A', 1), binding('IB', 'B', 1), binding('IC', 'C', 1)],
        malformed: [],
        ambiguous: [],
      });

      const result = await harness.call('simply_aep_binding_list', { source_dir: ['force-app'], limit: 2 });

      expect(result.structuredContent).toMatchObject({ total: 3, truncated: true });
      expect((result.structuredContent as { items: unknown[] }).items).toHaveLength(2);
      expect(textOf(result)).toBe('3 binding(s) (local); showing the first 2.');
    });

    it('says when AT4DX is not in the org', async () => {
      core.scanOrgBindings.mockResolvedValue({
        records: [],
        malformed: [],
        ambiguous: [],
        missingTypes: [...aepCore.ALL_BINDING_TYPES],
      });

      const result = await harness.call('simply_aep_binding_list', { target_org: 'dev' });

      expect(errorCodeOf(result)).toBe('at4dx-not-detected');
      expect(textOf(result)).toContain('none of the Application Factory binding Custom Metadata Types were found');
    });

    it("wraps a failed org query in the CLI's words", async () => {
      core.scanOrgBindings.mockRejectedValue(new Error('INVALID_TYPE'));
      const result = await harness.call('simply_aep_binding_list', { target_org: 'dev' });
      expect(textOf(result)).toBe('Failed to query bindings from the org: INVALID_TYPE');
      expect(errorCodeOf(result)).toBe('org-query-failed');
    });
  });

  describe('simply_aep_binding_validate', () => {
    it('counts errors and warnings, and scans triggers only when Domain is requested', async () => {
      core.scanLocalBindings.mockReturnValue({
        records: [
          {
            bindingType: 'Selector',
            developerName: 'A',
            label: 'A',
            key: 'Account',
            to: 'S1',
            sequence: 1,
            source: 'l',
          },
          {
            bindingType: 'Selector',
            developerName: 'B',
            label: 'B',
            key: 'Account',
            to: 'S1',
            sequence: 1,
            source: 'l',
          },
        ],
        malformed: [],
        ambiguous: [],
      });

      const result = await harness.call('simply_aep_binding_validate', {
        source_dir: ['force-app'],
        type: ['selector'],
      });

      expect(core.scanLocalApexTriggers).not.toHaveBeenCalled();
      const content = result.structuredContent as { recordCount: number; errorCount: number; total: number };
      expect(content.recordCount).toBe(2);
      expect(content.total).toBeGreaterThan(0);
      expect(textOf(result)).toMatch(/^\d+ issue\(s\) in 2 binding\(s\) \(\d+ error, \d+ warning\) \(local\)\.$/);
    });

    it('reports a clean scan', async () => {
      core.scanLocalBindings.mockReturnValue({ records: [binding('IA', 'A', 1)], malformed: [], ambiguous: [] });
      core.scanLocalApexTriggers.mockReturnValue([]);

      const result = await harness.call('simply_aep_binding_validate', { source_dir: ['force-app'] });

      expect(result.structuredContent).toMatchObject({ errorCount: 0, warningCount: 0, items: [], total: 0 });
      expect(textOf(result)).toBe('No issues in 1 binding(s) (local).');
    });
  });

  describe('simply_aep_domain_process_binding_list', () => {
    const record = (
      developerName: string,
      sobject: string,
      isActive = true,
    ): aepCore.RawDomainProcessBindingRecord => ({
      developerName,
      label: developerName,
      sobject,
      sobjectField: 'primary',
      processContext: 'TriggerExecution',
      triggerOperation: 'Before_Insert',
      type: 'Action',
      classToInject: `${developerName}Action`,
      order: 1,
      isActive,
      executeAsynchronous: false,
      logicalInverse: false,
      preventRecursive: false,
      source: 'l',
    });

    it('filters by sobject and active_only', async () => {
      core.scanLocalDomainProcessBindings.mockReturnValue({
        records: [record('A', 'Account'), record('B', 'Account', false), record('C', 'Contact')],
        malformed: [],
        ambiguous: [],
      });

      const result = await harness.call('simply_aep_domain_process_binding_list', {
        source_dir: ['force-app'],
        sobject: ['Account'],
        active_only: true,
      });

      expect(result.structuredContent).toMatchObject({ total: 1, items: [{ developerName: 'A' }] });
    });

    it('says when the framework is not in the org', async () => {
      core.scanOrgDomainProcessBindings.mockResolvedValue({ records: [], malformed: [], ambiguous: [], missing: true });
      const result = await harness.call('simply_aep_domain_process_binding_list', { target_org: 'dev' });
      expect(textOf(result)).toContain('DomainProcessBinding__mdt');
    });
  });

  describe('the remaining list and validate tools', () => {
    it('sorts platform event subscriptions by bus, category, then name', async () => {
      const subscription = (developerName: string, eventBus: string, eventCategory?: string) => ({
        developerName,
        label: developerName,
        eventBus,
        consumer: 'Consumer',
        eventCategory,
        matcherRule: 'MatchEventBusAndCategory' as const,
        isActive: true,
        executeSynchronous: false,
        source: 'l',
      });
      core.scanLocalPlatformEventSubscriptions.mockReturnValue({
        records: [subscription('z', 'B__e'), subscription('b', 'A__e', 'Y'), subscription('a', 'A__e', 'Y')],
        malformed: [],
      });

      const result = await harness.call('simply_aep_platform_event_subscription_list', { source_dir: ['force-app'] });

      const names = (result.structuredContent as { items: Array<{ developerName: string }> }).items.map(
        (item) => item.developerName,
      );
      expect(names).toStrictEqual(['a', 'b', 'z']);
    });

    it('lists field set inclusions from the org', async () => {
      core.scanOrgFieldSetInclusions.mockResolvedValue({
        records: [
          {
            developerName: 'X',
            label: 'X',
            sobject: 'Account',
            sobjectField: 'BindingSObject__c',
            fieldsetName: 'Extra',
            isActive: true,
            source: 'dev@example.com',
          },
        ],
        malformed: [],
        ambiguous: [],
        missing: false,
      } as unknown as Awaited<ReturnType<typeof aepCore.scanOrgFieldSetInclusions>>);

      const result = await harness.call('simply_aep_field_set_inclusion_list', { target_org: 'dev' });

      expect(result.structuredContent).toMatchObject({ source: 'dev@example.com', total: 1 });
    });

    it.each([
      [
        'simply_aep_field_set_inclusion_validate',
        'scanLocalFieldSetInclusions',
        'SelectorConfig_FieldSetInclusion__mdt',
      ],
      [
        'simply_aep_platform_event_subscription_validate',
        'scanLocalPlatformEventSubscriptions',
        'PlatformEvents_Subscription__mdt',
      ],
      ['simply_aep_domain_process_binding_validate', 'scanLocalDomainProcessBindings', 'DomainProcessBinding__mdt'],
    ] as const)('%s says when nothing was found locally', async (tool, scan, type) => {
      const empty = { records: [], malformed: [], ambiguous: [] };
      (core[scan] as unknown as Mock<() => typeof empty>).mockReturnValue(empty);
      const result = await harness.call(tool, { source_dir: ['force-app'] });
      expect(errorCodeOf(result)).toBe('at4dx-not-detected');
      expect(textOf(result)).toContain(type);
    });
  });
});
