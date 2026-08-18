/*
 * Copyright (c) 2026, Clay Chipps.
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
import { type Connection, Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { ComponentSet, SourceComponent } from '@salesforce/source-deploy-retrieve';
import {
  chunkedInQuery,
  ensureDirectory,
  mapChunked,
  resolvePackageNamesByApiName,
  timestampForFileName,
  writeRecordsToCsvFile,
} from '@simplysf/simply-core';
import {
  buildSchemaReportHtml,
  type SchemaDiagramEdge,
  type SchemaDiagramNode,
  type SchemaRelationship,
} from '../../../common/schemaReportTemplate.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-schema', 'simply.schema.visualize');

/** Scope of objects/fields to include: only custom, only standard, or all. */
type ScopeFilter = 'all' | 'custom' | 'standard';
/** Output formats this command can generate. */
type OutputType = 'csv' | 'html' | 'md';

/** A discovered object, either from local source or a live org. */
type SchemaObject = {
  name: string;
  label: string;
  custom: boolean;
  project: string;
};

/** The relevant discovered objects and relationships this command visualizes/renders. */
type SchemaData = {
  username: string;
  objectsToProcess: string[];
  objectMap: Map<string, SchemaObject>;
  validRelationships: SchemaRelationship[];
};

/** @returns The comma-separated values in `value`, trimmed; `[]` if `value` is empty/undefined. */
function splitList(value: string | undefined): string[] {
  return value ? value.split(',').map((entry) => entry.trim()) : [];
}

/** CSV column order/headers for the exported relationship records. */
const CSV_COLUMNS = [
  'SOURCE_OBJECT',
  'SOURCE_PACKAGE',
  'TARGET_OBJECT',
  'TARGET_PACKAGE',
  'FIELD_API_NAME',
  'LABEL',
  'IS_MASTER_DETAIL',
];

/** @returns An async iterable that yields every element of `items` in order, for streaming into a CSV writer. */
function toAsyncIterable<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator](): AsyncIterator<T> {
      const iterator = items[Symbol.iterator]();
      return {
        next: (): Promise<IteratorResult<T>> => Promise.resolve(iterator.next()),
      };
    },
  };
}

// --- Local source scanning -------------------------------------------------------------------

/** A field's parsed XML, as relevant to relationship discovery. */
type RawFieldXml = {
  fullName: string;
  type?: string;
  label?: string;
  referenceTo?: string | string[];
  relationshipName?: string;
};

/** A relationship field found while scanning, before filtering to objects that were actually discovered. */
type RawRelationship = {
  from: string;
  to: string;
  type: string;
  name: string;
  field: string;
  label?: string;
};

/** @returns The source-format package/project directory name a metadata file belongs to (the directory containing `objects`). */
function deriveProjectName(filePath: string | undefined): string {
  if (!filePath) {
    return 'unknown';
  }
  const normalized = filePath.replace(/\\/g, '/');
  const objectsIndex = normalized.indexOf('/objects/');
  if (objectsIndex === -1) {
    return 'unknown';
  }
  return path.basename(normalized.slice(0, objectsIndex));
}

/**
 * Process a relationship-type field into a raw relationship entry.
 *
 * @param objectName - The object the field belongs to.
 * @param field - The field's parsed XML.
 * @param fieldType - Which fields to include, by custom/standard scope.
 * @returns The raw relationship, or `undefined` if the field isn't a relationship field, or is filtered out by `fieldType`.
 */
function buildRawRelationship(
  objectName: string,
  field: RawFieldXml,
  fieldType: ScopeFilter,
): RawRelationship | undefined {
  if (field.type !== 'Lookup' && field.type !== 'MasterDetail' && field.type !== 'MetadataRelationship') {
    return undefined;
  }

  const isCustom = field.fullName.endsWith('__c');
  if (fieldType === 'custom' && !isCustom) {
    return undefined;
  }
  if (fieldType === 'standard' && isCustom) {
    return undefined;
  }

  const referenceTo = Array.isArray(field.referenceTo) ? field.referenceTo[0] : field.referenceTo;
  if (!referenceTo) {
    return undefined;
  }

  return {
    from: objectName,
    to: referenceTo,
    type: field.type,
    name: field.relationshipName ?? field.fullName,
    field: field.fullName,
    label: field.label,
  };
}

/**
 * Scan local Salesforce DX source directories for custom objects and their relationship fields.
 *
 * @param sourceDirs - The source directories to scan.
 * @param fieldType - Which relationship fields to include, by custom/standard scope.
 * @returns The discovered objects and their raw (unfiltered) relationships.
 */
function scanLocalSchema(
  sourceDirs: string[],
  fieldType: ScopeFilter,
): { objectMap: Map<string, SchemaObject>; relationships: RawRelationship[] } {
  const objectMap = new Map<string, SchemaObject>();
  const relationships: RawRelationship[] = [];

  const components = ComponentSet.fromSource(sourceDirs);

  const ensureObject = (name: string, project: string): SchemaObject => {
    let object = objectMap.get(name);
    if (!object) {
      object = { name, label: name, custom: name.endsWith('__c'), project };
      objectMap.set(name, object);
    }
    return object;
  };

  const addField = (objectName: string, project: string, field: RawFieldXml): void => {
    ensureObject(objectName, project);
    const relationship = buildRawRelationship(objectName, field, fieldType);
    if (relationship) {
      relationships.push(relationship);
    }
  };

  for (const rawComponent of components) {
    const component = rawComponent as SourceComponent;

    if (component.type.name === 'CustomObject') {
      const project = deriveProjectName(component.xml);
      const object = ensureObject(component.name, project);

      const xml = component.parseXmlSync<{ CustomObject?: { label?: string } }>();
      object.label = xml.CustomObject?.label ?? component.name;

      for (const child of component.getChildren()) {
        if (child.type.name === 'CustomField') {
          const fieldXml = child.parseXmlSync<{ CustomField?: RawFieldXml }>();
          if (fieldXml.CustomField) {
            addField(component.name, project, { ...fieldXml.CustomField, fullName: child.name });
          }
        }
      }
    } else if (component.type.name === 'CustomField') {
      const objectName = component.parent?.name;
      if (!objectName) {
        continue;
      }
      const project = deriveProjectName(component.xml ?? component.parent?.xml);
      const fieldXml = component.parseXmlSync<{ CustomField?: RawFieldXml }>();
      if (fieldXml.CustomField) {
        addField(objectName, project, { ...fieldXml.CustomField, fullName: component.name });
      }
    }
  }

  return { objectMap, relationships };
}

// --- Org scanning ------------------------------------------------------------------------------

/** A `FieldDefinition` record identifying a relationship field on an org object. */
type FieldDefinitionRecord = {
  EntityDefinition: { QualifiedApiName: string };
  QualifiedApiName: string;
  Label?: string;
  DataType: string;
  ReferenceTo?: { referenceTo?: string[] };
};

/** Chunk size for `QualifiedApiName IN (...)` clauses when resolving package names. */
const PACKAGE_QUERY_CHUNK_SIZE = 100;
/**
 * How this report labels an object whose `EntityDefinition` carries no publisher at all — which
 * is what standard, Salesforce-shipped objects look like, as distinct from the explicit `<local>`
 * publisher that unpackaged custom objects get.
 */
const STANDARD_OR_LOCAL_LABEL = 'Standard/Local';
/** Chunk size for `EntityDefinition.QualifiedApiName IN (...)` clauses when retrieving relationship fields. */
const FIELD_QUERY_CHUNK_SIZE = 20;
/** Chunk size for per-object `describe()` calls run concurrently while searching for reverse lookups. */
const DESCRIBE_CHUNK_SIZE = 10;

/**
 * Retrieve relationship (Lookup/Master-Detail) fields for the given org objects, chunked to stay
 * under SOQL query-length limits.
 *
 * @param connection - The org connection to query against.
 * @param objectNames - The object API names to retrieve relationship fields for.
 * @param fieldType - Which relationship fields to include, by custom/standard scope.
 * @returns The raw relationships found.
 */
async function retrieveOrgRelationships(
  connection: Connection,
  objectNames: string[],
  fieldType: ScopeFilter,
): Promise<RawRelationship[]> {
  const relationships: RawRelationship[] = [];

  const fields = await chunkedInQuery<FieldDefinitionRecord>(
    connection,
    objectNames,
    (inClause) =>
      'SELECT EntityDefinition.QualifiedApiName, ReferenceTo, QualifiedApiName, Label, DataType FROM FieldDefinition ' +
      `WHERE EntityDefinition.QualifiedApiName IN (${inClause})`,
    { chunkSize: FIELD_QUERY_CHUNK_SIZE, tooling: true },
  );

  for (const field of fields) {
    const match = /(Lookup|Master-Detail)\((.*?)\)/.exec(field.DataType);
    if (!match) {
      continue;
    }

    const isCustom = field.QualifiedApiName.endsWith('__c');
    if (fieldType === 'custom' && !isCustom) {
      continue;
    }
    if (fieldType === 'standard' && isCustom) {
      continue;
    }

    for (const referenceTo of field.ReferenceTo?.referenceTo ?? []) {
      relationships.push({
        from: field.EntityDefinition.QualifiedApiName,
        to: referenceTo,
        type: match[1] === 'Master-Detail' ? 'MasterDetail' : 'Lookup',
        name: field.QualifiedApiName,
        field: field.QualifiedApiName,
        label: field.Label,
      });
    }
  }

  return relationships;
}

/**
 * Scan a live org for objects and their relationship fields via the Tooling API, expanding the
 * initial object set with any objects that have a reverse (child-side) lookup back to it.
 *
 * @param connection - The org connection to query against.
 * @param options - The object/field scope and explicit source/related object filters.
 * @returns The discovered objects and their raw (unfiltered) relationships.
 */
export async function scanOrgSchema(
  connection: Connection,
  options: {
    objectType: ScopeFilter;
    fieldType: ScopeFilter;
    sourceObjects: string;
    relatedObjects: string;
  },
): Promise<{ objectMap: Map<string, SchemaObject>; relationships: RawRelationship[]; initialObjects: string[] }> {
  const globalDescribe = await connection.describeGlobal();
  const objectMap = new Map<string, SchemaObject>(
    globalDescribe.sobjects.map((sobject) => [
      sobject.name,
      { name: sobject.name, label: sobject.label, custom: sobject.custom, project: STANDARD_OR_LOCAL_LABEL },
    ]),
  );

  const explicitSourceObjects = splitList(options.sourceObjects).filter(
    (name) => name !== 'all' && name !== 'all-custom',
  );

  let objectsToProcess: string[];
  if (options.sourceObjects === 'all') {
    objectsToProcess = [...objectMap.keys()];
  } else if (explicitSourceObjects.length > 0) {
    objectsToProcess = explicitSourceObjects;
  } else {
    objectsToProcess = [...objectMap.values()]
      .filter((object) => options.objectType === 'all' || (options.objectType === 'custom') === object.custom)
      .map((object) => object.name);
  }
  const initialObjects = [...objectsToProcess];

  const relatedObjectsFilter =
    options.relatedObjects && options.relatedObjects !== 'all' ? splitList(options.relatedObjects) : undefined;

  const explicitRelatedObjects = splitList(options.relatedObjects).filter(
    (name) => name !== 'all' && name !== 'all-custom',
  );

  let relatedObjectsToProcess: string[];
  if (options.relatedObjects === 'all') {
    relatedObjectsToProcess = [...objectMap.keys()];
  } else if (explicitRelatedObjects.length > 0) {
    relatedObjectsToProcess = explicitRelatedObjects;
  } else {
    relatedObjectsToProcess = [...objectMap.values()]
      .filter((object) => options.objectType === 'all' || (options.objectType === 'custom') === object.custom)
      .map((object) => object.name);
  }

  const incomingObjects = new Set<string>();
  await mapChunked(relatedObjectsToProcess, DESCRIBE_CHUNK_SIZE, async (objectName) => {
    const describeResult = await connection.describe(objectName);
    for (const childRelationship of describeResult.childRelationships) {
      const childSObject = childRelationship.childSObject;
      if (!childSObject || childSObject.includes('$')) {
        continue;
      }

      const isCustom = objectMap.get(childSObject)?.custom ?? childSObject.endsWith('__c');
      const isExplicit = explicitSourceObjects.includes(childSObject);
      const isAllowedByRelatedFilter = !relatedObjectsFilter || relatedObjectsFilter.includes(childSObject);

      if (
        isAllowedByRelatedFilter &&
        (isExplicit ||
          options.objectType === 'all' ||
          (options.objectType === 'custom' && isCustom) ||
          (options.objectType === 'standard' && !isCustom))
      ) {
        incomingObjects.add(childSObject);
      }
    }
  });

  objectsToProcess = [...new Set([...objectsToProcess, ...relatedObjectsToProcess, ...incomingObjects])];

  const packageMap = await resolvePackageNamesByApiName(connection, objectsToProcess, {
    chunkSize: PACKAGE_QUERY_CHUNK_SIZE,
    fallbackLabel: STANDARD_OR_LOCAL_LABEL,
  });
  for (const [objectName, packageName] of packageMap) {
    const object = objectMap.get(objectName);
    if (object) {
      object.project = packageName;
    }
  }

  const relationships = await retrieveOrgRelationships(connection, objectsToProcess, options.fieldType);

  return { objectMap, relationships, initialObjects };
}

// --- Shared filtering / output generation ------------------------------------------------------

/**
 * Filter raw relationships down to ones connecting to the initial object set (and, if a related-
 * objects filter is active, respecting it), then expand the final object set to include every
 * object touched by a valid relationship.
 *
 * @param objectMap - Every discovered object.
 * @param rawRelationships - Every discovered relationship, before filtering.
 * @param initialObjects - The starting object set (from `--source-objects`/`--object-type`).
 * @param relatedObjects - The `--related-objects` flag value, if specified.
 * @returns The final object set to visualize, and the relationships between them.
 */
export function resolveRelationships(
  objectMap: Map<string, SchemaObject>,
  rawRelationships: RawRelationship[],
  initialObjects: string[],
  relatedObjects: string | undefined,
): { objectsToProcess: string[]; validRelationships: SchemaRelationship[] } {
  const initialSet = new Set(initialObjects);
  const relatedObjectsFilter = relatedObjects && relatedObjects !== 'all' ? splitList(relatedObjects) : undefined;

  const validRelationships: SchemaRelationship[] = [];

  for (const rel of rawRelationships) {
    const fromObject = objectMap.get(rel.from);
    const toObject = objectMap.get(rel.to);
    if (!fromObject || !toObject) {
      continue;
    }

    const connectsToInitial = initialSet.has(rel.from) || initialSet.has(rel.to);
    if (!connectsToInitial) {
      continue;
    }

    if (relatedObjectsFilter) {
      const isFromInitial = initialSet.has(rel.from);
      const isToInitial = initialSet.has(rel.to);

      if (!(isFromInitial && isToInitial)) {
        if (isFromInitial && !relatedObjectsFilter.includes(rel.to)) {
          continue;
        }
        if (isToInitial && !relatedObjectsFilter.includes(rel.from)) {
          continue;
        }
        if (!isFromInitial && !isToInitial) {
          continue;
        }
      }
    }

    validRelationships.push({
      from: rel.from,
      fromLabel: fromObject.label,
      to: rel.to,
      toLabel: toObject.label,
      fromPackage: fromObject.project,
      toPackage: toObject.project,
      field: rel.field,
      label: rel.label,
      isMasterDetail: rel.type === 'MasterDetail',
    });
  }

  const objectsToProcessSet = new Set(initialObjects);
  for (const rel of validRelationships) {
    objectsToProcessSet.add(rel.from);
    objectsToProcessSet.add(rel.to);
  }

  return { objectsToProcess: [...objectsToProcessSet], validRelationships };
}

/** Where the generated outputs were written, and how many objects/relationships they cover. */
export type SchemaVisualizeResult = {
  objectCount: number;
  relationshipCount: number;
  outputDir: string;
  csvPath?: string;
  markdownPath?: string;
  htmlPath?: string;
};

/**
 * Generates visualizations of Salesforce schema (object-relationship diagrams) from a live org's
 * Tooling API or from local Salesforce DX source directories.
 */
export default class SchemaVisualize extends SfCommand<SchemaVisualizeResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'target-org': Flags.optionalOrg({
      summary: messages.getMessage('flags.target-org.summary'),
    }),
    'api-version': Flags.orgApiVersion(),
    'source-dir': Flags.directory({
      summary: messages.getMessage('flags.source-dir.summary'),
      char: 'd',
      exists: true,
      multiple: true,
    }),
    'source-objects': Flags.string({
      summary: messages.getMessage('flags.source-objects.summary'),
      description: messages.getMessage('flags.source-objects.description'),
    }),
    'related-objects': Flags.string({
      summary: messages.getMessage('flags.related-objects.summary'),
      description: messages.getMessage('flags.related-objects.description'),
    }),
    'object-type': Flags.custom<ScopeFilter>({ options: ['custom', 'standard', 'all'] })({
      summary: messages.getMessage('flags.object-type.summary'),
      default: 'custom',
    }),
    'field-type': Flags.custom<ScopeFilter>({ options: ['custom', 'standard', 'all'] })({
      summary: messages.getMessage('flags.field-type.summary'),
      default: 'custom',
    }),
    'output-type': Flags.custom<OutputType>({ options: ['html', 'md', 'csv'] })({
      summary: messages.getMessage('flags.output-type.summary'),
      description: messages.getMessage('flags.output-type.description'),
      multiple: true,
      delimiter: ',',
      default: ['html', 'md'],
    }),
    'output-dir': Flags.directory({
      summary: messages.getMessage('flags.output-dir.summary'),
    }),
  };

  /** @returns Where the generated outputs were written, and how many objects/relationships they cover. */
  public async run(): Promise<SchemaVisualizeResult> {
    const { flags } = await this.parse(SchemaVisualize);

    const targetOrg = flags['target-org'];
    const sourceDirs = flags['source-dir'] ?? [];

    if ((targetOrg && sourceDirs.length > 0) || (!targetOrg && sourceDirs.length === 0)) {
      throw messages.createError('error.targetOrgOrSourceDirRequired');
    }

    const objectType = flags['object-type'];
    const fieldType = flags['field-type'];

    let data: SchemaData;
    if (targetOrg) {
      const connection = targetOrg.getConnection(flags['api-version']);

      this.spinner.start(messages.getMessage('info.connectingToOrg', [targetOrg.getUsername() ?? '']));
      this.spinner.stop();

      this.spinner.start(messages.getMessage('info.fetchingObjectList'));
      this.spinner.stop();

      this.spinner.start(messages.getMessage('info.searchingReverseLookups'));
      const { objectMap, relationships, initialObjects } = await scanOrgSchema(connection, {
        objectType,
        fieldType,
        sourceObjects: flags['source-objects'] ?? '',
        relatedObjects: flags['related-objects'] ?? '',
      });
      this.spinner.stop();

      const { objectsToProcess, validRelationships } = resolveRelationships(
        objectMap,
        relationships,
        initialObjects,
        flags['related-objects'],
      );

      data = {
        username: targetOrg.getUsername() ?? '',
        objectsToProcess,
        objectMap,
        validRelationships,
      };
    } else {
      this.spinner.start(messages.getMessage('info.discoveringObjects'));
      let local: ReturnType<typeof scanLocalSchema>;
      try {
        local = scanLocalSchema(sourceDirs, fieldType);
      } catch (error) {
        this.spinner.stop();
        throw messages.createError('error.localScanFailed', [(error as Error).message]);
      }
      this.spinner.stop();

      if (local.objectMap.size === 0) {
        throw messages.createError('error.noObjectDefinitionsFound');
      }

      const explicitSourceObjects = splitList(flags['source-objects']).filter(
        (name) => name !== 'all' && name !== 'all-custom',
      );
      let initialObjects: string[];
      if (flags['source-objects'] === 'all') {
        initialObjects = [...local.objectMap.keys()];
      } else if (explicitSourceObjects.length > 0) {
        initialObjects = explicitSourceObjects;
      } else {
        initialObjects = [...local.objectMap.values()]
          .filter((object) => objectType === 'all' || (objectType === 'custom') === object.custom)
          .map((object) => object.name);
      }

      const { objectsToProcess, validRelationships } = resolveRelationships(
        local.objectMap,
        local.relationships,
        initialObjects,
        flags['related-objects'],
      );

      data = {
        username: 'local files',
        objectsToProcess,
        objectMap: local.objectMap,
        validRelationships,
      };
    }

    const outputDir = ensureDirectory(
      flags['output-dir'] ?? path.join('temp', 'simply-schema-visualize', timestampForFileName()),
    );

    this.spinner.start(messages.getMessage('info.generatingOutputs'));
    const result = await generateOutputs(data, flags['output-type'], outputDir);
    this.spinner.stop();

    this.info(
      messages.getMessage('info.complete', [data.objectsToProcess.length, data.validRelationships.length, outputDir]),
    );

    return {
      objectCount: data.objectsToProcess.length,
      relationshipCount: data.validRelationships.length,
      outputDir,
      ...result,
    };
  }
}

/**
 * Write the requested output formats (CSV relationship data, Mermaid ERD Markdown, interactive
 * HTML diagram) for the given schema data.
 *
 * @param data - The discovered objects/relationships to render.
 * @param outputTypes - Which output formats to generate.
 * @param outputDir - The directory to write generated files to.
 * @returns The paths written, keyed by output format.
 */
async function generateOutputs(
  data: SchemaData,
  outputTypes: OutputType[],
  outputDir: string,
): Promise<{ csvPath?: string; markdownPath?: string; htmlPath?: string }> {
  const { username, objectsToProcess, objectMap, validRelationships } = data;

  const result: { csvPath?: string; markdownPath?: string; htmlPath?: string } = {};

  if (outputTypes.includes('csv')) {
    const csvPath = path.join(outputDir, 'schema.csv');
    const records = validRelationships.map((rel) => ({
      SOURCE_OBJECT: rel.from,
      SOURCE_PACKAGE: rel.fromPackage,
      TARGET_OBJECT: rel.to,
      TARGET_PACKAGE: rel.toPackage,
      FIELD_API_NAME: rel.field,
      LABEL: rel.label ?? '',
      IS_MASTER_DETAIL: rel.isMasterDetail,
    }));
    await writeRecordsToCsvFile(toAsyncIterable(records), csvPath, CSV_COLUMNS);
    result.csvPath = csvPath;
  }

  if (outputTypes.includes('md')) {
    const markdownPath = path.join(outputDir, 'schema_erd.md');
    const entityLabel = (objectName: string): string => `"${objectMap.get(objectName)?.label ?? objectName}"`;

    let mermaid = 'erDiagram\n';
    for (const objectName of objectsToProcess) {
      const project = objectMap.get(objectName)?.project ?? STANDARD_OR_LOCAL_LABEL;
      mermaid += `    ${entityLabel(objectName)} {\n`;
      mermaid += `        string PACKAGE "${project}"\n`;
      mermaid += `        string API_NAME "${objectName}"\n`;
      mermaid += '    }\n';
    }
    for (const rel of validRelationships) {
      const connector = rel.isMasterDetail ? '||--|{' : '||..|{';
      mermaid += `    ${entityLabel(rel.from)} ${connector} ${entityLabel(rel.to)} : "${rel.field}"\n`;
    }

    const markdown = `# Salesforce Schema ERD\nOrg: ${username}\n\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n`;
    await fsp.writeFile(markdownPath, markdown);
    result.markdownPath = markdownPath;
  }

  if (outputTypes.includes('html')) {
    const htmlPath = path.join(outputDir, 'schema_report.html');

    const nodes: SchemaDiagramNode[] = objectsToProcess.map((objectName) => {
      const object = objectMap.get(objectName);
      const label = object?.label ?? objectName;
      const project = object?.project ?? STANDARD_OR_LOCAL_LABEL;
      return {
        id: objectName,
        label: `${label}\n(${objectName})`,
        group: project,
        title: `<b>${label}</b><br>API Name: ${objectName}<br>Package: ${project}`,
      };
    });

    const edges: SchemaDiagramEdge[] = validRelationships.map((rel) => ({
      from: rel.from,
      to: rel.to,
      title: `<b>${rel.label ?? ''}</b> (${rel.field})<br>Type: ${rel.isMasterDetail ? 'Master-Detail' : 'Lookup'}`,
      arrows: 'to',
      dashes: !rel.isMasterDetail,
      font: { align: 'middle' },
    }));

    const html = buildSchemaReportHtml({ username, nodes, edges, relationships: validRelationships });
    await fsp.writeFile(htmlPath, html);
    result.htmlPath = htmlPath;
  }

  return result;
}
