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
import { parseArgs } from 'node:util';
import { TIERS, TOOLSETS, type Tier, type Toolset } from './tiers.js';

/** What the server was started with. */
export type ServerOptions = {
  /** Absolute path of the Salesforce DX project. Relative path arguments resolve against it. */
  directory: string;
  /** The toolsets whose tools are registered. */
  toolsets: Toolset[];
  /** The highest tier registered. */
  allow: Tier;
};

/** A command-line problem, reported on stderr before the server starts. */
export class OptionsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'OptionsError';
  }
}

export const USAGE = `Usage: simply-sf-mcp [--directory <project>] [--toolsets <a,b,...>] [--allow <tier>]

  --directory  The Salesforce DX project root. Defaults to the working directory.
  --toolsets   Comma-separated: ${TOOLSETS.join(', ')}. Defaults to all of them.
  --allow      Highest tier to register: ${TIERS.join(', ')}. Defaults to read.
  --help       Show this help.
  --version    Show the version.`;

function isToolset(value: string): value is Toolset {
  return (TOOLSETS as readonly string[]).includes(value);
}

function isTier(value: string): value is Tier {
  return (TIERS as readonly string[]).includes(value);
}

/**
 * @param argv - The arguments after the script name.
 * @param cwd - What `--directory` defaults to and resolves against.
 * @returns The parsed options, or `help`/`version` when one of those was asked for.
 * @throws {OptionsError} For an unknown option, toolset or tier, or a directory that doesn't exist.
 */
export function parseOptions(argv: string[], cwd = process.cwd()): ServerOptions | 'help' | 'version' {
  let values: { directory?: string; toolsets?: string; allow?: string; help?: boolean; version?: boolean };
  try {
    ({ values } = parseArgs({
      args: argv,
      options: {
        directory: { type: 'string' },
        toolsets: { type: 'string' },
        allow: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean' },
      },
      strict: true,
      allowPositionals: false,
    }));
  } catch (error) {
    throw new OptionsError((error as Error).message);
  }

  if (values.help) return 'help';
  if (values.version) return 'version';

  const directory = path.resolve(cwd, values.directory ?? '.');
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    throw new OptionsError(`--directory ${directory} is not a directory.`);
  }

  let toolsets: Toolset[] = [...TOOLSETS];
  if (values.toolsets !== undefined) {
    const requested = values.toolsets
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);
    const unknown = requested.filter((name) => !isToolset(name));
    if (unknown.length > 0 || requested.length === 0) {
      throw new OptionsError(
        `Unknown toolset: ${unknown.join(', ') || '(none given)'}. Choose from: ${TOOLSETS.join(', ')}.`,
      );
    }
    toolsets = [...new Set(requested.filter(isToolset))];
  }

  const allow = values.allow ?? 'read';
  if (!isTier(allow)) {
    throw new OptionsError(`Unknown --allow tier: ${allow}. Choose from: ${TIERS.join(', ')}.`);
  }

  return { directory, toolsets, allow };
}
