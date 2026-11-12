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
