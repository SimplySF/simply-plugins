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

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DependencyCloneResult } from './../../../../../src/commands/simply/package/dependencies/clone.js';

describe('simply package dependencies clone', () => {
  let session: TestSession;

  /** Create a one-commit git repository under the session directory and return its path. */
  function sourceRepo(name: string): string {
    const dir = path.join(session.dir, 'sources', name);
    fs.mkdirSync(dir, { recursive: true });
    const git = (...args: string[]): string =>
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
        cwd: dir,
        encoding: 'utf-8',
      });
    git('init', '--quiet', '--initial-branch', 'main');
    fs.writeFileSync(path.join(dir, 'README.md'), name);
    git('add', '.');
    git('commit', '--quiet', '-m', 'initial');
    return dir;
  }

  /** Point the session project's dependencies at these repositories, keyed by package alias. */
  function writeProject(dependencies: string[], repositories: Record<string, { url: string }>): void {
    const projectJsonPath = path.join(session.project.dir, 'sfdx-project.json');
    const projectJson = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8')) as {
      packageDirectories: Array<Record<string, unknown>>;
      plugins?: Record<string, unknown>;
    };
    projectJson.packageDirectories[0].dependencies = dependencies.map((name) => ({ package: name }));
    projectJson.plugins = {
      simply: {
        packages: Object.fromEntries(Object.entries(repositories).map(([key, repository]) => [key, { repository }])),
      },
    };
    fs.writeFileSync(projectJsonPath, JSON.stringify(projectJson, null, 2));
  }

  beforeAll(async () => {
    // No org flags on this command, so the session needs no dev hub and no scratch org.
    session = await TestSession.create({
      devhubAuthStrategy: 'NONE',
      project: { name: 'clone-project' },
    });
  });

  it('should return one row per dependency as json and exit 0', () => {
    writeProject(['core@1.0.0-1', 'SomeAppExchangePackage@5.2'], { core: { url: sourceRepo('core') } });

    const output = execCmd<DependencyCloneResult[]>('simply package dependencies clone --output-dir deps --json', {
      ensureExitCode: 0,
    }).jsonOutput;

    expect(output!.result.map((row) => [row.package, row.status])).toStrictEqual([
      ['core@1.0.0-1', 'Cloned'],
      ['SomeAppExchangePackage@5.2', 'No repository'],
    ]);
    expect(fs.existsSync(path.join(session.project.dir, 'deps', 'core', 'README.md'))).toBe(true);
  });

  it('should exit 1 when a clone fails', () => {
    writeProject(['gone'], { gone: { url: path.join(session.dir, 'sources', 'does-not-exist') } });

    const output = execCmd<DependencyCloneResult[]>('simply package dependencies clone --output-dir deps --json', {
      ensureExitCode: 1,
    }).jsonOutput;

    expect(output!.result).toMatchObject([{ package: 'gone', status: 'Failed' }]);
  });

  afterAll(async () => {
    await session?.clean();
  });
});
