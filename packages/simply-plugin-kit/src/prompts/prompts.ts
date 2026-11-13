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
import { Messages } from '@salesforce/core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-plugin-kit', 'simply.plugin-kit');

/** One choice in a {@link select} prompt. */
export type SelectOption<T> = {
  value: T;
  /** The text shown for the option. Defaults to `String(value)`. */
  label?: string;
  /** Extra text shown beside the option while it is highlighted. */
  hint?: string;
};

export type SelectPromptOptions<T> = {
  message: string;
  options: Array<SelectOption<T>>;
  initialValue?: T;
  /** How many options to show at once before the list scrolls. */
  maxItems?: number;
};

export type ConfirmPromptOptions = {
  message: string;
  /** How long to wait for an answer before resolving `defaultAnswer`. Defaults to 10 seconds. */
  ms?: number;
  defaultAnswer?: boolean;
};

export type TextPromptOptions = {
  message: string;
  /** Shown in the empty field as a hint. Not returned. */
  placeholder?: string;
  /** Pre-filled, editable answer. */
  initialValue?: string;
  /**
   * Checks the trimmed answer. Return a message to show and ask again, or `undefined` to accept it.
   * An empty answer is refused unless `allowEmpty` is set.
   */
  validate?: (value: string) => string | undefined;
  /** Accept an empty answer. Defaults to `false`. */
  allowEmpty?: boolean;
};

/**
 * Ask the user to type a single line.
 *
 * @returns The answer, trimmed.
 * @throws {SfError} `PromptCancelledError` if the user cancels (Ctrl+C / Esc).
 */
export async function text({
  message,
  placeholder,
  initialValue,
  validate,
  allowEmpty = false,
}: TextPromptOptions): Promise<string> {
  const answer = await clack.text({
    message,
    placeholder,
    initialValue,
    validate: (value) => {
      const trimmed = (value ?? '').trim();
      if (!trimmed && !allowEmpty) {
        return messages.getMessage('prompt.required');
      }
      return validate?.(trimmed);
    },
  });
  if (clack.isCancel(answer)) {
    throw messages.createError('error.promptCancelled');
  }
  return answer.trim();
}

/**
 * Ask the user to pick one option.
 *
 * @returns The `value` of the chosen option.
 * @throws {SfError} `PromptCancelledError` if the user cancels (Ctrl+C / Esc).
 */
export async function select<T>({ message, options, initialValue, maxItems }: SelectPromptOptions<T>): Promise<T> {
  const answer = await clack.select<T>({
    message,
    // clack's Option<T> type is conditional on T being a primitive; ours is the common shape of both branches.
    options: options as Parameters<typeof clack.select<T>>[0]['options'],
    initialValue,
    maxItems,
  });
  if (clack.isCancel(answer)) {
    throw messages.createError('error.promptCancelled');
  }
  return answer;
}

/**
 * Ask a yes/no question. Same contract as `SfCommand.confirm()`: if nobody answers within `ms`, it
 * resolves `defaultAnswer`, so an unattended run declines instead of hanging.
 *
 * @returns The user's answer, or `defaultAnswer` on timeout.
 * @throws {SfError} `PromptCancelledError` if the user cancels (Ctrl+C / Esc).
 */
export async function confirm({ message, ms = 10_000, defaultAnswer = false }: ConfirmPromptOptions): Promise<boolean> {
  const signal = AbortSignal.timeout(ms);
  const answer = await clack.confirm({ message, initialValue: defaultAnswer, signal });
  if (clack.isCancel(answer)) {
    // clack reports an aborted prompt as a cancel; the signal says which one it was.
    if (signal.aborted) {
      return defaultAnswer;
    }
    throw messages.createError('error.promptCancelled');
  }
  return answer;
}

export type SpinnerOptions<T> = {
  /** Shown beside the spinner while the task runs. */
  message: string;
  /** Shown when the task resolves, or built from its result. Defaults to the current message. */
  doneMessage?: string | ((result: T) => string);
  /** Draw the spinner. Pass the command's interactive guard, so `--json` output stays clean. Defaults to `true`. */
  enabled?: boolean;
};

/** Handed to a {@link spinner} task, to change the spinner's text or step aside for a prompt. */
export type SpinnerControl = {
  /** Replace the spinner's text. */
  message(text: string): void;
  /** Clear the spinner, run `prompt`, then restart the spinner with its current text. */
  pause<T>(prompt: () => Promise<T>): Promise<T>;
};

/** Exit status for a run interrupted by Ctrl+C (128 + SIGINT). */
const SIGINT_EXIT_CODE = 130;

/**
 * Run `task` behind a clack spinner. The spinner stops with `doneMessage` when the task resolves,
 * or in its error state when it throws; the error is rethrown unchanged.
 *
 * @returns Whatever `task` resolves.
 */
export async function spinner<T>(
  { message, doneMessage, enabled = true }: SpinnerOptions<T>,
  task: (control: SpinnerControl) => Promise<T>,
): Promise<T> {
  if (!enabled) {
    return task({ message: () => {}, pause: (prompt) => prompt() });
  }

  // While it runs, clack's spinner listens for SIGINT, which replaces Node's default exit on Ctrl+C.
  const spin = clack.spinner({ onCancel: () => process.exit(SIGINT_EXIT_CODE) });
  let current = message;
  spin.start(current);
  try {
    const result = await task({
      message: (next) => {
        current = next;
        spin.message(next);
      },
      pause: async (prompt) => {
        spin.clear();
        try {
          return await prompt();
        } finally {
          spin.start(current);
        }
      },
    });
    spin.stop(typeof doneMessage === 'function' ? doneMessage(result) : (doneMessage ?? current));
    return result;
  } catch (error) {
    spin.error(current);
    throw error;
  }
}
