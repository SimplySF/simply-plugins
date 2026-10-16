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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { connect, errorCodeOf, fakeBackend, tempDir, textOf, type Harness } from './helpers.js';

/** Writes `sfdx-project.json`, re-written between calls to check the server doesn't serve a stale copy. */
function writeProject(dir: string, packageDirectories: Array<Record<string, unknown>>): void {
  fs.writeFileSync(
    path.join(dir, 'sfdx-project.json'),
    JSON.stringify({ packageDirectories, sourceApiVersion: '62.0', packageAliases: {} }),
  );
}

describe('simply_package_version_get', () => {
  let dir: string;
  let cleanup: () => void;
  let harness: Harness;
  let backend: ReturnType<typeof fakeBackend>;

  beforeEach(async () => {
    ({ dir, cleanup } = tempDir());
    backend = fakeBackend();
    harness = await connect({ directory: dir, backend, allow: 'read' });
  });

  afterEach(async () => {
    await harness.close();
    cleanup();
  });

  it("reads a dependency's version from the project, without an org", async () => {
    writeProject(dir, [
      { path: 'force-app', default: true, dependencies: [{ package: 'shared', versionNumber: '1.2.0.LATEST' }] },
    ]);

    const result = await harness.call('simply_package_version_get', { package: 'shared' });

    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toMatchObject({
      package: 'shared',
      source: 'dependency',
      packageDirectory: 'force-app',
    });
    expect(textOf(result)).toMatch(/^shared is at .+ \(dependency in force-app\)\.$/);
    expect(backend.loadOrg).not.toHaveBeenCalled();
  });

  it('sees an edit to sfdx-project.json made after the last call', async () => {
    writeProject(dir, [{ path: 'force-app', package: 'app', versionNumber: '1.0.0.NEXT', default: true }]);
    const before = await harness.call('simply_package_version_get', { package: 'app' });

    writeProject(dir, [{ path: 'force-app', package: 'app', versionNumber: '2.0.0.NEXT', default: true }]);
    const after = await harness.call('simply_package_version_get', { package: 'app' });

    expect(before.structuredContent).not.toStrictEqual(after.structuredContent);
  });

  it('says which directories were searched for an unknown package', async () => {
    writeProject(dir, [{ path: 'force-app', default: true }]);

    const result = await harness.call('simply_package_version_get', { package: 'nope' });

    expect(textOf(result)).toBe("No package named 'nope' is declared in package directories: force-app.");
    expect(errorCodeOf(result)).toBe('package-not-found');
  });

  it('asks for directory when the same package is declared at two versions', async () => {
    writeProject(dir, [
      { path: 'a', default: true, dependencies: [{ package: 'shared', versionNumber: '1.0.0.LATEST' }] },
      { path: 'b', dependencies: [{ package: 'shared', versionNumber: '2.0.0.LATEST' }] },
    ]);

    const ambiguous = await harness.call('simply_package_version_get', { package: 'shared' });
    const chosen = await harness.call('simply_package_version_get', { package: 'shared', directory: 'b' });

    expect(errorCodeOf(ambiguous)).toBe('ambiguous-match');
    expect(textOf(ambiguous)).toContain('Use directory to choose one package directory.');
    expect(chosen.structuredContent).toMatchObject({ packageDirectory: 'b' });
  });

  it('explains a directory that is not a project', async () => {
    const result = await harness.call('simply_package_version_get', { package: 'shared' });
    expect(errorCodeOf(result)).toBe('not-a-project');
    expect(textOf(result)).toContain('--directory');
  });
});
