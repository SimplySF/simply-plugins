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

import path from 'node:path';
import { SfProject } from '@salesforce/core';

/**
 * Resolve the ERD document title: the explicit `--title`, else the `name` in the enclosing
 * `sfdx-project.json`, else the directory's base name. Blank results yield `undefined` so the
 * renderer falls back to its default heading.
 *
 * @param directory - The scanned source directory.
 * @param explicit - The `--title` flag value, if given.
 * @returns The title, or `undefined` when none is usable.
 */
export async function resolveTitle(directory: string, explicit?: string): Promise<string | undefined> {
  for (const candidate of [explicit, await sfdxProjectName(directory), path.basename(path.resolve(directory))]) {
    const trimmed = candidate?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}

async function sfdxProjectName(directory: string): Promise<string | undefined> {
  try {
    const project = await SfProject.resolve(path.resolve(directory));
    const name = project.getSfProjectJson().get('name');
    return typeof name === 'string' ? name : undefined;
  } catch {
    // No enclosing sfdx-project.json (or an unreadable one) is normal.
    return undefined;
  }
}

/**
 * Match requested hubs to entity names case-insensitively.
 *
 * @param requested - Hub names as given on the command line.
 * @param entityNames - Object API names present in the model (in-project and referenced).
 * @returns The canonical-cased `hubs` to pass to the renderer and the `unknown` requested values.
 */
export function resolveHubs(requested: string[], entityNames: string[]): { hubs: string[]; unknown: string[] } {
  const byLower = new Map(entityNames.map((name) => [name.toLowerCase(), name]));
  const hubs: string[] = [];
  const unknown: string[] = [];
  for (const hub of requested) {
    const canonical = byLower.get(hub.toLowerCase());
    if (canonical) {
      if (!hubs.includes(canonical)) hubs.push(canonical);
    } else {
      unknown.push(hub);
    }
  }
  return { hubs, unknown };
}
