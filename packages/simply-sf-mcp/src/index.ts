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

export { createServer, main, serverVersion, SERVER_NAME } from './server.js';
export { parseOptions, OptionsError, type ServerOptions } from './options.js';
export { ALL_TOOLS, selectTools } from './tools/index.js';
export { ERROR_CODE_META_KEY, type ToolDefinition } from './tools/defineTool.js';
export { ConnectionCache, salesforceOrgBackend, type OrgBackend, type OrgHandle } from './org/connectionCache.js';
export { TIERS, TOOLSETS, annotationsFor, type Tier, type Toolset } from './tiers.js';
