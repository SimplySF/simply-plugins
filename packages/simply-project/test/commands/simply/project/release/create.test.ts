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

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { createRelease, resolveReleaseVcs, type CreateReleaseResult } from '@simplysf/simply-project-core';
import { confirm, outro, step } from '@simplysf/simply-plugin-kit';
import ProjectReleaseCreate from '../../../../../src/commands/simply/project/release/create.js';

vi.mock('@simplysf/simply-plugin-kit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-plugin-kit')>()),
  confirm: vi.fn(),
  step: vi.fn(),
  outro: vi.fn(),
}));

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

type Prompts = {
  promptForCreateRelease: (platform: string) => Promise<boolean>;
  promptForSetDefault: () => Promise<boolean>;
};
const prompts = ProjectReleaseCreate.prototype as unknown as Prompts;

describe('simply project release create', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createRelease).mockResolvedValue(created);
    vi.mocked(resolveReleaseVcs).mockReturnValue(vcs);
    vi.spyOn(prompts, 'promptForCreateRelease').mockResolvedValue(false);
    vi.spyOn(prompts, 'promptForSetDefault').mockResolvedValue(false);
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
  });

  describe('VCS prompts', () => {
    it('asks both questions, naming the configured platform, and passes the answers on', async () => {
      vi.mocked(resolveReleaseVcs).mockReturnValue({
        ...vcs,
        provider: { kind: 'github' },
      } as unknown as ReturnType<typeof resolveReleaseVcs>);
      vi.mocked(prompts.promptForCreateRelease).mockResolvedValue(true);
      vi.mocked(prompts.promptForSetDefault).mockResolvedValue(true);

      await ProjectReleaseCreate.run(['--type', 'minor']);

      expect(prompts.promptForCreateRelease).toHaveBeenCalledWith('GitHub');
      expect(resolveReleaseVcs).toHaveBeenCalledTimes(1);
      expect(createRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          createRelease: true,
          setDefault: true,
          vcs: expect.objectContaining({ provider: { kind: 'github' } }) as unknown,
        }),
      );
    });

    it('names GitLab for a GitLab project', async () => {
      await ProjectReleaseCreate.run(['--type', 'minor']);

      expect(prompts.promptForCreateRelease).toHaveBeenCalledWith('GitLab');
    });

    it('passes no VCS when both answers are no', async () => {
      await ProjectReleaseCreate.run(['--type', 'minor']);

      expect(prompts.promptForCreateRelease).toHaveBeenCalled();
      expect(prompts.promptForSetDefault).toHaveBeenCalled();
      expect(createRelease).toHaveBeenCalledWith(
        expect.objectContaining({ createRelease: false, setDefault: false, vcs: undefined }),
      );
    });

    it('asks only about the release when --set-default is passed', async () => {
      vi.mocked(prompts.promptForCreateRelease).mockResolvedValue(true);

      await ProjectReleaseCreate.run(['--type', 'minor', '--set-default']);

      expect(prompts.promptForSetDefault).not.toHaveBeenCalled();
      expect(resolveReleaseVcs).toHaveBeenCalledTimes(1);
      expect(createRelease).toHaveBeenCalledWith(
        expect.objectContaining({ createRelease: true, setDefault: true, vcs }),
      );
    });

    it.each([['--create-release'], ['--release-tag=v1.2.0.9']])(
      'does not ask about the release with %s',
      async (flag) => {
        await ProjectReleaseCreate.run(['--type', 'minor', flag]);

        expect(prompts.promptForCreateRelease).not.toHaveBeenCalled();
        expect(prompts.promptForSetDefault).toHaveBeenCalled();
        expect(createRelease).toHaveBeenCalledWith(expect.objectContaining({ setDefault: false, vcs }));
      },
    );

    it('asks nothing when both steps were already asked for', async () => {
      await ProjectReleaseCreate.run(['--type', 'minor', '--create-release', '--set-default']);

      expect(prompts.promptForCreateRelease).not.toHaveBeenCalled();
      expect(prompts.promptForSetDefault).not.toHaveBeenCalled();
      expect(resolveReleaseVcs).toHaveBeenCalledTimes(1);
    });

    it('skips the questions with a notice, and still cuts, when the VCS settings do not resolve', async () => {
      vi.mocked(resolveReleaseVcs).mockImplementation(() => {
        throw new Error('A VCS API token is required.');
      });
      const info = vi.spyOn(ProjectReleaseCreate.prototype, 'info');

      await ProjectReleaseCreate.run(['--type', 'minor']);

      expect(prompts.promptForCreateRelease).not.toHaveBeenCalled();
      expect(prompts.promptForSetDefault).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith(expect.stringContaining('provide a VCS token and project ID'));
      expect(createRelease).toHaveBeenCalledWith(
        expect.objectContaining({ createRelease: false, setDefault: false, vcs: undefined }),
      );
    });

    it('still fails before cutting when a flag needs VCS settings that do not resolve', async () => {
      vi.mocked(resolveReleaseVcs).mockImplementation(() => {
        throw new Error('A VCS API token is required.');
      });

      await expect(ProjectReleaseCreate.run(['--type', 'minor', '--set-default'])).rejects.toThrow(
        'A VCS API token is required.',
      );
      expect(createRelease).not.toHaveBeenCalled();
    });

    it.each([['--no-prompt'], ['--dry-run'], ['--json']])('asks nothing with %s', async (flag) => {
      await ProjectReleaseCreate.run(['--type', 'minor', flag]);

      expect(prompts.promptForCreateRelease).not.toHaveBeenCalled();
      expect(prompts.promptForSetDefault).not.toHaveBeenCalled();
      expect(resolveReleaseVcs).not.toHaveBeenCalled();
    });
  });

  describe('increments', () => {
    const envNames = [
      'SIMPLY_PROJECT_RELEASE_MAJOR_INCREMENT',
      'SIMPLY_PROJECT_RELEASE_MINOR_INCREMENT',
      'SIMPLY_PROJECT_RELEASE_PATCH_INCREMENT',
    ];

    afterEach(() => {
      for (const name of envNames) {
        delete process.env[name];
      }
    });

    it('passes no increment when none is set, leaving createRelease to read sfdx-project.json', async () => {
      await ProjectReleaseCreate.run(['--type', 'minor', '--no-prompt']);

      expect(vi.mocked(createRelease).mock.calls[0][0].increment).toBeUndefined();
    });

    it.each([
      ['major', '--major-increment'],
      ['minor', '--minor-increment'],
      ['patch', '--patch-increment'],
    ])('passes %s releases their own flag only', async (type, flag) => {
      await ProjectReleaseCreate.run([
        '--type',
        type,
        '--major-increment',
        '2',
        '--minor-increment',
        '10',
        '--patch-increment',
        '5',
        '--no-prompt',
      ]);

      const expected = { '--major-increment': 2, '--minor-increment': 10, '--patch-increment': 5 }[flag];
      expect(createRelease).toHaveBeenCalledWith(expect.objectContaining({ type, increment: expected }));
    });

    it('reads each increment from its environment variable, and the flag beats it', async () => {
      process.env.SIMPLY_PROJECT_RELEASE_MINOR_INCREMENT = '10';
      await ProjectReleaseCreate.run(['--type', 'minor', '--no-prompt']);
      expect(createRelease).toHaveBeenLastCalledWith(expect.objectContaining({ increment: 10 }));

      await ProjectReleaseCreate.run(['--type', 'minor', '--minor-increment', '20', '--no-prompt']);
      expect(createRelease).toHaveBeenLastCalledWith(expect.objectContaining({ increment: 20 }));
    });

    it('ignores the environment variable for another type', async () => {
      process.env.SIMPLY_PROJECT_RELEASE_MAJOR_INCREMENT = '3';
      await ProjectReleaseCreate.run(['--type', 'minor', '--no-prompt']);

      expect(vi.mocked(createRelease).mock.calls[0][0].increment).toBeUndefined();
    });

    it.each(['0', '-1', '1.5'])('rejects an increment of %s before calling createRelease', async (value) => {
      await expect(
        ProjectReleaseCreate.run(['--type', 'minor', '--minor-increment', value, '--no-prompt']),
      ).rejects.toThrow();
      expect(createRelease).not.toHaveBeenCalled();
    });
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

  describe('output', () => {
    const everything: CreateReleaseResult = {
      ...created,
      commit: '512c18751df66aaa864439572eb664d7f3e935ca',
      release: {
        name: 'v1.2.0',
        tagName: 'v1.2.0.11',
        status: 'Already exists',
        webUrl: 'https://gitlab.example.com/g/p/-/releases/v1.2.0.11',
      },
      defaultBranch: { status: 'Set' },
    };

    let log: MockInstance<ProjectReleaseCreate['log']>;
    const logged = (): string[] => log.mock.calls.map(([line]) => String(line));

    beforeEach(() => {
      log = vi.spyOn(ProjectReleaseCreate.prototype, 'log').mockImplementation(() => {});
    });

    it('logs one plain line per step, with the short SHA and the release URL, when it cannot prompt', async () => {
      vi.mocked(createRelease).mockResolvedValue(everything);

      await ProjectReleaseCreate.run(['--type', 'minor', '--no-prompt']);

      expect(logged()).toEqual([
        'Created release/v1.3.0 from release/v1.2.0 (512c187)',
        'Release v1.2.0 already exists\nhttps://gitlab.example.com/g/p/-/releases/v1.2.0.11',
        'release/v1.3.0 is now the default branch',
      ]);
      expect(step).not.toHaveBeenCalled();
      expect(outro).not.toHaveBeenCalled();
    });

    it('says what would happen on a dry run', async () => {
      vi.mocked(createRelease).mockResolvedValue({
        ...created,
        status: 'Would create',
        commit: undefined,
        release: { name: 'v1.2.0', tagName: 'v1.2.0.11', status: 'Would create' },
        defaultBranch: { status: 'Would set' },
      });

      await ProjectReleaseCreate.run(['--type', 'minor', '--dry-run']);

      expect(logged()).toEqual([
        'Would create release/v1.3.0 from release/v1.2.0, with version 1.3.0',
        'Would publish release v1.2.0 from tag v1.2.0.11',
        'Would make release/v1.3.0 the default branch',
      ]);
    });

    it('reports a rejected commit and the default branch it did not set', async () => {
      vi.mocked(createRelease).mockResolvedValue({
        ...created,
        status: 'Commit rejected',
        commit: undefined,
        defaultBranch: { status: 'Not set' },
      });

      await ProjectReleaseCreate.run(['--type', 'minor', '--no-prompt']);

      expect(logged()).toEqual([
        'A hook rejected the commit on release/v1.3.0, so nothing was pushed',
        "Didn't make release/v1.3.0 the default branch",
      ]);
    });

    it('logs nothing with --json', async () => {
      vi.mocked(createRelease).mockResolvedValue(everything);

      await ProjectReleaseCreate.run(['--type', 'minor', '--json']);

      expect(logged()).toEqual([]);
    });

    it('follows the spinner with a step per VCS result and an outro in a terminal', async () => {
      vi.mocked(createRelease).mockResolvedValue(everything);

      await ProjectReleaseCreate.run(['--type', 'minor']);

      expect(vi.mocked(step).mock.calls).toEqual([
        ['Release v1.2.0 already exists\nhttps://gitlab.example.com/g/p/-/releases/v1.2.0.11'],
        ['release/v1.3.0 is now the default branch'],
      ]);
      expect(outro).toHaveBeenCalledWith('Done. The push started the build that creates the package version.');
      expect(logged()).toEqual([]);
    });

    it('closes a declined run with "Nothing was changed." and no step lines', async () => {
      vi.mocked(createRelease).mockResolvedValue({ ...everything, status: 'Declined', commit: undefined });

      await ProjectReleaseCreate.run(['--type', 'minor']);

      expect(step).not.toHaveBeenCalled();
      expect(outro).toHaveBeenCalledWith('Nothing was changed.');
    });

    it('prints the plan once as a step, then asks only "Continue?"', async () => {
      vi.mocked(confirm).mockResolvedValue(true);
      const command = new ProjectReleaseCreate([], {} as never) as unknown as {
        confirmPlan: (plan: CreateReleaseResult) => Promise<boolean>;
      };

      expect(
        await command.confirmPlan({ ...everything, release: { ...everything.release!, status: 'Would create' } }),
      ).toBe(true);

      // A Windows checkout reads the messages file with CRLF line breaks.
      expect(String(vi.mocked(step).mock.calls[0]?.[0]).replace(/\r\n/g, '\n')).toBe(
        [
          'This will:',
          '- Publish release v1.2.0 from tag v1.2.0.11.',
          '- Create release/v1.3.0 from release/v1.2.0, with version 1.3.0, and push it. The push starts a build that creates a package version.',
          "- Make release/v1.3.0 the project's default branch.",
        ].join('\n'),
      );
      expect(confirm).toHaveBeenCalledWith({ message: 'Continue?' });
    });
  });
});
