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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRelease, resolveReleaseVcs, type CreateReleaseResult } from '@simplysf/simply-project-core';
import ProjectReleaseCreate from '../../../../../src/commands/simply/project/release/create.js';

vi.mock('@simplysf/simply-project-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-project-core')>()),
  createRelease: vi.fn(),
  resolveReleaseVcs: vi.fn(),
}));

const created: CreateReleaseResult = {
  source: 'release/v1.2.0',
  branch: 'release/v1.3.0',
  version: '1.3.0',
  status: 'Created',
  commit: 'abc123',
  bumpedPackages: ['Core'],
};

const vcs = { provider: { kind: 'gitlab' }, project: '123' } as unknown as ReturnType<typeof resolveReleaseVcs>;

describe('simply project release create', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createRelease).mockResolvedValue(created);
    vi.mocked(resolveReleaseVcs).mockReturnValue(vcs);
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
    vi.restoreAllMocks();
  });

  it('delegates with defaults, asks for confirmation, and needs no VCS for a plain cut', async () => {
    const result = await ProjectReleaseCreate.run(['--type', 'minor']);

    expect(result.status).toBe('Created');
    expect(createRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'minor',
        packageReleaseBranchPrefix: 'release/',
        remote: 'origin',
        createRelease: false,
        setDefault: false,
        dryRun: false,
        vcs: undefined,
        confirm: expect.any(Function) as unknown,
      }),
    );
    expect(resolveReleaseVcs).not.toHaveBeenCalled();
  });

  it('passes the branch and message flags through', async () => {
    await ProjectReleaseCreate.run([
      '-t',
      'patch',
      '--source',
      'release/v1.1.0',
      '--remote',
      'upstream',
      '--message',
      'chore: PROJ-1 {VERSION}',
      '--no-prompt',
    ]);

    expect(createRelease).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'patch',
        source: 'release/v1.1.0',
        remote: 'upstream',
        message: 'chore: PROJ-1 {VERSION}',
      }),
    );
  });

  it.each([['--create-release'], ['--set-default'], ['--release-tag=v1.2.0.9']])(
    'builds the VCS provider from the flags with %s',
    async (flag) => {
      await ProjectReleaseCreate.run([
        '--type',
        'minor',
        flag,
        '--vcs-provider',
        'github',
        '--vcs-host',
        'github.example.com',
        '--vcs-project-id',
        'org/repo',
        '--vcs-token',
        'secret',
        '--no-prompt',
      ]);

      expect(resolveReleaseVcs).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'github',
          host: 'github.example.com',
          projectId: 'org/repo',
          token: 'secret',
        }),
      );
      expect(createRelease).toHaveBeenCalledWith(expect.objectContaining({ vcs }));
    },
  );

  it('reads the token from SIMPLY_VCS_TOKEN', async () => {
    vi.stubEnv('SIMPLY_VCS_TOKEN', 'from-env');
    try {
      await ProjectReleaseCreate.run(['--type', 'minor', '--set-default', '--no-prompt']);
    } finally {
      vi.unstubAllEnvs();
    }

    expect(resolveReleaseVcs).toHaveBeenCalledWith(expect.objectContaining({ token: 'from-env' }));
  });

  it.each([['--no-prompt'], ['--dry-run'], ['--json']])('does not ask for confirmation with %s', async (flag) => {
    await ProjectReleaseCreate.run(['--type', 'minor', flag]);

    expect(createRelease).toHaveBeenCalledWith(expect.objectContaining({ confirm: undefined }));
  });

  it('asks for the type when it is omitted in a terminal', async () => {
    const prototype = ProjectReleaseCreate.prototype as unknown as { promptForType: () => Promise<string> };
    const prompt = vi.spyOn(prototype, 'promptForType').mockResolvedValue('major');

    await ProjectReleaseCreate.run([]);

    expect(prompt).toHaveBeenCalled();
    expect(createRelease).toHaveBeenCalledWith(expect.objectContaining({ type: 'major' }));
  });

  it('requires --type when it cannot ask', async () => {
    await expect(ProjectReleaseCreate.run(['--no-prompt'])).rejects.toThrow('Pass --type');
    expect(createRelease).not.toHaveBeenCalled();
  });

  it('exits non-zero on a rejected commit', async () => {
    vi.mocked(createRelease).mockResolvedValue({
      ...created,
      status: 'Commit rejected',
      commitError: 'needs a ticket',
    });

    await ProjectReleaseCreate.run(['--type', 'minor', '--no-prompt']);

    expect(process.exitCode).toBe(1);
  });
});
