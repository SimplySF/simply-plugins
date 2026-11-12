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

import * as clack from '@clack/prompts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirm, select } from '../../src/prompts/prompts.js';

// Typed as never so it stands in for clack's own (unexported) unique cancel symbol.
const CANCEL = Symbol('clack:cancel') as never;

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
  isCancel: (value: unknown) => value === CANCEL,
}));

const clackSelect = vi.mocked(clack.select);
const clackConfirm = vi.mocked(clack.confirm);

describe('prompts', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('select', () => {
    it('forwards its options to clack and returns the chosen value', async () => {
      clackSelect.mockResolvedValue('b');
      const options = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', hint: 'second' },
      ];

      const answer = await select({ message: 'Pick one', options, initialValue: 'a', maxItems: 8 });

      expect(answer).toBe('b');
      expect(clackSelect).toHaveBeenCalledWith({ message: 'Pick one', options, initialValue: 'a', maxItems: 8 });
    });

    it('throws PromptCancelledError when the user cancels', async () => {
      clackSelect.mockResolvedValue(CANCEL);

      await expect(select({ message: 'Pick one', options: [{ value: 'a' }] })).rejects.toMatchObject({
        name: 'PromptCancelledError',
        message: 'Prompt cancelled.',
      });
    });
  });

  describe('confirm', () => {
    it("returns the user's answer and starts on the default", async () => {
      clackConfirm.mockResolvedValue(true);

      expect(await confirm({ message: 'Continue?' })).toBe(true);
      expect(clackConfirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Continue?', initialValue: false, signal: expect.any(AbortSignal) }),
      );
    });

    it('throws PromptCancelledError when the user cancels before the timeout', async () => {
      clackConfirm.mockResolvedValue(CANCEL);

      await expect(confirm({ message: 'Continue?' })).rejects.toMatchObject({ name: 'PromptCancelledError' });
    });

    it.each([false, true])('resolves defaultAnswer (%s) when the prompt times out', async (defaultAnswer) => {
      // Behave like clack: resolve the cancel symbol once the signal aborts.
      clackConfirm.mockImplementation(
        ({ signal }) =>
          new Promise((resolve) => signal!.addEventListener('abort', () => resolve(CANCEL), { once: true })),
      );

      expect(await confirm({ message: 'Continue?', ms: 5, defaultAnswer })).toBe(defaultAnswer);
    });
  });
});
