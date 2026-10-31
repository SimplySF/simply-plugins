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
import { rollForward } from '@simplysf/simply-cicd-core';
import ReleaseRollForward from '../../../../../src/commands/simply/cicd/release/roll-forward.js';

vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  rollForward: vi.fn(),
}));

const hop = {
  source: 'release/v1.1.0',
  target: 'release/v1.2.0',
  rollBranch: 'roll-forward/v1.1.0-to-v1.2.0',
  tags: ['v1.1.0.13'],
};

describe('release roll-forward', () => {
  const originalExitCode = process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rollForward).mockResolvedValue({ declined: false, hops: [{ ...hop, status: 'Rolled' }] });
  });

  afterEach(() => {
    process.exitCode = originalExitCode;
  });

  it('delegates with defaults, and asks for confirmation', async () => {
    const result = await ReleaseRollForward.run([]);

    expect(result.hops[0].status).toBe('Rolled');
    expect(rollForward).toHaveBeenCalledWith(
      expect.objectContaining({
        packageReleaseBranchPrefix: 'release/',
        remote: 'origin',
        dryRun: false,
        noPush: false,
        confirm: expect.any(Function) as unknown,
      }),
    );
  });

  it('passes the branch flags through', async () => {
    await ReleaseRollForward.run(['--source', 'release/v1.1.0', '--target', 'release/v1.2.0', '--dry-run']);

    expect(rollForward).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'release/v1.1.0', target: 'release/v1.2.0', dryRun: true }),
    );
  });

  it.each([['--no-prompt'], ['--no-push'], ['--json']])('does not ask for confirmation with %s', async (flag) => {
    await ReleaseRollForward.run([flag]);

    expect(rollForward).toHaveBeenCalledWith(expect.objectContaining({ confirm: undefined }));
  });

  it('passes --message through', async () => {
    await ReleaseRollForward.run(['--no-prompt', '--message', 'chore: {SOURCE} into {TARGET}']);

    expect(rollForward).toHaveBeenCalledWith(expect.objectContaining({ message: 'chore: {SOURCE} into {TARGET}' }));
  });

  it('exits non-zero on a rejected commit', async () => {
    vi.mocked(rollForward).mockResolvedValue({
      declined: false,
      hops: [{ ...hop, status: 'Commit rejected', commitError: 'needs a ticket' }],
    });

    await ReleaseRollForward.run(['--no-prompt']);

    expect(process.exitCode).toBe(1);
  });

  it('exits non-zero on a conflict', async () => {
    vi.mocked(rollForward).mockResolvedValue({
      declined: false,
      hops: [{ ...hop, status: 'Conflict', conflictedFiles: ['a.txt'] }],
    });

    await ReleaseRollForward.run(['--no-prompt']);

    expect(process.exitCode).toBe(1);
  });
});
