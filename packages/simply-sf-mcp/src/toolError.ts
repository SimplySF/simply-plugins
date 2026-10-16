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

/**
 * An expected failure: a message for the agent and a stable `code` it can branch on. Thrown from a
 * tool's `run` and turned into an `isError` result, never a protocol error.
 */
export class ToolError extends Error {
  public readonly code: string;

  public constructor(code: string, message: string) {
    super(message);
    this.name = 'ToolError';
    this.code = code;
  }
}

/** @returns Whether `error` is Salesforce rejecting an expired or revoked session. */
export function isInvalidSession(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { name, message } = error;
  const errorCode = (error as { errorCode?: unknown }).errorCode;
  return name === 'INVALID_SESSION_ID' || errorCode === 'INVALID_SESSION_ID' || message.includes('INVALID_SESSION_ID');
}
