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

/* eslint-disable no-await-in-loop */
/* eslint-disable complexity */
import fs from 'node:fs/promises';
import path from 'node:path';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { ComponentSet, SourceComponent } from '@salesforce/source-deploy-retrieve';
import { PermissionSetBuildConfig, PermissionSetBuildConfigSchema } from '../../../schemas/build/permissionConfig.js';
import {
  buildPermissionSetXml,
  FieldPermission,
  ObjectPermission,
  PermissionSetTemplateData,
  RecordTypeVisibility,
  TabSetting,
} from '../../../common/permissionSetXmlTemplate.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-permissions', 'simply.permissions.build');

/** Baseline permission profile applied before `--config` overrides. */
type PermissionSetType = 'read-only' | 'view-all' | 'modify-all';
/** The subset of a parsed `CustomField` metadata file's contents this command reads. */
type CustomFieldXml = { CustomField?: { required?: string | boolean; type?: string } };

/** Where the generated permission set was written, and how many permissions it grants. */
export type PermissionsBuildResult = {
  path: string;
  objectPermissionCount: number;
  fieldPermissionCount: number;
};

/**
 * Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally)
 * record types, then generates a permission set XML file with a baseline of permissions
 * determined by `--type`. An optional JSON `--config` file can override individual object,
 * field, tab, record type, and user permission settings.
 */
export default class PermissionsBuild extends SfCommand<PermissionsBuildResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    type: Flags.custom<PermissionSetType>({
      options: ['read-only', 'view-all', 'modify-all'],
    })({
      summary: messages.getMessage('flags.type.summary'),
      description: messages.getMessage('flags.type.description'),
      required: true,
    }),
    name: Flags.string({
      summary: messages.getMessage('flags.name.summary'),
      description: messages.getMessage('flags.name.description'),
      char: 'n',
      required: true,
    }),
    directory: Flags.directory({
      summary: messages.getMessage('flags.directory.summary'),
      description: messages.getMessage('flags.directory.description'),
      char: 'd',
      exists: true,
      required: true,
    }),
    config: Flags.file({
      summary: messages.getMessage('flags.config.summary'),
      description: messages.getMessage('flags.config.description'),
      char: 'c',
      exists: true,
    }),
    output: Flags.directory({
      summary: messages.getMessage('flags.output.summary'),
      description: messages.getMessage('flags.output.description'),
      required: true,
    }),
    'include-record-types': Flags.boolean({
      summary: messages.getMessage('flags.include-record-types.summary'),
      description: messages.getMessage('flags.include-record-types.description'),
      default: false,
    }),
    label: Flags.string({
      summary: messages.getMessage('flags.label.summary'),
    }),
    description: Flags.string({
      summary: messages.getMessage('flags.description.summary'),
    }),
  };

  /** @returns The output file path and the number of object/field permissions written. */
  public async run(): Promise<PermissionsBuildResult> {
    const { flags } = await this.parse(PermissionsBuild);

    let config: PermissionSetBuildConfig | undefined;

    if (flags.config) {
      this.spinner.start(messages.getMessage('info.readingConfig'));
      const configContent = await fs.readFile(flags.config, 'utf-8');
      const parsed = PermissionSetBuildConfigSchema.safeParse(JSON.parse(configContent) as unknown);

      if (!parsed.success) {
        throw messages.createError('error.invalidConfig', [parsed.error.message]);
      }

      config = parsed.data;
      this.spinner.stop();
    }

    this.spinner.start(messages.getMessage('info.scanningProject'));

    const objectPermissions = new Map<string, ObjectPermission>();
    const fieldPermissions = new Map<string, Map<string, FieldPermission>>();
    const tabSettings = new Map<string, TabSetting>();
    const recordTypeVisibilities = new Map<string, Map<string, RecordTypeVisibility>>();

    let components: ComponentSet;
    try {
      components = ComponentSet.fromSource(flags.directory);
    } catch (error) {
      throw messages.createError('error.scanFailed', [(error as Error).message]);
    }
    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.compilingPermissions'));

    for (const rawComponent of components) {
      const component = rawComponent as SourceComponent;

      if (component.type.name === 'CustomObject') {
        if (!objectPermissions.has(component.fullName)) {
          objectPermissions.set(component.fullName, {
            object: component.fullName,
            allowCreate: false,
            allowDelete: false,
            allowEdit: false,
            allowRead: true,
            modifyAllRecords: false,
            viewAllRecords: flags.type === 'view-all',
            viewAllFields: false,
          });
        }

        for (const child of component.getChildren()) {
          if (child.type.name === 'CustomField') {
            const fieldContent = await child.parseXml<CustomFieldXml>();
            const customField = fieldContent.CustomField;

            if (customField && (String(customField.required) === 'true' || customField.type === 'MasterDetail')) {
              continue;
            }

            if (!fieldPermissions.has(component.fullName)) {
              fieldPermissions.set(component.fullName, new Map());
            }
            fieldPermissions.get(component.fullName)?.set(child.fullName, {
              field: `${component.fullName}.${child.fullName}`,
              readable: true,
              editable: false,
            });
          } else if (child.type.name === 'RecordType' && flags['include-record-types']) {
            if (!recordTypeVisibilities.has(component.fullName)) {
              recordTypeVisibilities.set(component.fullName, new Map());
            }
            recordTypeVisibilities.get(component.fullName)?.set(child.fullName, {
              recordType: `${component.fullName}.${child.fullName}`,
              visible: true,
            });
          }
        }
      } else if (component.type.name === 'CustomField') {
        const fieldContent = await component.parseXml<CustomFieldXml>();
        const customField = fieldContent.CustomField;

        if (customField && (String(customField.required) === 'true' || customField.type === 'MasterDetail')) {
          continue;
        }

        const objectName = component.parent?.name ?? '';
        if (!fieldPermissions.has(objectName)) {
          fieldPermissions.set(objectName, new Map());
        }
        if (!fieldPermissions.get(objectName)?.has(component.name)) {
          fieldPermissions.get(objectName)?.set(component.name, {
            field: `${objectName}.${component.name}`,
            readable: true,
            editable: false,
          });
        }
      } else if (component.type.name === 'CustomTab') {
        if (!tabSettings.has(component.name)) {
          tabSettings.set(component.name, {
            tab: component.name,
            visible: true,
          });
        }
      }
    }

    if (flags.type === 'read-only' || flags.type === 'view-all') {
      for (const permission of objectPermissions.values()) {
        permission.viewAllFields = true;
      }
    }

    if (flags.type === 'modify-all') {
      for (const permission of objectPermissions.values()) {
        permission.allowCreate = true;
        permission.allowDelete = true;
        permission.allowEdit = true;
        permission.allowRead = true;
        permission.modifyAllRecords = true;
        permission.viewAllRecords = true;
      }
      for (const fields of fieldPermissions.values()) {
        for (const field of fields.values()) {
          field.editable = true;
          field.readable = true;
        }
      }
    }

    if (config?.objects) {
      for (const [objectName, objectPerms] of Object.entries(config.objects)) {
        if (!objectPermissions.has(objectName)) {
          objectPermissions.set(objectName, {
            object: objectName,
            allowCreate: false,
            allowDelete: false,
            allowEdit: false,
            allowRead: false,
            modifyAllRecords: false,
            viewAllRecords: false,
            viewAllFields: false,
          });
        }
        const permission = objectPermissions.get(objectName);
        if (permission) {
          permission.allowRead = objectPerms.read ?? permission.allowRead;
          permission.allowCreate = objectPerms.create ?? permission.allowCreate;
          permission.allowEdit = objectPerms.edit ?? permission.allowEdit;
          permission.allowDelete = objectPerms.delete ?? permission.allowDelete;
          permission.modifyAllRecords = objectPerms.modifyAll ?? permission.modifyAllRecords;
          permission.viewAllRecords = objectPerms.viewAll ?? permission.viewAllRecords;
          permission.viewAllFields = objectPerms.viewAllFields ?? permission.viewAllFields;
        }
      }
    }

    if (config?.fields) {
      for (const [fullFieldName, fieldPerms] of Object.entries(config.fields)) {
        const [objectName, fieldName] = fullFieldName.split('.');
        if (!fieldPermissions.has(objectName)) {
          fieldPermissions.set(objectName, new Map());
        }
        const fieldMap = fieldPermissions.get(objectName);
        let field = fieldMap?.get(fieldName);
        if (!field) {
          field = { field: fullFieldName, readable: false, editable: false };
          fieldMap?.set(fieldName, field);
        }
        field.readable = fieldPerms.readable ?? field.readable;
        field.editable = fieldPerms.editable ?? field.editable;
      }
    }

    if (config?.tabs) {
      for (const [tabName, tabPerms] of Object.entries(config.tabs)) {
        if (!tabSettings.has(tabName)) {
          tabSettings.set(tabName, { tab: tabName, visible: false });
        }
        const setting = tabSettings.get(tabName);
        if (setting) {
          setting.visible = tabPerms.visible ?? setting.visible;
        }
      }
    }

    if (config?.recordTypeVisibilities) {
      for (const [fullRecordTypeName, rtPerms] of Object.entries(config.recordTypeVisibilities)) {
        const [objectName, recordTypeName] = fullRecordTypeName.split('.');
        if (!recordTypeVisibilities.has(objectName)) {
          recordTypeVisibilities.set(objectName, new Map());
        }
        const rtMap = recordTypeVisibilities.get(objectName);
        let recordType = rtMap?.get(recordTypeName);
        if (!recordType) {
          recordType = { recordType: fullRecordTypeName, visible: false };
          rtMap?.set(recordTypeName, recordType);
        }
        recordType.visible = rtPerms.visible ?? recordType.visible;
      }
    }

    const label = flags.label ?? flags.name;
    const outputFilename = `${flags.name}.permissionset-meta.xml`;
    const outputPath = path.join(flags.output, outputFilename);

    const templateData: PermissionSetTemplateData = {
      label,
      description: flags.description,
      objectPermissions: [],
      fieldPermissions: [],
      tabSettings: [],
      recordTypeVisibilities: [],
      userPermissions: [],
    };

    for (const objectPermission of objectPermissions.values()) {
      templateData.objectPermissions.push(objectPermission);
    }

    for (const [objectName, fields] of fieldPermissions.entries()) {
      const objectPerm = objectPermissions.get(objectName);
      if (objectPerm?.viewAllFields) {
        continue;
      }
      for (const fieldPermission of fields.values()) {
        templateData.fieldPermissions.push(fieldPermission);
      }
    }

    for (const tabSetting of tabSettings.values()) {
      templateData.tabSettings.push(tabSetting);
    }

    for (const recordTypes of recordTypeVisibilities.values()) {
      for (const recordType of recordTypes.values()) {
        templateData.recordTypeVisibilities.push(recordType);
      }
    }

    if (config?.userPermissions) {
      for (const [name, enabled] of Object.entries(config.userPermissions)) {
        templateData.userPermissions.push({ name, enabled });
      }
    }

    templateData.objectPermissions.sort((a, b) => a.object.localeCompare(b.object));
    templateData.fieldPermissions.sort((a, b) => a.field.localeCompare(b.field));
    templateData.tabSettings.sort((a, b) => a.tab.localeCompare(b.tab));
    templateData.recordTypeVisibilities.sort((a, b) => a.recordType.localeCompare(b.recordType));
    templateData.userPermissions.sort((a, b) => a.name.localeCompare(b.name));

    this.spinner.stop();

    this.spinner.start(messages.getMessage('info.writingFile'));
    const xml = buildPermissionSetXml(templateData);
    await fs.mkdir(flags.output, { recursive: true });
    await fs.writeFile(outputPath, xml);
    this.spinner.stop();

    this.info(messages.getMessage('info.fileGenerated', [outputPath]));

    return {
      path: outputPath,
      objectPermissionCount: templateData.objectPermissions.length,
      fieldPermissionCount: templateData.fieldPermissions.length,
    };
  }
}
