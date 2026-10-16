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
import os from 'node:os';
import path from 'node:path';
import { type Connection, Org, SfError, SfProject } from '@salesforce/core';
import { MockTestOrgData, TestContext } from '@salesforce/core/testSetup';
import { buildBindingXml, FFLIB_UNIT_OF_WORK_SNIPPET } from '@simplysf/simply-aep-core';
import sinon from 'sinon';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import AepGenerate from '../../../../../src/commands/simply/aep/generate.js';
import AepGenerateDomain from '../../../../../src/commands/simply/aep/generate/domain.js';
import AepGenerateSelector from '../../../../../src/commands/simply/aep/generate/selector.js';
import AepGenerateService from '../../../../../src/commands/simply/aep/generate/service.js';
import AepGenerateUnitOfWork from '../../../../../src/commands/simply/aep/generate/unit-of-work.js';

const ACCOUNT_DESCRIBE = {
  name: 'Account',
  custom: false,
  fields: [
    { name: 'Id', type: 'id', filterable: true },
    { name: 'Name', type: 'string', filterable: true },
    { name: 'Description', type: 'textarea', filterable: false },
  ],
};

describe('simply aep generate', () => {
  const $$ = new TestContext({ sinon });
  const testOrg = new MockTestOrgData();
  let outputDir: string;
  let describeSObject: sinon.SinonStub;
  let resolveProject: sinon.SinonStub;

  beforeAll(async () => {
    await $$.stubAuths(testOrg);
  });

  beforeEach(() => {
    outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-aep-generate-'));
    // Run as if outside a DX project, so validation scans --output-dir alone.
    resolveProject = $$.SANDBOX.stub(SfProject, 'resolve').rejects(
      new SfError('not a project', 'InvalidProjectWorkspaceError'),
    );
    describeSObject = $$.SANDBOX.stub().callsFake(async (name: string) => {
      if (name === 'Account') return ACCOUNT_DESCRIBE;
      throw Object.assign(new Error(`sObject type '${name}' is not supported.`), { errorCode: 'NOT_FOUND' });
    });
    // jsforce assigns describeSObject per instance, so it can't be stubbed on Connection.prototype.
    const getConnection = $$.SANDBOX.stub(Org.prototype, 'getConnection');
    getConnection.callsFake(function (this: Org, apiVersion?: string): Connection {
      return Object.assign(getConnection.wrappedMethod.call(this, apiVersion), { describeSObject });
    });
  });

  afterEach(() => {
    $$.restore();
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  const orgArgs = (): string[] => ['--target-org', testOrg.username, '--output-dir', outputDir];
  const read = (relativePath: string): string => fs.readFileSync(path.join(outputDir, relativePath), 'utf8');

  describe('selector', () => {
    it('writes the AT4DX selector, its test, and its binding, describing the SObject once', async () => {
      const result = await AepGenerateSelector.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'at4dx']);

      expect(describeSObject.calledOnceWithExactly('Account')).to.equal(true);
      expect(result.baseDir).to.equal(outputDir);
      expect(result.created).to.have.length(7);
      expect(result.issues).to.deep.equal([]);
      expect(read('main/classes/selectors/AccountsSelector.cls')).to.include('Account.Name');
      expect(read('main/classes/selectors/AccountsSelector.cls')).not.to.include('Account.Description');
      expect(
        read(
          'main/schema/custommetadata/applicationFactoryBindings/selectorBindings/ApplicationFactory_SelectorBinding.Account.md-meta.xml',
        ),
      ).to.include('<values><field>To__c</field><value xsi:type="xsd:string">AccountsSelector</value></values>');
    });

    it('writes no binding for fflib', async () => {
      const result = await AepGenerateSelector.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'fflib']);
      expect(result.created).to.have.length(6);
      expect(result.created.some((file) => file.endsWith('.md-meta.xml'))).to.equal(false);
    });

    it('refuses to replace existing files without --overwrite, writing nothing', async () => {
      await AepGenerateSelector.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'fflib']);
      const selectorPath = path.join(outputDir, 'main/classes/selectors/AccountsSelector.cls');
      fs.writeFileSync(selectorPath, 'edited');

      try {
        await AepGenerateSelector.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'fflib']);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as SfError).message).to.include('already exist');
        expect((err as SfError).message).to.include(selectorPath);
      }
      expect(fs.readFileSync(selectorPath, 'utf8')).to.equal('edited');

      const replaced = await AepGenerateSelector.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'fflib',
        '--overwrite',
      ]);
      expect(replaced.created).to.have.length(6);
      expect(fs.readFileSync(selectorPath, 'utf8')).not.to.equal('edited');
    });

    it('reports a missing SObject', async () => {
      try {
        await AepGenerateSelector.run([...orgArgs(), '--sobject', 'Nope__c', '--flavor', 'at4dx']);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as SfError).message).to.equal("SObject Nope__c wasn't found in the target org.");
      }
    });

    it('lists the planned files on --dry-run and writes nothing', async () => {
      const result = await AepGenerateSelector.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'at4dx',
        '--dry-run',
      ]);
      expect(result.wouldCreate).to.have.length(7);
      expect(result.wouldOverwrite).to.deep.equal([]);
      expect(result.created).to.deep.equal([]);
      expect(fs.readdirSync(outputDir)).to.deep.equal([]);
    });

    it('separates existing files into wouldOverwrite on --dry-run', async () => {
      await AepGenerateSelector.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'fflib']);
      const selectorPath = path.join(outputDir, 'main/classes/selectors/AccountsSelector.cls');
      fs.rmSync(selectorPath);

      const result = await AepGenerateSelector.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'fflib',
        '--dry-run',
      ]);
      expect(result.wouldCreate).to.deep.equal([selectorPath]);
      expect(result.wouldOverwrite).to.have.length(5);
      expect(result.wouldOverwrite).not.to.include(selectorPath);
    });

    it('fails on a project error other than "not in a project" instead of scanning less', async () => {
      resolveProject.rejects(new SfError('Unexpected token', 'JsonParseError'));
      try {
        await AepGenerateSelector.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'at4dx']);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as SfError).name).to.equal('JsonParseError');
      }
      expect(fs.readdirSync(outputDir)).to.deep.equal([]);
    });
  });

  describe('domain', () => {
    const writeExistingDomainBinding = (): void => {
      const existing = path.join(
        outputDir,
        'force-app',
        'customMetadata',
        'ApplicationFactory_DomainBinding.Old.md-meta.xml',
      );
      fs.mkdirSync(path.dirname(existing), { recursive: true });
      fs.writeFileSync(
        existing,
        buildBindingXml(
          { bindingType: 'Domain', key: 'Account', keyField: 'primary', to: 'OldAccounts' },
          { label: 'Old' },
        ),
      );
    };

    it('writes the domain and its trigger', async () => {
      const result = await AepGenerateDomain.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'at4dx']);
      expect(result.created).to.have.length(9);
      expect(read('main/schema/triggers/Accounts.trigger')).to.include('trigger Accounts on Account');
    });

    it('refuses a second Domain binding for the same SObject, writing nothing', async () => {
      writeExistingDomainBinding();
      try {
        await AepGenerateDomain.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'at4dx']);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as SfError).message).to.include('would introduce the error-severity issues above');
      }
      expect(fs.existsSync(path.join(outputDir, 'main'))).to.equal(false);
    });

    it("validates against the project's package directories as well as --output-dir", async () => {
      const packageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'simply-aep-package-'));
      try {
        fs.writeFileSync(
          path.join(packageDir, 'ApplicationFactory_DomainBinding.Old.md-meta.xml'),
          buildBindingXml(
            { bindingType: 'Domain', key: 'Account', keyField: 'primary', to: 'OldAccounts' },
            { label: 'Old' },
          ),
        );
        resolveProject.resolves({ getPackageDirectories: () => [{ fullPath: packageDir }] });
        const result = await AepGenerateDomain.run([
          ...orgArgs(),
          '--sobject',
          'Account',
          '--flavor',
          'at4dx',
          '--dry-run',
        ]);
        expect(result.issues.map((issue) => issue.rule)).to.include('duplicate-domain-sobject');
      } finally {
        fs.rmSync(packageDir, { recursive: true, force: true });
      }
    });

    it('writes it anyway with --force, returning the issues', async () => {
      writeExistingDomainBinding();
      const result = await AepGenerateDomain.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'at4dx',
        '--force',
      ]);
      expect(result.created).to.have.length(9);
      expect(result.issues.map((issue) => issue.rule)).to.include('duplicate-domain-sobject');
      expect(result.issues.every((issue) => issue.record === 'binding')).to.equal(true);
    });

    it('reports the issues on --dry-run without failing', async () => {
      writeExistingDomainBinding();
      const result = await AepGenerateDomain.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'at4dx',
        '--dry-run',
      ]);
      expect(result.issues.map((issue) => issue.rule)).to.include('duplicate-domain-sobject');
      expect(fs.existsSync(path.join(outputDir, 'main'))).to.equal(false);
    });
  });

  describe('unit-of-work', () => {
    it('writes the AT4DX binding at --sequence', async () => {
      const result = await AepGenerateUnitOfWork.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'at4dx',
        '--sequence',
        '20',
      ]);
      expect(result.created).to.have.length(1);
      expect(fs.readFileSync(result.created[0], 'utf8')).to.include(
        '<values><field>BindingSequence__c</field><value xsi:type="xsd:double">20</value></values>',
      );
    });

    it('returns the fflib Application entry as manual steps and writes nothing', async () => {
      const result = await AepGenerateUnitOfWork.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'fflib']);
      expect(result.created).to.deep.equal([]);
      expect(result.manualSteps).to.deep.equal([FFLIB_UNIT_OF_WORK_SNIPPET, 'Account.SObjectType']);
    });

    it('rejects a sequence that is not a number', async () => {
      try {
        await AepGenerateUnitOfWork.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'at4dx', '--sequence', 'x']);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as SfError).message).to.include('--sequence: ');
        expect((err as SfError).message).to.include('must be a number');
      }
    });
  });

  describe('service', () => {
    it('needs no org with an explicit --api-version', async () => {
      const result = await AepGenerateService.run([
        '--output-dir',
        outputDir,
        '--service-basename',
        'Billing',
        '--flavor',
        'at4dx',
        '--api-version',
        '61.0',
      ]);
      expect(result.created).to.have.length(11);
      expect(read('main/classes/services/BillingService.cls-meta.xml')).to.include('<apiVersion>61.0</apiVersion>');
      expect(describeSObject.called).to.equal(false);
    });

    it('names the flag behind an invalid option', async () => {
      try {
        await AepGenerateService.run([
          '--output-dir',
          outputDir,
          '--service-basename',
          'bad name!',
          '--flavor',
          'at4dx',
          '--api-version',
          '61.0',
        ]);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as SfError).message).to.equal('--service-basename: Service basename must be a valid identifier.');
      }
      expect(fs.readdirSync(outputDir)).to.deep.equal([]);
    });
  });

  describe('aggregate', () => {
    it('combines the selected layers from one describe', async () => {
      const result = await AepGenerate.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'at4dx',
        '--selector',
        '--unit-of-work',
      ]);
      expect(describeSObject.calledOnce).to.equal(true);
      expect(result.created).to.have.length(8);
      expect(result.manualSteps).to.equal(undefined);
    });

    it('requires at least one layer', async () => {
      try {
        await AepGenerate.run([...orgArgs(), '--sobject', 'Account', '--flavor', 'at4dx']);
        expect.fail('should have thrown');
      } catch (err) {
        expect((err as SfError).message).to.equal(
          'Select at least one artifact group: --selector, --domain, or --unit-of-work.',
        );
      }
    });

    it('returns manualSteps for an fflib unit of work', async () => {
      const result = await AepGenerate.run([
        ...orgArgs(),
        '--sobject',
        'Account',
        '--flavor',
        'fflib',
        '--unit-of-work',
      ]);
      expect(result.manualSteps).to.deep.equal([FFLIB_UNIT_OF_WORK_SNIPPET, 'Account.SObjectType']);
    });
  });
});
