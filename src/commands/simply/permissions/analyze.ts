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

import fs from 'node:fs/promises';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { chunk, queryRecords } from '@simplysf/simply-core';
import {
  buildPermissionsReportHtml,
  FieldPermissionEntry,
  GroupedPermissionsData,
  ObjectPermissionEntry,
  PermissionSetGroupReportEntry,
  PermissionSetReportEntry,
} from '../../../common/permissionsReportTemplate.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-permissions', 'simply.permissions.analyze');

/** A queried `PermissionSet` record. `Type === 'Group'` marks a permission set group's companion set. */
type PermissionSetRecord = {
  Id: string;
  Name: string;
  Label: string;
  NamespacePrefix?: string;
  IsCustom: boolean;
  Description?: string;
  Type: string;
};

/** A queried `PermissionSetGroup` record. */
type PermissionSetGroupRecord = {
  Id: string;
  DeveloperName: string;
  MasterLabel: string;
  NamespacePrefix?: string;
  Description?: string;
};

/** Maximum number of IDs per `WHERE Id IN (...)` chunk for the Tooling API `Package2Member` query. */
const ID_CHUNK_SIZE = 100;

/**
 * queryRecords() always yields string-valued records (matching Bulk API v2's CSV output, even
 * when it took the REST path), but ObjectPermissions/FieldPermissions carry boolean columns, so
 * cast the "true"/"false" strings back to real booleans.
 *
 * @param record - A raw, string-valued record yielded by `queryRecords()`.
 * @returns The record with `"true"`/`"false"` string values converted to real booleans.
 */
function castBooleanStrings(record: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, value === 'true' ? true : value === 'false' ? false : value]),
  );
}

/** Where the report was written, and how many permission sets/groups it covers. */
export type PermissionsAnalyzeResult = {
  outputFile: string;
  permissionSetCount: number;
  permissionSetGroupCount: number;
};

/**
 * Generates an HTML report of every permission set and permission set group in the target org,
 * grouped by installed package, including their object and field permissions.
 */
export default class PermissionsAnalyze extends SfCommand<PermissionsAnalyzeResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'api-version': Flags.orgApiVersion(),
    filter: Flags.string({
      summary: messages.getMessage('flags.filter.summary'),
      description: messages.getMessage('flags.filter.description'),
      char: 'f',
      multiple: true,
    }),
    output: Flags.string({
      summary: messages.getMessage('flags.output.summary'),
      description: messages.getMessage('flags.output.description'),
      default: 'permissions_report.html',
    }),
    'target-org': Flags.requiredOrg(),
  };

  /** @returns The output file path and the number of permission sets/groups reported on. */
  public async run(): Promise<PermissionsAnalyzeResult> {
    const { flags } = await this.parse(PermissionsAnalyze);

    const connection = flags['target-org']?.getConnection(flags['api-version']);

    if (!connection) {
      throw messages.createError('error.targetOrgConnectionFailed');
    }

    this.spinner.start(messages.getMessage('info.fetchingPermissionSets'));
    const psResult = await connection.autoFetchQuery(
      'SELECT Id, Name, Label, NamespacePrefix, IsCustom, Description, Type FROM PermissionSet WHERE IsOwnedByProfile = false',
    );
    const psgResult = await connection.autoFetchQuery(
      'SELECT Id, DeveloperName, MasterLabel, NamespacePrefix, Description FROM PermissionSetGroup',
    );
    this.spinner.stop();

    const allPermissionSets = psResult.records as unknown as PermissionSetRecord[];
    const allPermissionSetGroups = psgResult.records as unknown as PermissionSetGroupRecord[];

    const companionPermissionSets = allPermissionSets.filter((ps) => ps.Type === 'Group');
    const companionPSMap = new Map(companionPermissionSets.map((ps) => [ps.Name, ps]));
    const permissionSetMap = new Map(allPermissionSets.map((ps) => [ps.Id, ps]));

    const filterSet = flags.filter && flags.filter.length > 0 ? new Set(flags.filter) : undefined;

    // Apply the filter up front so every downstream query only covers the permission sets/groups that survive it.
    const regularPermissionSets = allPermissionSets.filter(
      (ps) => ps.Type !== 'Group' && (!filterSet || filterSet.has(ps.Name)),
    );
    const permissionSetGroups = allPermissionSetGroups.filter((psg) => !filterSet || filterSet.has(psg.DeveloperName));
    const companionPermissionSetsInScope = permissionSetGroups
      .map((psg) => companionPSMap.get(psg.DeveloperName))
      .filter((ps): ps is PermissionSetRecord => ps !== undefined);
    const permissionSetsInScope = [...regularPermissionSets, ...companionPermissionSetsInScope];

    this.spinner.start(messages.getMessage('info.resolvingPackages'));
    const packageMap = new Map<string, string>();
    permissionSetsInScope.forEach((ps) => packageMap.set(ps.Id, ps.NamespacePrefix ?? 'Local (Unpackaged)'));
    permissionSetGroups.forEach((psg) => packageMap.set(psg.Id, psg.NamespacePrefix ?? 'Local (Unpackaged)'));

    const allIds = [...permissionSetsInScope.map((r) => r.Id), ...permissionSetGroups.map((r) => r.Id)];

    for (const idChunk of chunk(allIds, ID_CHUNK_SIZE)) {
      const idsClause = idChunk.map((id) => `'${id.substring(0, 15)}'`).join(',');

      try {
        // eslint-disable-next-line no-await-in-loop
        const pkgResult = await connection.autoFetchQuery(
          `SELECT SubjectId, SubscriberPackage.Name FROM Package2Member WHERE SubjectId IN (${idsClause})`,
          { tooling: true },
        );

        const pkgRecords = pkgResult.records as unknown as Array<{
          SubjectId: string;
          SubscriberPackage: { Name: string };
        }>;

        pkgRecords.forEach((r) => {
          const fullId = allIds.find((id) => id.startsWith(r.SubjectId));
          if (fullId) {
            packageMap.set(fullId, r.SubscriberPackage.Name);
          }
        });
      } catch {
        // Tooling API query for Package2Member can fail for orgs without unlocked packages; ignore.
      }
    }
    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.fetchingPermissions'));
    const objectPermissions = new Map<string, ObjectPermissionEntry[]>();
    const fieldPermissions = new Map<string, FieldPermissionEntry[]>();
    const psIds = permissionSetsInScope.map((r) => r.Id);

    if (psIds.length > 0) {
      // queryRecords() sizes each query itself (via SELECT COUNT()) and picks REST or Bulk API v2
      // accordingly, so there's no need to chunk the ID list here the way the Tooling API query
      // above still has to for REST's WHERE-clause length limits.
      const idsClause = psIds.map((id) => `'${id}'`).join(',');

      // Run both queries concurrently rather than sequentially draining one before starting the
      // other — each independently decides REST vs. Bulk and neither depends on the other.
      await Promise.all([
        (async (): Promise<void> => {
          for await (const record of queryRecords(
            connection,
            `SELECT ParentId, SobjectType, PermissionsRead, PermissionsCreate, PermissionsEdit, PermissionsDelete, PermissionsViewAllRecords, PermissionsModifyAllRecords FROM ObjectPermissions WHERE ParentId IN (${idsClause})`,
          )) {
            const r = castBooleanStrings(record) as ObjectPermissionEntry & { ParentId: string };
            if (!objectPermissions.has(r.ParentId)) {
              objectPermissions.set(r.ParentId, []);
            }
            objectPermissions.get(r.ParentId)?.push(r);
          }
        })(),
        (async (): Promise<void> => {
          for await (const record of queryRecords(
            connection,
            `SELECT ParentId, SobjectType, Field, PermissionsRead, PermissionsEdit FROM FieldPermissions WHERE ParentId IN (${idsClause})`,
          )) {
            const r = castBooleanStrings(record) as FieldPermissionEntry & { ParentId: string };
            if (!fieldPermissions.has(r.ParentId)) {
              fieldPermissions.set(r.ParentId, []);
            }
            fieldPermissions.get(r.ParentId)?.push(r);
          }
        })(),
      ]);
    }
    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.mappingGroups'));
    const groupComponents = new Map<string, string[]>();
    const psgIds = permissionSetGroups.map((r) => r.Id);

    if (psgIds.length > 0) {
      const idsClause = psgIds.map((id) => `'${id}'`).join(',');

      for await (const record of queryRecords(
        connection,
        `SELECT PermissionSetGroupId, PermissionSetId FROM PermissionSetGroupComponent WHERE PermissionSetGroupId IN (${idsClause})`,
      )) {
        if (!groupComponents.has(record.PermissionSetGroupId)) {
          groupComponents.set(record.PermissionSetGroupId, []);
        }
        groupComponents.get(record.PermissionSetGroupId)?.push(record.PermissionSetId);
      }
    }
    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.generatingReport'));

    const groupedData: GroupedPermissionsData = new Map();

    /** Add a permission set or group's report entry into `groupedData`, under its owning package. */
    const addToGroup = (
      pkgName: string,
      type: 'permissionSets' | 'permissionSetGroups',
      data: PermissionSetReportEntry | PermissionSetGroupReportEntry,
    ): void => {
      if (!groupedData.has(pkgName)) {
        groupedData.set(pkgName, { permissionSets: [], permissionSetGroups: [] });
      }
      const group = groupedData.get(pkgName);
      if (type === 'permissionSets') {
        group?.permissionSets.push(data as PermissionSetReportEntry);
      } else {
        group?.permissionSetGroups.push(data as PermissionSetGroupReportEntry);
      }
    };

    regularPermissionSets.forEach((ps) => {
      const pkg = packageMap.get(ps.Id) ?? 'Local (Unpackaged)';
      addToGroup(pkg, 'permissionSets', {
        Id: ps.Id,
        Name: ps.Name,
        Label: ps.Label,
        Description: ps.Description,
        objectPerms: objectPermissions.get(ps.Id) ?? [],
        fieldPerms: fieldPermissions.get(ps.Id) ?? [],
      });
    });

    permissionSetGroups.forEach((psg) => {
      const pkg = packageMap.get(psg.Id) ?? 'Local (Unpackaged)';
      const companionPs = companionPSMap.get(psg.DeveloperName);
      const companionPerms = companionPs
        ? {
            objectPerms: objectPermissions.get(companionPs.Id) ?? [],
            fieldPerms: fieldPermissions.get(companionPs.Id) ?? [],
          }
        : { objectPerms: [], fieldPerms: [] };

      addToGroup(pkg, 'permissionSetGroups', {
        Id: psg.Id,
        DeveloperName: psg.DeveloperName,
        MasterLabel: psg.MasterLabel,
        Description: psg.Description,
        components: (groupComponents.get(psg.Id) ?? []).map((psId) => permissionSetMap.get(psId)?.Name ?? psId),
        ...companionPerms,
      });
    });

    const html = buildPermissionsReportHtml({
      username: connection.getUsername() ?? '',
      reportDate: new Date().toLocaleString(),
      groupedData,
    });

    await fs.writeFile(flags.output, html);
    this.spinner.stop();

    const permissionSetCount = [...groupedData.values()].reduce((sum, d) => sum + d.permissionSets.length, 0);
    const permissionSetGroupCount = [...groupedData.values()].reduce((sum, d) => sum + d.permissionSetGroups.length, 0);

    this.info(messages.getMessage('info.reportGenerated', [flags.output]));

    return { outputFile: flags.output, permissionSetCount, permissionSetGroupCount };
  }
}
