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
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import PackageDependenciesClone from '../../../../../src/commands/simply/package/dependencies/clone.js';

// The clone engine itself is covered in simply-package-core. These tests pin down the command's
// side: flag mapping, the project it reads, the --json result, and the exit code.

describe('simply package dependencies clone', () => {
  let originalCwd: string;
  let root: string;
  let projectDir: string;

  /** Create a one-commit git repository at `relativePath` under the test root and return its path. */
  function sourceRepo(relativePath: string): string {
    const dir = path.join(root, 'sources', relativePath);
    fs.mkdirSync(dir, { recursive: true });
    const git = (...args: string[]): string =>
      execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
        cwd: dir,
        encoding: 'utf-8',
      });
    git('init', '--quiet', '--initial-branch', 'main');
    fs.writeFileSync(path.join(dir, 'README.md'), relativePath);
    git('add', '.');
    git('commit', '--quiet', '-m', 'initial');
    return dir;
  }

  /** Write the project's sfdx-project.json with these dependencies and repository map. */
  function writeProject(dependencies: string[], repositories: Record<string, { url: string; ref?: string }>): void {
    fs.writeFileSync(
      path.join(projectDir, 'sfdx-project.json'),
      JSON.stringify({
        packageDirectories: [
          {
            path: 'force-app',
            default: true,
            package: 'my-app',
            versionNumber: '1.0.0.NEXT',
            dependencies: dependencies.map((name) => ({ package: name })),
          },
        ],
        plugins: { simply: { dependencies: { repositories } } },
      }),
    );
  }

  beforeEach(() => {
    originalCwd = process.cwd();
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'simply-package-dependencies-clone-')));
    projectDir = path.join(root, 'workspace', 'app');
    fs.mkdirSync(path.join(projectDir, 'force-app'), { recursive: true });
    process.chdir(projectDir);
  });

  afterEach(() => {
    process.exitCode = undefined;
    process.chdir(originalCwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('clones mapped dependencies next to the project and reports the rest', async () => {
    const core = sourceRepo('org/core');
    writeProject(['core@1.0.0-1', 'SomeAppExchangePackage@5.2'], { core: { url: core, ref: 'main' } });

    const results = await PackageDependenciesClone.run([]);

    expect(results.map((row) => [row.package, row.status])).toStrictEqual([
      ['core@1.0.0-1', 'Cloned'],
      ['SomeAppExchangePackage@5.2', 'No repository'],
    ]);
    expect(fs.existsSync(path.join(root, 'workspace', 'core', 'README.md'))).toBe(true);
    expect(process.exitCode).toBeUndefined();
  });

  it('honors --output-dir and --dry-run', async () => {
    writeProject(['core'], { core: { url: 'https://github.com/org/core.git' } });

    const results = await PackageDependenciesClone.run(['--output-dir', 'deps', '--dry-run']);

    expect(results).toMatchObject([{ status: 'Would clone', directory: path.join(projectDir, 'deps', 'core') }]);
    expect(fs.existsSync(path.join(projectDir, 'deps'))).toBe(false);
  });

  it('sets a non-zero exit code when a clone fails', async () => {
    writeProject(['gone'], { gone: { url: path.join(root, 'sources', 'does-not-exist') } });

    const results = await PackageDependenciesClone.run([]);

    expect(results[0].status).toBe('Failed');
    expect(process.exitCode).toBe(1);
  });

  it('rejects a repository url that contains credentials', async () => {
    writeProject(['core'], { core: { url: 'https://user:token@github.com/org/core.git' } });

    await expect(PackageDependenciesClone.run([])).rejects.toMatchObject({ name: 'CredentialsInUrlError' });
  });
});
