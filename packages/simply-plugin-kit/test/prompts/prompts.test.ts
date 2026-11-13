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
import { confirm, select, spinner, text } from '../../src/prompts/prompts.js';

// Typed as never so it stands in for clack's own (unexported) unique cancel symbol.
const CANCEL = Symbol('clack:cancel') as never;

vi.mock('@clack/prompts', () => ({
  select: vi.fn(),
  confirm: vi.fn(),
  text: vi.fn(),
  spinner: vi.fn(),
  isCancel: (value: unknown) => value === CANCEL,
}));

const clackSelect = vi.mocked(clack.select);
const clackConfirm = vi.mocked(clack.confirm);
const clackText = vi.mocked(clack.text);
const clackSpinner = vi.mocked(clack.spinner);

/** A stand-in for clack's spinner that records every call, in order, in `calls`. */
function fakeSpinner(): { calls: string[] } {
  const calls: string[] = [];
  const record =
    (name: string) =>
    (msg?: string): void => {
      calls.push(msg === undefined ? name : `${name}:${msg}`);
    };
  clackSpinner.mockReturnValue({
    start: record('start'),
    stop: record('stop'),
    error: record('error'),
    cancel: record('cancel'),
    message: record('message'),
    clear: record('clear'),
    isCancelled: false,
  });
  return { calls };
}

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

  describe('text', () => {
    /** The validate function text() handed to clack. */
    const validatorOf = (): ((value: string | undefined) => unknown) =>
      (clackText.mock.calls[0][0] as { validate: (value: string | undefined) => unknown }).validate;

    it('returns the trimmed answer and forwards the display options', async () => {
      clackText.mockResolvedValue('  PROJ-1058 ');

      expect(await text({ message: 'Name?', placeholder: 'PROJ-123', initialValue: 'x' })).toBe('PROJ-1058');
      expect(clackText).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Name?', placeholder: 'PROJ-123', initialValue: 'x' }),
      );
    });

    it('refuses an empty answer unless allowed, then runs the caller validation on the trimmed value', async () => {
      clackText.mockResolvedValue('ok');
      const validate = vi.fn((value: string) => (value === 'bad' ? 'Not that one' : undefined));

      await text({ message: 'Name?', validate });
      const check = validatorOf();

      expect(check('   ')).toBe('An answer is required.');
      expect(check(undefined)).toBe('An answer is required.');
      expect(check(' bad ')).toBe('Not that one');
      expect(check('good')).toBeUndefined();
      expect(validate).toHaveBeenCalledWith('bad');
    });

    it('accepts an empty answer with allowEmpty', async () => {
      clackText.mockResolvedValue('');

      await text({ message: 'Optional?', allowEmpty: true });

      expect(validatorOf()('')).toBeUndefined();
    });

    it('throws PromptCancelledError when the user cancels', async () => {
      clackText.mockResolvedValue(CANCEL);

      await expect(text({ message: 'Name?' })).rejects.toMatchObject({ name: 'PromptCancelledError' });
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

  describe('spinner', () => {
    it('starts on the message and stops on doneMessage when the task resolves', async () => {
      const { calls } = fakeSpinner();

      expect(await spinner({ message: 'Working', doneMessage: 'Done' }, async () => 42)).toBe(42);
      expect(calls).toEqual(['start:Working', 'stop:Done']);
    });

    it('builds the stop text from the result when doneMessage is a function', async () => {
      const { calls } = fakeSpinner();

      await spinner({ message: 'Working', doneMessage: (n: number) => `Made ${n}` }, async () => 3);

      expect(calls).toEqual(['start:Working', 'stop:Made 3']);
    });

    it('stops on the latest message when no doneMessage is given', async () => {
      const { calls } = fakeSpinner();

      await spinner({ message: 'Fetching' }, async (control) => {
        control.message('Pushing');
      });

      expect(calls).toEqual(['start:Fetching', 'message:Pushing', 'stop:Pushing']);
    });

    it('shows the error state and rethrows the error unchanged', async () => {
      const { calls } = fakeSpinner();
      const failure = new Error('push rejected');

      await expect(
        spinner({ message: 'Pushing' }, async () => {
          throw failure;
        }),
      ).rejects.toBe(failure);
      expect(calls).toEqual(['start:Pushing', 'error:Pushing']);
    });

    it('clears the spinner around a paused prompt and restarts it with the current text', async () => {
      const { calls } = fakeSpinner();

      const answer = await spinner({ message: 'Planning' }, async (control) =>
        control.pause(async () => {
          calls.push('prompt');
          return true;
        }),
      );

      expect(answer).toBe(true);
      expect(calls).toEqual(['start:Planning', 'clear', 'prompt', 'start:Planning', 'stop:Planning']);
    });

    it('restarts, then shows the error state, when a paused prompt is cancelled', async () => {
      const { calls } = fakeSpinner();
      clackConfirm.mockResolvedValue(CANCEL);

      await expect(
        spinner({ message: 'Planning' }, async (control) => control.pause(() => confirm({ message: 'Go?' }))),
      ).rejects.toMatchObject({ name: 'PromptCancelledError' });
      expect(calls).toEqual(['start:Planning', 'clear', 'start:Planning', 'error:Planning']);
    });

    it('exits with status 130 when clack reports Ctrl+C', async () => {
      fakeSpinner();
      const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await spinner({ message: 'Working' }, async () => undefined);
      clackSpinner.mock.calls[0][0]!.onCancel!();

      expect(exit).toHaveBeenCalledWith(130);
      exit.mockRestore();
    });

    it('draws nothing when disabled, and still runs the task and its prompts', async () => {
      const answer = await spinner({ message: 'Working', enabled: false }, async (control) => {
        control.message('ignored');
        return control.pause(async () => 'answered');
      });

      expect(answer).toBe('answered');
      expect(clackSpinner).not.toHaveBeenCalled();
    });
  });
});
