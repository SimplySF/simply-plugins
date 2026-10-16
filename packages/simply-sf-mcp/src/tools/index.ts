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

import { tierAllowed, type Tier, type Toolset } from '../tiers.js';
import { aepTools } from './aep.js';
import { apexTools } from './apex.js';
import type { ToolDefinition } from './defineTool.js';
import { packageTools } from './package.js';

/** Every tool the server can register, before `--toolsets` and `--allow` filter them. */
export const ALL_TOOLS: readonly ToolDefinition[] = [...apexTools, ...aepTools, ...packageTools];

/**
 * @returns The tools to register. Filtered-out tools are left out entirely rather than registered
 * and refused, so an agent never sees, or spends context on, a tool it can't use.
 */
export function selectTools(options: { toolsets: readonly Toolset[]; allow: Tier }): ToolDefinition[] {
  return ALL_TOOLS.filter((tool) => options.toolsets.includes(tool.toolset) && tierAllowed(tool.tier, options.allow));
}
