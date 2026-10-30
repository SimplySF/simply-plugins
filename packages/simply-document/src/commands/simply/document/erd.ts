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

import fs from 'node:fs/promises';
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { buildEntityRelationshipDiagramMarkdown, buildEntityRelationshipModel } from '@simplysf/simply-document-core';
import { scanProjectWithSpinner } from '../../../common/scanProject.js';
import { resolveHubs, resolveTitle } from '../../../common/erdOptions.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-document', 'simply.document.erd');

/** Diagram summaries and complete model counts, including external and unrelated objects. */
export type DocumentErdResult = {
  outputFile: string;
  diagrams: Array<{ name: string; objectCount: number; relationshipCount: number; oversized: boolean }>;
  objectCount: number;
  relationshipCount: number;
  externalObjects: string[];
  unrelatedObjects: string[];
  skippedFields: string[];
};

const DEFAULT_HUBS = ['User'];

/** Only these metadata types feed the ERD; everything else is skipped before parsing. */
const ERD_METADATA_TYPES = ['CustomObject', 'CustomField'];

/** Generate Mermaid ER diagrams from project metadata. */
export default class DocumentErd extends SfCommand<DocumentErdResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    directory: Flags.directory({
      summary: messages.getMessage('flags.directory.summary'),
      char: 'd',
      exists: true,
      required: true,
    }),
    'output-file': Flags.file({ summary: messages.getMessage('flags.output-file.summary'), required: true }),
    'max-objects': Flags.integer({ summary: messages.getMessage('flags.max-objects.summary'), default: 40, min: 2 }),
    hub: Flags.string({ summary: messages.getMessage('flags.hub.summary'), multiple: true, default: DEFAULT_HUBS }),
    title: Flags.string({ summary: messages.getMessage('flags.title.summary') }),
  };

  public async run(): Promise<DocumentErdResult> {
    const { flags } = await this.parse(DocumentErd);
    const data = await scanProjectWithSpinner(this, flags.directory, { types: ERD_METADATA_TYPES });
    const objects = [...data.standardObjects, ...data.customObjects];

    const { hubs, unknown } = resolveHubs(
      flags.hub,
      buildEntityRelationshipModel(objects).entities.map((entity) => entity.name),
    );
    const explicitHubs =
      flags.hub.length !== DEFAULT_HUBS.length || flags.hub.some((hub, i) => hub !== DEFAULT_HUBS[i]);
    if (explicitHubs && unknown.length) {
      this.warn(messages.getMessage('warning.unknownHub', [unknown.join(', ')]));
    }

    const { markdown, model, diagrams, unrelatedObjects } = buildEntityRelationshipDiagramMarkdown(objects, {
      maxObjects: flags['max-objects'],
      hubs,
      title: await resolveTitle(flags.directory, flags.title),
    });
    await fs.writeFile(flags['output-file'], markdown, 'utf-8');
    const summaries = diagrams.map((diagram) => ({
      name: diagram.name,
      objectCount: diagram.entities.length,
      relationshipCount: diagram.relationships.length,
      oversized: diagram.oversized,
    }));
    if (diagrams.length === 0) {
      this.log(
        messages.getMessage(model.entities.length === 0 ? 'info.noObjects' : 'info.noRelationships', [
          flags['output-file'],
        ]),
      );
    } else {
      this.table({
        data: summaries.map((diagram, index) => ({ index: index + 1, ...diagram })),
        columns: [
          { key: 'index', name: '#' },
          { key: 'name', name: 'DIAGRAM' },
          { key: 'objectCount', name: 'OBJECTS' },
          { key: 'relationshipCount', name: 'RELATIONSHIPS' },
        ],
      });
      this.log(messages.getMessage('info.wrote', [diagrams.length, flags['output-file']]));
    }
    for (const diagram of diagrams) {
      if (diagram.oversized) {
        this.warn(
          messages.getMessage('warning.oversized', [
            diagram.name,
            diagram.entities.filter((entity) => !entity.external).length,
            flags['max-objects'],
          ]),
        );
      }
    }
    if (model.skippedFields.length) {
      this.warn(
        messages.getMessage('warning.skippedFields', [model.skippedFields.length, model.skippedFields.join(', ')]),
      );
    }
    return {
      outputFile: flags['output-file'],
      diagrams: summaries,
      objectCount: model.entities.length,
      relationshipCount: model.relationships.length,
      externalObjects: model.entities.filter((entity) => entity.external).map((entity) => entity.name),
      unrelatedObjects,
      skippedFields: model.skippedFields,
    };
  }
}
