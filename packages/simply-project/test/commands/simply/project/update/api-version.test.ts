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

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SfError } from '@salesforce/core';
import { describe, expect, it } from 'vitest';
import ProjectUpdateApiVersion from '../../../../../src/commands/simply/project/update/api-version.js';

describe('simply project update api-version', () => {
  it('should error without required flags', async () => {
    try {
      await ProjectUpdateApiVersion.run([]);
      expect.fail('should have thrown Error');
    } catch (err) {
      const error = err as SfError;
      expect(error.message).to.include('Missing required flag');
      expect(error.message).to.include('directory');
      expect(error.message).to.include('api-version');
    }
  });

  it('should update apiVersion in -meta.xml files that differ from the target version', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-project-update-'));

    try {
      const classDir = path.join(directory, 'force-app', 'main', 'default', 'classes');
      fs.mkdirSync(classDir, { recursive: true });
      const metaFile = path.join(classDir, 'Foo.cls-meta.xml');
      fs.writeFileSync(
        metaFile,
        '<?xml version="1.0" encoding="UTF-8"?>\n<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">\n    <apiVersion>58.0</apiVersion>\n    <status>Active</status>\n</ApexClass>\n',
      );

      const result = await ProjectUpdateApiVersion.run(['--directory', directory, '--api-version', '62.0']);

      expect(result.metadataFilesScanned).to.equal(1);
      expect(result.updatedFiles).to.deep.equal([metaFile]);
      expect(result.projectFileUpdated).to.be.false;

      const updatedContent = fs.readFileSync(metaFile, 'utf-8');
      expect(updatedContent).to.include('<apiVersion>62.0</apiVersion>');
      expect(updatedContent).to.include('<status>Active</status>');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should not modify -meta.xml files that already match the target version', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-project-update-'));

    try {
      const metaFile = path.join(directory, 'Foo.cls-meta.xml');
      const content =
        '<?xml version="1.0" encoding="UTF-8"?>\n<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">\n    <apiVersion>62.0</apiVersion>\n</ApexClass>\n';
      fs.writeFileSync(metaFile, content);

      const result = await ProjectUpdateApiVersion.run(['--directory', directory, '--api-version', '62.0']);

      expect(result.metadataFilesScanned).to.equal(1);
      expect(result.updatedFiles).to.deep.equal([]);
      expect(fs.readFileSync(metaFile, 'utf-8')).to.equal(content);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should update sourceApiVersion in sfdx-project.json when present', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-project-update-'));

    try {
      const projectFile = path.join(directory, 'sfdx-project.json');
      fs.writeFileSync(
        projectFile,
        JSON.stringify(
          {
            packageDirectories: [{ path: 'force-app', default: true }],
            name: 'fixture',
            namespace: '',
            sfdcLoginUrl: 'https://login.salesforce.com',
            sourceApiVersion: '58.0',
          },
          null,
          2,
        ),
      );

      const result = await ProjectUpdateApiVersion.run(['--directory', directory, '--api-version', '62.0']);

      expect(result.projectFileUpdated).to.be.true;

      const updatedProjectFile = JSON.parse(fs.readFileSync(projectFile, 'utf-8')) as { sourceApiVersion: string };
      expect(updatedProjectFile.sourceApiVersion).to.equal('62.0');
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it('should not error when sfdx-project.json is missing', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-project-update-'));

    try {
      const result = await ProjectUpdateApiVersion.run(['--directory', directory, '--api-version', '62.0']);

      expect(result.projectFileUpdated).to.be.false;
      expect(result.metadataFilesScanned).to.equal(0);
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
