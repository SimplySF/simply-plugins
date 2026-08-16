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
import fsp from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
import XMLBuilder from 'fast-xml-builder';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import {
  getObjectInfo,
  getFieldInfo,
  getValuesInfo,
  type ExcelFieldRow,
  type ExcelObjectInfo,
} from '../../../common/schemaGenerateExcelParser.js';
import {
  FIELD_TYPES_WITHOUT_REQUIRED_PROP,
  IMPLEMENTED_FIELD_TYPES,
  type NormalizedFieldData,
  type ObjectData,
  type PicklistValueSet,
  type PicklistValueSettingEntry,
  type RecordTypeData,
} from '../../../common/schemaGenerateTypes.js';
import { blankToUndefined, toBoolean, XML_BUILDER_OPTIONS } from '../../../common/schemaGenerateUtils.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-schema', 'simply.schema.generate');

/** A row of the flat CSV input; every value arrives as a string. */
type CsvRecord = Record<string, string>;

/** Everything found in the CSV for a single object, grouped by its `Type` column. */
type ObjectBucket = {
  object: CsvRecord | undefined;
  fields: CsvRecord[];
  recordTypes: CsvRecord[];
};

/**
 * Builds the `valueSet` structure for `Picklist`/`MultiselectPicklist` fields. Works for both the
 * CSV flow (a semicolon-separated `ValueSet` column) and the Excel flow (a dedicated values
 * worksheet referenced by `ValueSetSheet`).
 *
 * @param fieldData - The normalized field data.
 * @param workbook - The Excel workbook instance, if in the Excel flow.
 * @returns The `valueSet` node structure, or `undefined` if the field isn't a picklist or has no
 * value configuration.
 */
export function buildPicklistValueSet(
  fieldData: NormalizedFieldData,
  workbook?: ExcelJS.Workbook,
): PicklistValueSet | undefined {
  const isPicklist = fieldData.FieldType === 'Picklist' || fieldData.FieldType === 'MultiselectPicklist';
  if (!isPicklist) return undefined;

  const valueSetObj: PicklistValueSet = {
    controllingField: fieldData.ValueSetControllingField ?? undefined,
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an explicit `false` falls through to the ValueSetName check, matching the source tool this was ported from
    restricted: toBoolean(fieldData.RestrictedPicklist) || Boolean(fieldData.ValueSetName),
    valueSetName: fieldData.ValueSetName ?? undefined,
  };

  if (fieldData.ValueSetSheet && workbook) {
    const valuesWorksheet = workbook.getWorksheet(fieldData.ValueSetSheet);
    if (valuesWorksheet) {
      const valuesInfo = getValuesInfo(valuesWorksheet);
      valueSetObj.valueSetDefinition = {
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- keep explicit `false` and "unset" both resolving to `false` here
        sorted: toBoolean(fieldData.ValueSetDefinitionSorted) || false,
        value: valuesInfo.map((val) => ({
          fullName: val.fullName,
          default: val.default,
          label: val.label,
        })),
      };

      if (fieldData.ValueSetControllingField) {
        const valueSettings: PicklistValueSettingEntry[] = [];
        for (const val of valuesInfo) {
          if (val.controllingFieldValues && val.controllingFieldValues.length > 0) {
            valueSettings.push({
              controllingFieldValue: val.controllingFieldValues,
              valueName: val.fullName,
            });
          }
        }
        if (valueSettings.length > 0) {
          valueSetObj.valueSettings = valueSettings;
        }
      }
    }
  } else if (fieldData.ValueSet) {
    const values = fieldData.ValueSet.split(';')
      .map((v) => v.trim())
      .filter((v) => v);
    valueSetObj.valueSetDefinition = {
      sorted: false,
      value: values.map((val, index) => ({
        fullName: val,
        default: index === 0,
        label: val,
      })),
    };
  }

  if (valueSetObj.valueSetDefinition || valueSetObj.valueSetName || valueSetObj.controllingField) {
    return valueSetObj;
  }
  return undefined;
}

/**
 * Generates the metadata XML for a custom field. Works for both normalized CSV and Excel field
 * records.
 *
 * @param fieldData - The normalized data for the field.
 * @param workbook - The Excel workbook, if in the Excel flow.
 * @returns The formatted `CustomField` metadata XML.
 */
export function generateFieldXml(fieldData: NormalizedFieldData, workbook?: ExcelJS.Workbook): string {
  const normalized: NormalizedFieldData = { ...fieldData };

  // 1. Normalize case-insensitive field types
  if (normalized.FieldType) {
    const lowerType = normalized.FieldType.toLowerCase();
    if (lowerType === 'url') normalized.FieldType = 'Url';
    else if (lowerType === 'checkbox') normalized.FieldType = 'Checkbox';
    else if (lowerType === 'picklist') normalized.FieldType = 'Picklist';
    else if (lowerType === 'multiselectpicklist') normalized.FieldType = 'MultiselectPicklist';
    else if (lowerType === 'longtextarea') normalized.FieldType = 'LongTextArea';
    else if (lowerType === 'date') normalized.FieldType = 'Date';
    else if (lowerType === 'datetime') normalized.FieldType = 'DateTime';
  }

  // 2. Handle Lookup field types (e.g. 'Lookup(Account)' or 'Lookup')
  const lookupRegex = /^Lookup\((.+)\)$/i;
  const lookupMatch = normalized.FieldType ? lookupRegex.exec(normalized.FieldType) : null;
  if (lookupMatch || normalized.FieldType === 'Lookup') {
    normalized.FieldType = 'Lookup';
    if (lookupMatch) {
      normalized.ReferenceTo = lookupMatch[1].trim();
    }
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- CSV cells arrive as '' not undefined; treat blank as "no value provided"
    normalized.DeleteConstraint = normalized.DeleteConstraint || 'SetNull';

    if (!normalized.RelationshipLabel && !normalized.RelationshipName) {
      normalized.RelationshipLabel = `${normalized.Label ?? normalized.ApiName ?? ''} Records`;
    }
    normalized.RelationshipName =
      blankToUndefined(normalized.RelationshipName) ??
      (normalized.RelationshipLabel ?? 'Records').replace(/\s+/g, '_').replace(/[\W_]+/g, '_');

    normalized.Length = undefined;
  }

  // 3. Prevent invalid tags based on Salesforce field type constraints
  const type = normalized.FieldType;

  if (type === 'Picklist' || type === 'MultiselectPicklist') {
    normalized.Length = undefined;
  }

  if (type === 'Date' || type === 'DateTime') {
    normalized.Precision = undefined;
    normalized.RelationshipName = undefined;
    normalized.RelationshipLabel = undefined;
  }

  if (type === 'Url') {
    normalized.Length = undefined;
  }

  if (type === 'LongTextArea') {
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- Salesforce requires real values here; CSV blanks arrive as '' not undefined
    normalized.VisibleLines = normalized.VisibleLines || 3;
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- see above
    normalized.Length = normalized.Length || 32768;
  }

  if (type === 'Formula' || normalized.Formula) {
    if (type === 'Formula') {
      normalized.FieldType = 'Checkbox';
    }
    normalized.Required = undefined;
  }
  // --- End metadata normalization & sanitization ---

  const fieldObj: Record<string, unknown> = {
    fullName: normalized.ApiName,
    label: normalized.Label,
    type: normalized.FieldType,
    description: blankToUndefined(normalized.Description),
    inlineHelpText: blankToUndefined(normalized.InlineHelpText),
    required: toBoolean(normalized.Required),
    externalId: toBoolean(normalized.ExternalId),
    trackHistory: toBoolean(normalized.TrackHistory),
    trackTrending: toBoolean(normalized.TrackTrending),
    unique: toBoolean(normalized.Unique),
    formula: blankToUndefined(normalized.Formula),
    formulaTreatBlanksAs: blankToUndefined(normalized.FormulaTreatBlanksAs),
    length: normalized.Length ? parseInt(String(normalized.Length), 10) : undefined,
    precision: normalized.Precision ? parseInt(String(normalized.Precision), 10) : undefined,
    scale: normalized.Scale ? parseInt(String(normalized.Scale), 10) : undefined,
    visibleLines: normalized.VisibleLines ? parseInt(String(normalized.VisibleLines), 10) : undefined,
    displayFormat: blankToUndefined(normalized.DisplayFormat),
    startingNumber: normalized.StartingNumber ? parseInt(String(normalized.StartingNumber), 10) : undefined,
    referenceTo: blankToUndefined(normalized.ReferenceTo),
    relationshipLabel: blankToUndefined(normalized.RelationshipLabel),
    relationshipName: blankToUndefined(normalized.RelationshipName),
    deleteConstraint: blankToUndefined(normalized.DeleteConstraint),
    valueSet: buildPicklistValueSet(normalized, workbook),
  };

  const builder = new XMLBuilder(XML_BUILDER_OPTIONS);
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    CustomField: {
      '@_xmlns': 'http://soap.sforce.com/2006/04/metadata',
      ...Object.fromEntries(Object.entries(fieldObj).filter(([, v]) => v !== undefined)),
    },
  });
}

/**
 * Generates the metadata XML for a record type.
 *
 * @param recordTypeData - The record type's data from the CSV.
 * @returns The formatted `RecordType` metadata XML.
 */
function generateRecordTypeXml(recordTypeData: RecordTypeData): string {
  const rtObj: Record<string, unknown> = {
    fullName: recordTypeData.ApiName,
    label: recordTypeData.Label,
    active: toBoolean(recordTypeData.Active),
    description: blankToUndefined(recordTypeData.Description),
  };

  if (recordTypeData.PicklistAssignments) {
    const assignments = recordTypeData.PicklistAssignments.split('|')
      .map((a) => a.trim())
      .filter((a) => a);
    const picklistValues: Array<{ picklist: string; values: Array<{ fullName: string; default: boolean }> }> = [];

    for (const assignment of assignments) {
      const [picklist, valuesStr] = assignment.split(':');
      if (picklist && valuesStr) {
        const values = valuesStr
          .split(';')
          .map((v) => v.trim())
          .filter((v) => v);
        picklistValues.push({
          picklist,
          values: values.map((v, index) => ({ fullName: v, default: index === 0 })),
        });
      }
    }

    rtObj.picklistValues = picklistValues;
  }

  const builder = new XMLBuilder(XML_BUILDER_OPTIONS);
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    RecordType: {
      '@_xmlns': 'http://soap.sforce.com/2006/04/metadata',
      ...Object.fromEntries(Object.entries(rtObj).filter(([, v]) => v !== undefined)),
    },
  });
}

/**
 * Generates the metadata XML for a custom object. Works for both CSV and Excel configurations.
 *
 * @param objectData - The normalized data for the object.
 * @param fields - The object's fields, used to seed the search-results layout.
 * @returns The formatted `CustomObject` metadata XML.
 */
export function generateObjectXml(objectData: ObjectData, fields: Array<{ ApiName?: string }>): string {
  const searchResultsAdditionalFields = fields
    .slice(0, 4)
    .map((f) => f.ApiName)
    .filter((apiName): apiName is string => Boolean(apiName));
  searchResultsAdditionalFields.push('CREATED_DATE', 'LAST_UPDATE');

  const obj: Record<string, unknown> = {
    allowInChatterGroups: false,
    compactLayoutAssignment: 'SYSTEM',
    deploymentStatus: blankToUndefined(objectData.DeploymentStatus) ?? 'Deployed',
    description: blankToUndefined(objectData.Description),
    enableActivities: toBoolean(objectData.EnableActivities),
    enableBulkApi: toBoolean(objectData.EnableBulkApi),
    enableFeeds: toBoolean(objectData.EnableFeeds),
    enableHistory: toBoolean(objectData.EnableHistory),
    enableLicensing: false,
    enableReports: toBoolean(objectData.EnableReports),
    enableSearch: true,
    enableSharing: toBoolean(objectData.EnableSharing),
    enableStreamingApi: toBoolean(objectData.EnableStreamingApi),
    externalSharingModel: blankToUndefined(objectData.ExternalSharingModel) ?? 'ReadWrite',
    label: objectData.Label,
    nameField: {
      label: blankToUndefined(objectData.NameFieldLabel) ?? `${objectData.Label ?? ''} Name`,
      type: blankToUndefined(objectData.NameFieldType) ?? 'Text',
      displayFormat: blankToUndefined(objectData.NameFieldDisplayFormat),
      startingNumber: objectData.NameFieldStartingNumber
        ? parseInt(String(objectData.NameFieldStartingNumber), 10)
        : undefined,
    },
    pluralLabel: blankToUndefined(objectData.PluralLabel) ?? `${objectData.Label ?? ''}s`,
    searchLayouts: { searchResultsAdditionalFields },
    sharingModel: blankToUndefined(objectData.SharingModel) ?? 'ReadWrite',
    visibility: blankToUndefined(objectData.Visibility) ?? 'Public',
  };

  const builder = new XMLBuilder(XML_BUILDER_OPTIONS);
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    CustomObject: {
      '@_xmlns': 'http://soap.sforce.com/2006/04/metadata',
      ...Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)),
    },
  });
}

/**
 * Normalizes a raw `fields` worksheet row into the unified field metadata shape, deriving an API
 * name (and, for lookups, a relationship name) from the label when one isn't explicitly given.
 *
 * @param rawField - The raw parsed field row from the Excel `fields` worksheet.
 * @param appPrefix - The object's app/package prefix, applied to derived API names.
 * @param businessDataSteward - The business data steward, recorded in the generated description.
 * @returns The normalized field data.
 */
export function normalizeExcelField(
  rawField: ExcelFieldRow,
  appPrefix: string,
  businessDataSteward: string | undefined,
): NormalizedFieldData {
  // Every dynamic column on an ExcelFieldRow is a string (see ExcelFieldRow's doc comment); only
  // the fixed `excelRow` property is a number, and it's not read here.
  const field = rawField as unknown as Record<string, string | undefined>;

  let apiName = field.apiName_optional ? field.apiName_optional.trim() : '';
  if (apiName.length === 0) {
    apiName = `${appPrefix}_${field.label ?? ''}`.replace(/\s+/g, '_').replace(/[\W_]+/g, '_') + '__c';
  } else if (!apiName.startsWith(`${appPrefix}_`)) {
    apiName = `${appPrefix}_${apiName}`;
  }
  if (!apiName.endsWith('__c')) {
    apiName += '__c';
  }
  apiName = apiName.replace('___c', '__c');

  const descriptionText = field.description ?? '';
  const fieldDescription = [
    `Description: ${descriptionText}`,
    '        Usage Notes: See Description.',
    '        Business Logic: See Description.',
    `        Contains PII: ${field.contains_PII ?? ''}`,
    `        Technical Notes: ${field.technical_notes ?? ''}`,
    `        Derived From: ${field.derived_from ?? ''}`,
    `        Business Data Steward: ${businessDataSteward ?? ''}`,
  ].join('\n');

  const normalizedField: NormalizedFieldData = {
    ApiName: apiName,
    Label: field.label,
    FieldType: field.type,
    Description: fieldDescription,
    InlineHelpText: descriptionText,
    Required: field.required,
    ExternalId: field.externalId,
    TrackHistory: field.trackHistory,
    TrackTrending: false,
    Unique: field.unique,
    Formula: field.formula,
    FormulaTreatBlanksAs: field.formulaTreatBlanksAs,
    Length: field.length,
    Precision: field.precision,
    Scale: field.scale,
    VisibleLines: field.visibleLines,
    DisplayFormat: field.displayFormat,
    StartingNumber: field.startingNumber,
    ReferenceTo: field.referenceTo,
    RelationshipLabel: field.relationshipLabel,
    RelationshipName: field.relationshipName,
    DeleteConstraint: field.deleteConstraint,
    ValueSetSheet: field.valueSetSheet,
    ValueSetName: field.valueSetName,
    RestrictedPicklist: field.valueSetRestricted,
    ValueSetDefinitionSorted: field.valueSetDefinitionSorted,
    ValueSetControllingField: field.valueSetControllingField,
  };

  if (field.type === 'Lookup') {
    normalizedField.DeleteConstraint = field.deleteConstraint ?? 'SetNull';
    let relationshipApiName = field.relationshipName ? field.relationshipName.trim() : '';
    if (relationshipApiName.length === 0) {
      relationshipApiName = `${appPrefix}_${field.relationshipLabel ?? ''}`
        .replace(/\s+/g, '_')
        .replace(/[\W_]+/g, '_');
    } else if (!relationshipApiName.startsWith(`${appPrefix}_`)) {
      relationshipApiName = `${appPrefix}_${relationshipApiName}`;
    }
    normalizedField.RelationshipName = relationshipApiName;
  }

  if (FIELD_TYPES_WITHOUT_REQUIRED_PROP.has(field.type ?? '') || field.formula) {
    normalizedField.Required = undefined;
  }

  return normalizedField;
}

/**
 * Normalizes the `object` worksheet's raw properties into the unified object metadata shape.
 *
 * @param sObject - The parsed raw sObject properties.
 * @returns The normalized object data.
 */
export function normalizeExcelObject(sObject: ExcelObjectInfo): ObjectData {
  return {
    Label: sObject.label,
    PluralLabel: sObject.pluralLabel,
    DeploymentStatus: sObject.visibility === 'Protected' ? 'InDevelopment' : 'Deployed',
    Description: sObject.description,
    EnableActivities: sObject.enableActivities,
    EnableBulkApi: sObject.enableBulkApi,
    EnableFeeds: sObject.enableFeeds,
    EnableHistory: sObject.enableHistory,
    EnableReports: sObject.enableReports,
    EnableSharing: sObject.enableSharing,
    EnableStreamingApi: sObject.enableStreamingApi,
    SharingModel: sObject.sharingModel,
    ExternalSharingModel: sObject.externalSharingModel,
    NameFieldLabel: sObject.nameFieldLabel,
    NameFieldType: sObject.nameFieldType,
    NameFieldDisplayFormat: sObject.nameFieldDisplayFormat,
    NameFieldStartingNumber: sObject.nameFieldStartingNumber,
    Visibility: sObject.visibility,
  };
}

/**
 * Generates `CustomObject`/`CustomField` metadata from an Excel workbook: an `object` worksheet
 * describing the sObject, a `fields` worksheet describing its fields, and optional per-picklist
 * values worksheets referenced by field rows.
 *
 * @param filePath - The path to the `.xlsx`/`.xls` workbook.
 * @param outputDir - The directory to write generated metadata into.
 * @returns The generated object's API name and how many fields were generated for it.
 */
async function generateSchemaFromExcel(
  filePath: string,
  outputDir: string,
): Promise<{ objectName: string; fieldCount: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sObject = getObjectInfo(workbook);
  if (!sObject.apiName) {
    throw messages.createError('error.missingObjectWorksheet');
  }

  const objectName = sObject.apiName;
  const objectPath = path.join(outputDir, objectName);
  const fieldsPath = path.join(objectPath, 'fields');

  await fsp.rm(objectPath, { force: true, recursive: true });
  await fsp.mkdir(fieldsPath, { recursive: true });

  const normalizedObject = normalizeExcelObject(sObject);
  const fieldsArray = getFieldInfo(workbook);

  const targetFields = fieldsArray
    .filter((field) => IMPLEMENTED_FIELD_TYPES.has(String(field.type ?? '').trim()))
    .map((field) => normalizeExcelField(field, sObject.App_Prefix ?? '', sObject.business_data_steward));

  const objectXml = generateObjectXml(normalizedObject, targetFields);
  await fsp.writeFile(path.join(objectPath, `${objectName}.object-meta.xml`), objectXml);

  for (const field of targetFields) {
    const fieldXml = generateFieldXml(field, workbook);
    await fsp.writeFile(path.join(fieldsPath, `${field.ApiName ?? 'unknown'}.field-meta.xml`), fieldXml);
  }

  return { objectName, fieldCount: targetFields.length };
}

/** Where the generated metadata was written, and how many objects/fields/record types it covers. */
export type SchemaGenerateResult = {
  objectCount: number;
  fieldCount: number;
  recordTypeCount: number;
  outputDir: string;
};

/**
 * Generates Salesforce `CustomObject`/`CustomField`/`RecordType` metadata from a CSV or Excel
 * schema definition file.
 */
export default class SchemaGenerate extends SfCommand<SchemaGenerateResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    file: Flags.file({
      summary: messages.getMessage('flags.file.summary'),
      description: messages.getMessage('flags.file.description'),
      char: 'f',
      exists: true,
      required: true,
    }),
    'output-dir': Flags.directory({
      summary: messages.getMessage('flags.output-dir.summary'),
      char: 'd',
      required: true,
    }),
  };

  /** @returns Where the generated metadata was written, and how many objects/fields/record types it covers. */
  public async run(): Promise<SchemaGenerateResult> {
    const { flags } = await this.parse(SchemaGenerate);

    const filePath = flags.file;
    const outputDir = flags['output-dir'];

    const isExcel = filePath.toLowerCase().endsWith('.xlsx') || filePath.toLowerCase().endsWith('.xls');

    if (isExcel) {
      this.spinner.start(messages.getMessage('info.readingExcelFile', [filePath]));
      let result: { objectName: string; fieldCount: number };
      try {
        result = await generateSchemaFromExcel(filePath, outputDir);
      } catch (error) {
        this.spinner.stop();
        throw messages.createError('error.generationFailed', [(error as Error).message]);
      }
      this.spinner.stop();

      this.info(messages.getMessage('info.complete', [1, result.fieldCount, 0, outputDir]));

      return { objectCount: 1, fieldCount: result.fieldCount, recordTypeCount: 0, outputDir };
    }

    this.spinner.start(messages.getMessage('info.readingCsvFile', [filePath]));
    let csvContent: string;
    try {
      csvContent = await fsp.readFile(filePath, 'utf-8');
    } catch (error) {
      this.spinner.stop();
      throw messages.createError('error.readFileFailed', [(error as Error).message]);
    }

    let records: CsvRecord[];
    try {
      // eslint-disable-next-line camelcase -- csv-parse's option name, not ours to rename
      records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
    } catch (error) {
      this.spinner.stop();
      throw messages.createError('error.parseCsvFailed', [(error as Error).message]);
    }
    this.spinner.stop();

    const objects = new Map<string, ObjectBucket>();
    for (const record of records) {
      if (!record.ObjectName) continue;
      const bucket = objects.get(record.ObjectName) ?? { object: undefined, fields: [], recordTypes: [] };
      if (record.Type === 'CustomObject') bucket.object = record;
      else if (record.Type === 'CustomField') bucket.fields.push(record);
      else if (record.Type === 'RecordType') bucket.recordTypes.push(record);
      objects.set(record.ObjectName, bucket);
    }

    this.info(messages.getMessage('info.foundObjects', [objects.size]));

    let objectCount = 0;
    let fieldCount = 0;
    let recordTypeCount = 0;

    for (const [objectName, bucket] of objects) {
      if (!bucket.object) {
        this.warn(messages.getMessage('warning.noCustomObjectRow', [objectName]));
        continue;
      }

      this.spinner.start(messages.getMessage('info.generatingObject', [objectName]));
      try {
        const objectPath = path.join(outputDir, objectName);
        const fieldsPath = path.join(objectPath, 'fields');
        const recordTypesPath = path.join(objectPath, 'recordTypes');

        await fsp.mkdir(fieldsPath, { recursive: true });
        await fsp.mkdir(recordTypesPath, { recursive: true });

        const objectXml = generateObjectXml(bucket.object, bucket.fields);
        await fsp.writeFile(path.join(objectPath, `${objectName}.object-meta.xml`), objectXml);

        for (const fieldData of bucket.fields) {
          const fieldXml = generateFieldXml(fieldData);
          await fsp.writeFile(path.join(fieldsPath, `${fieldData.ApiName}.field-meta.xml`), fieldXml);
        }

        for (const rtData of bucket.recordTypes) {
          const rtXml = generateRecordTypeXml(rtData);
          await fsp.writeFile(path.join(recordTypesPath, `${rtData.ApiName}.recordType-meta.xml`), rtXml);
        }

        objectCount += 1;
        fieldCount += bucket.fields.length;
        recordTypeCount += bucket.recordTypes.length;

        this.spinner.stop();
      } catch (error) {
        this.spinner.stop();
        throw messages.createError('error.objectGenerationFailed', [objectName, (error as Error).message]);
      }
    }

    this.info(messages.getMessage('info.complete', [objectCount, fieldCount, recordTypeCount, outputDir]));

    return { objectCount, fieldCount, recordTypeCount, outputDir };
  }
}
