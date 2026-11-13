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
  listStagingBaseBranches,
  loadReleaseConfig,
  parseReleaseConfig,
  stageReleaseBranch,
} from '@simplysf/simply-cicd-core';
import { select, text } from '@simplysf/simply-plugin-kit';
import HappySoupReleaseStage from '../../../../../../src/commands/simply/cicd/happy-soup/release/stage.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  listStagingBaseBranches: vi.fn(),
  loadReleaseConfig: vi.fn(),
  stageReleaseBranch: vi.fn(),
}));

vi.mock('@simplysf/simply-plugin-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-plugin-kit')>()),
  select: vi.fn(),
  text: vi.fn(),
}));

const OTHER = '\0other';

const config = parseReleaseConfig({
  teams: [
    { name: 'Platform', label: 'Platform team', applications: [{ name: 'core', description: 'Core services' }] },
    { name: 'ops' },
  ],
  applications: ['shared'],
  productionBranch: 'environment/production',
});

const flags = ['--team', 'platform', '--app', 'core', '--name', 'PROJ-1058'];

describe('simply cicd happy-soup release stage', () => {
  const originalIsTTY = process.stdin.isTTY;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadReleaseConfig).mockReturnValue({ config });
    vi.mocked(listStagingBaseBranches).mockResolvedValue(['environment/production', 'release/2026-10-19']);
    vi.mocked(stageReleaseBranch).mockImplementation((options) =>
      Promise.resolve({
        branch: `${options.team}/${options.app}/${options.name}`,
        base: options.baseBranch,
        status: 'Created',
        warnings: [],
      }),
    );
  });

  afterEach(() => {
    process.stdin.isTTY = originalIsTTY;
    vi.restoreAllMocks();
  });

  it("stages from the production branch without prompts, using the configured team's spelling", async () => {
    const result = await HappySoupReleaseStage.run([...flags, '--no-prompt', '-c', 'settings/release.json']);

    expect(result).toMatchObject({ branch: 'Platform/core/PROJ-1058', base: 'environment/production' });
    expect(loadReleaseConfig).toHaveBeenCalledWith(expect.objectContaining({ configPath: 'settings/release.json' }));
    expect(stageReleaseBranch).toHaveBeenCalledWith({
      team: 'Platform',
      app: 'core',
      name: 'PROJ-1058',
      baseBranch: 'environment/production',
      remote: 'origin',
      dryRun: false,
    });
    expect(select).not.toHaveBeenCalled();
    expect(listStagingBaseBranches).not.toHaveBeenCalled();
  });

  it('uses an unconfigured team as typed, and passes the base, remote, and dry-run flags through', async () => {
    await HappySoupReleaseStage.run([
      '--team',
      'Data',
      '-a',
      'etl',
      '-n',
      'PROJ-9',
      '-b',
      'release/2026-10-19',
      '--remote',
      'upstream',
      '--dry-run',
      '--no-prompt',
    ]);

    expect(stageReleaseBranch).toHaveBeenCalledWith(
      expect.objectContaining({
        team: 'Data',
        baseBranch: 'release/2026-10-19',
        remote: 'upstream',
        dryRun: true,
      }),
    );
  });

  it.each([['--no-prompt'], ['--json']])('names every missing flag instead of asking with %s', async (flag) => {
    process.stdin.isTTY = true;

    await expect(HappySoupReleaseStage.run(['--app', 'core', flag])).rejects.toThrow('Pass --team, --name');
    expect(stageReleaseBranch).not.toHaveBeenCalled();
  });

  it('asks for everything left out in a terminal, from the configuration', async () => {
    process.stdin.isTTY = true;
    vi.mocked(select)
      .mockResolvedValueOnce('Platform')
      .mockResolvedValueOnce('core')
      .mockResolvedValueOnce('release/2026-10-19');
    vi.mocked(text).mockResolvedValueOnce('PROJ-1058');

    const result = await HappySoupReleaseStage.run([]);

    expect(result).toMatchObject({ branch: 'Platform/core/PROJ-1058', base: 'release/2026-10-19' });
    const [teamPrompt, appPrompt, basePrompt] = vi.mocked(select).mock.calls.map(([options]) => options);
    expect(teamPrompt.options).toEqual([
      { value: 'Platform', label: 'Platform team' },
      { value: 'ops', label: 'ops' },
      { value: OTHER, label: 'Other (type a name)' },
    ]);
    expect(appPrompt.options).toEqual([
      { value: 'core', label: 'core', hint: 'Core services' },
      { value: OTHER, label: 'Other (type a name)' },
    ]);
    expect(basePrompt.options.map(({ value }) => value)).toEqual([
      'environment/production',
      'release/2026-10-19',
      OTHER,
    ]);
    expect(listStagingBaseBranches).toHaveBeenCalledWith({
      remote: 'origin',
      productionBranch: 'environment/production',
    });
  });

  it('offers the top-level applications for a team without its own, and asks for a name on "Other"', async () => {
    process.stdin.isTTY = true;
    vi.mocked(select).mockResolvedValueOnce('ops').mockResolvedValueOnce(OTHER);
    vi.mocked(text).mockResolvedValueOnce('billing');

    await HappySoupReleaseStage.run(['--name', 'PROJ-2', '--base-branch', 'environment/production']);

    expect(vi.mocked(select).mock.calls[1][0].options.map(({ value }) => value)).toEqual(['shared', OTHER]);
    expect(stageReleaseBranch).toHaveBeenCalledWith(expect.objectContaining({ team: 'ops', app: 'billing' }));
  });

  it('asks for a name straight away when nothing is configured', async () => {
    process.stdin.isTTY = true;
    vi.mocked(loadReleaseConfig).mockReturnValue({ config: parseReleaseConfig({}) });
    vi.mocked(text).mockResolvedValueOnce('platform').mockResolvedValueOnce('core');

    await HappySoupReleaseStage.run(['--name', 'PROJ-3', '--base-branch', 'environment/production']);

    expect(select).not.toHaveBeenCalled();
    expect(stageReleaseBranch).toHaveBeenCalledWith(expect.objectContaining({ team: 'platform', app: 'core' }));
  });

  it('shows the warnings the run collected', async () => {
    vi.mocked(stageReleaseBranch).mockResolvedValue({
      branch: 'Platform/core/PROJ-1058',
      base: 'environment/production',
      status: 'Already exists',
      warnings: ['diverged'],
    });
    const warn = vi.spyOn(HappySoupReleaseStage.prototype, 'warn');

    await HappySoupReleaseStage.run([...flags, '--no-prompt']);

    expect(warn).toHaveBeenCalledWith('diverged');
  });
});
