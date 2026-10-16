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

import fs from 'node:fs';
import path from 'node:path';
import type { Connection } from '@salesforce/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ConnectionCache } from '../org/connectionCache.js';
import { annotationsFor, type Tier, type Toolset } from '../tiers.js';
import { isInvalidSession, ToolError } from '../toolError.js';

/** The `_meta` key an error result carries its `code` under. */
export const ERROR_CODE_META_KEY = 'simplysf/errorCode';

/** The default for every list tool's `limit`. */
export const DEFAULT_LIMIT = 200;

/** `target_org` and `api_version`, shared by every tool that touches an org. */
export const orgArgs = {
  target_org: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Alias or username of an org the user has authorized with `sf org login`. Read-only tools fall back to ' +
        "the project's default target-org when it's omitted; tools that change an org require it.",
    ),
  api_version: z
    .string()
    .regex(/^\d+\.0$/, 'Expected an API version such as "62.0".')
    .optional()
    .describe('API version to use, for example "62.0". Defaults to the org\'s own.'),
};

export const limitArg = z
  .number()
  .int()
  .min(1)
  .max(10_000)
  .default(DEFAULT_LIMIT)
  .describe(`Maximum number of items to return. Defaults to ${DEFAULT_LIMIT}; check "truncated" in the result.`);

/** @returns The first `limit` items, with the full count and whether any were left out. */
export function limitItems<T>(items: readonly T[], limit: number): { items: T[]; total: number; truncated: boolean } {
  return { items: items.slice(0, limit), total: items.length, truncated: items.length > limit };
}

/** What a tool's `run` gets besides its arguments. */
export type ToolContext = {
  /** The project root from `--directory`. */
  directory: string;
  /** @returns `relativeOrAbsolute` resolved against the project root. */
  resolvePath(relativeOrAbsolute: string): string;
  /**
   * @returns The connection for `args`, resolved per the tool's tier.
   * @throws {ToolError} When no org can be resolved.
   */
  connection(args: { target_org?: string; api_version?: string }): Promise<Connection>;
  /** Reports progress when the client asked for it; otherwise does nothing. */
  progress(progress: number, total?: number, message?: string): Promise<void>;
};

/** A tool before registration, with its types erased so tools of every shape share one list. */
export type ToolDefinition = {
  name: string;
  toolset: Toolset;
  tier: Tier;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  outputSchema: z.ZodRawShape;
  run(args: unknown, context: ToolContext): Promise<Record<string, unknown>>;
  summarize(result: Record<string, unknown>): string;
};

/**
 * Declares a tool. The types of `run` and `summarize` follow from the schemas; registration
 * applies the tier's annotations and turns the result (or a thrown error) into a tool result.
 */
export function defineTool<In extends z.ZodRawShape, Out extends z.ZodRawShape>(tool: {
  name: string;
  toolset: Toolset;
  tier: Tier;
  title: string;
  description: string;
  inputSchema: In;
  outputSchema: Out;
  run(args: z.output<z.ZodObject<In>>, context: ToolContext): Promise<z.input<z.ZodObject<Out>>>;
  summarize(result: z.input<z.ZodObject<Out>>): string;
}): ToolDefinition {
  return tool;
}

/** @returns `error` as an `isError` result: the message for the agent, and its code in `_meta`. */
export function toErrorResult(error: unknown): CallToolResult {
  const code = error instanceof ToolError ? error.code : 'unexpected-error';
  const message = error instanceof Error ? error.message : String(error);
  if (!(error instanceof ToolError)) {
    // Unexpected, so worth a stack for whoever reads the client's server log. Never stdout.
    process.stderr.write(`simply-sf-mcp: ${error instanceof Error ? (error.stack ?? message) : message}\n`);
  }
  // The code goes in `_meta`, not `structuredContent`: clients validate `structuredContent` against
  // the tool's `outputSchema` even on an error result, so an error shape there would be rejected.
  return { isError: true, content: [{ type: 'text', text: message }], _meta: { [ERROR_CODE_META_KEY]: code } };
}

/** Registers `tool` on `server`, resolving orgs through `connections`. */
export function registerTool(
  server: McpServer,
  tool: ToolDefinition,
  { directory, connections }: { directory: string; connections: ConnectionCache },
): void {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
      outputSchema: tool.outputSchema,
      annotations: { title: tool.title, ...annotationsFor(tool.tier) },
    },
    async (args, extra): Promise<CallToolResult> => {
      const usedKeys = new Set<string>();
      // eslint-disable-next-line no-underscore-dangle -- `_meta` is the MCP protocol's own field name
      const progressToken = extra._meta?.progressToken;

      const context: ToolContext = {
        directory,
        resolvePath: (target) => path.resolve(directory, target),
        async connection({ target_org: targetOrg, api_version: apiVersion }) {
          const { connection, key } = await connections.resolve({ targetOrg, apiVersion, tier: tool.tier });
          usedKeys.add(key);
          return connection;
        },
        async progress(progress, total, message) {
          if (progressToken === undefined) return;
          try {
            await extra.sendNotification({
              method: 'notifications/progress',
              params: { progressToken, progress, total, message },
            });
          } catch {
            // Progress is best effort; a closed transport mustn't fail the call itself.
          }
        },
      };

      try {
        let result: Record<string, unknown>;
        try {
          result = await tool.run(args, context);
        } catch (error) {
          if (!isInvalidSession(error) || usedKeys.size === 0) throw error;
          // The session expired or was revoked: refresh auth and retry the whole call, once.
          for (const key of usedKeys) connections.invalidate(key);
          usedKeys.clear();
          result = await tool.run(args, context);
        }
        return { content: [{ type: 'text', text: tool.summarize(result) }], structuredContent: result };
      } catch (error) {
        return toErrorResult(error);
      }
    },
  );
}

/**
 * @returns `dirs` resolved against the project root.
 * @throws {ToolError} `directory-not-found` for one that doesn't exist.
 */
export function resolveExistingDirs(context: ToolContext, dirs: readonly string[], argName: string): string[] {
  return dirs.map((dir) => {
    const resolved = context.resolvePath(dir);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      throw new ToolError('directory-not-found', `${argName} ${resolved} is not a directory.`);
    }
    return resolved;
  });
}
