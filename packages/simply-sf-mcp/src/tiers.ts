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

import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

/**
 * What a tool does to the org, lowest first. Writing local files doesn't raise a tool's tier: those
 * changes show up in the agent's diff and are easy to undo.
 */
export const TIERS = ['read', 'write', 'destructive'] as const;

export type Tier = (typeof TIERS)[number];

/** The groups `--toolsets` selects from. */
export const TOOLSETS = ['apex', 'aep', 'package'] as const;

export type Toolset = (typeof TOOLSETS)[number];

/** @returns Whether a server started with `--allow <allow>` registers a tool of `tier`. */
export function tierAllowed(tier: Tier, allow: Tier): boolean {
  return TIERS.indexOf(tier) <= TIERS.indexOf(allow);
}

/** @returns The MCP annotations a client uses to decide how hard to ask before running a tool of `tier`. */
export function annotationsFor(tier: Tier): ToolAnnotations {
  switch (tier) {
    case 'read':
      return { readOnlyHint: true };
    case 'write':
      return { readOnlyHint: false, destructiveHint: false };
    case 'destructive':
      return { readOnlyHint: false, destructiveHint: true };
  }
}
