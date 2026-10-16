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

import { Messages } from '@salesforce/core';
import type { Toolset } from './tiers.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);

/**
 * @returns The toolset's `messages/simply.sf-mcp.<toolset>.md`: each tool's agent-facing
 * description under its tool name, and the error wording under `error.*`.
 */
export function loadToolsetMessages(toolset: Toolset): Messages<string> {
  return Messages.loadMessages('@simplysf/simply-sf-mcp', `simply.sf-mcp.${toolset}`);
}
