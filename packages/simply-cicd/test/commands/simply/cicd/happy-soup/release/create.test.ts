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
import {
  createReleaseBranch,
  resolveHappySoupVcs,
  type CreateReleaseBranchResult,
  type HappySoupReleaseVcs,
} from '@simplysf/simply-cicd-core';
import HappySoupReleaseCreate from '../../../../../../src/commands/simply/cicd/happy-soup/release/create.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  createReleaseBranch: vi.fn(),
  resolveHappySoupVcs: vi.fn(),
}));

const created: CreateReleaseBranchResult = {
  branch: 'release/2026-10-19',
  base: 'environment/production',
  status: 'Created',
  commit: 'abc123',
  files: ['deployment-steps/2026-10-19.md', 'deployment-configs/2026-10-19.json'],
  skippedTemplates: [],
  pushed: true,
  mergeRequest: { status: 'Created', title: 'Draft: Release 2026-10-19', target: 'environment/production', iid: 4 },
  warnings: [],
};

const vcs = { provider: { kind: 'gitlab' }, project: '123' } as unknown as HappySoupReleaseVcs;

type Prompts = { promptForDate: () => Promise<string> };
const prototype = HappySoupReleaseCreate.prototype as unknown as Prompts;

describe('simply cicd happy-soup release create', () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createReleaseBranch).mockResolvedValue(created);
    vi.mocked(resolveHappySoupVcs).mockReturnValue(vcs);
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY;
    vi.restoreAllMocks();
  });

  it('opens the release with the merge request settings resolved from the flags', async () => {
    const result = await HappySoupReleaseCreate.run([
      '--date',
      '2026-10-19',
      '--vcs-provider',
      'github',
      '--vcs-host',
      'git.example.com',
      '--vcs-project-id',
      'org/repo',
      '--vcs-token',
      'tok',
    ]);

    expect(result.status).toBe('Created');
    expect(resolveHappySoupVcs).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'github', host: 'git.example.com', projectId: 'org/repo', token: 'tok' }),
    );
    expect(createReleaseBranch).toHaveBeenCalledWith({
      date: '2026-10-19',
      baseBranch: undefined,
      configPath: undefined,
      remote: 'origin',
      message: undefined,
      push: true,
      mergeRequest: true,
      vcs,
      dryRun: false,
    });
  });

  it('passes the branch, config, and message flags through', async () => {
    await HappySoupReleaseCreate.run([
      '-d',
      '2026-10-19',
      '-b',
      'environment/uat',
      '-c',
      'settings/release.json',
      '--remote',
      'upstream',
      '--message',
      'chore: PROJ-1 {DATE}',
      '--dry-run',
    ]);

    expect(createReleaseBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        baseBranch: 'environment/uat',
        configPath: 'settings/release.json',
        remote: 'upstream',
        message: 'chore: PROJ-1 {DATE}',
        dryRun: true,
      }),
    );
  });

  it.each([
    ['--no-merge-request', true],
    ['--no-push', false],
  ])('skips the merge request, and needs no VCS settings, with %s', async (flag, push) => {
    await HappySoupReleaseCreate.run(['--date', '2026-10-19', flag]);

    expect(resolveHappySoupVcs).not.toHaveBeenCalled();
    expect(createReleaseBranch).toHaveBeenCalledWith(
      expect.objectContaining({ push, mergeRequest: false, vcs: undefined }),
    );
  });

  it('reads the token from SIMPLY_VCS_TOKEN', async () => {
    vi.stubEnv('SIMPLY_VCS_TOKEN', 'from-env');
    try {
      await HappySoupReleaseCreate.run(['--date', '2026-10-19']);
    } finally {
      vi.unstubAllEnvs();
    }

    expect(resolveHappySoupVcs).toHaveBeenCalledWith(expect.objectContaining({ token: 'from-env' }));
  });

  it('fails before anything runs when the merge request settings are missing', async () => {
    vi.mocked(resolveHappySoupVcs).mockImplementation(() => {
      throw new Error('A VCS API token is needed for the merge request.');
    });

    await expect(HappySoupReleaseCreate.run(['--date', '2026-10-19'])).rejects.toThrow('A VCS API token is needed');
    expect(createReleaseBranch).not.toHaveBeenCalled();
  });

  it('asks for the date in a terminal', async () => {
    process.stdin.isTTY = true;
    const prompt = vi.spyOn(prototype, 'promptForDate').mockResolvedValue('2026-11-02');

    await HappySoupReleaseCreate.run(['--no-merge-request']);

    expect(prompt).toHaveBeenCalled();
    expect(createReleaseBranch).toHaveBeenCalledWith(expect.objectContaining({ date: '2026-11-02' }));
  });

  it.each([['--no-prompt'], ['--json']])('requires --date instead of asking with %s', async (flag) => {
    process.stdin.isTTY = true;
    const prompt = vi.spyOn(prototype, 'promptForDate');

    await expect(HappySoupReleaseCreate.run([flag, '--no-merge-request'])).rejects.toThrow('Pass --date');
    expect(prompt).not.toHaveBeenCalled();
  });

  it('requires --date when there is no terminal', async () => {
    process.stdin.isTTY = false;

    await expect(HappySoupReleaseCreate.run(['--no-merge-request'])).rejects.toThrow('Pass --date');
  });

  it('shows the warnings the run collected, and returns the result for --json', async () => {
    vi.mocked(createReleaseBranch).mockResolvedValue({ ...created, warnings: ['heads up'] });
    const warn = vi.spyOn(HappySoupReleaseCreate.prototype, 'warn');

    const result = await HappySoupReleaseCreate.run(['--date', '2026-10-19', '--json']);

    expect(warn).toHaveBeenCalledWith('heads up');
    expect(result.mergeRequest?.iid).toBe(4);
  });
});
