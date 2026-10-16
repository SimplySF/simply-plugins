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

import { SfProject } from '@salesforce/core';
import type { SfdxProject } from '@simplysf/simply-core';
import { findPackageVersions, type PackageVersionMatch } from '@simplysf/simply-package-core';
import { z } from 'zod';
import { loadToolsetMessages } from '../messages.js';
import { ToolError } from '../toolError.js';
import { defineTool, type ToolDefinition } from './defineTool.js';

const messages = loadToolsetMessages('package');

async function readProject(directory: string): Promise<SfdxProject> {
  let project: SfProject;
  // `SfProject` caches the parsed file per path; clear it so an edit since the last call is seen.
  SfProject.clearInstances();
  try {
    project = await SfProject.resolve(directory);
  } catch (error) {
    if ((error as Error).name === 'InvalidProjectWorkspaceError') {
      throw new ToolError('not-a-project', messages.getMessage('error.notAProject', [directory]));
    }
    throw error;
  }
  const projectJson = await project.retrieveSfProjectJson();
  return projectJson.getContents() as unknown as SfdxProject;
}

function describeSearchScope(project: SfdxProject, directory: string | undefined): string {
  if (directory) return `package directory '${directory}'`;
  const paths = project.packageDirectories.map((packageDirectory) => packageDirectory.path ?? '<unnamed>');
  return `package directories: ${paths.join(', ')}`;
}

function describeMatches(matches: PackageVersionMatch[]): string {
  return matches.map((match) => `${match.version ?? ''} (${match.packageDirectory})`).join(', ');
}

const packageVersionGet = defineTool({
  name: 'simply_package_version_get',
  toolset: 'package',
  tier: 'read',
  title: 'Get a package version from sfdx-project.json',
  description: messages.getMessage('simply_package_version_get'),
  inputSchema: {
    package: z.string().min(1).describe('The package name or alias to look up.'),
    directory: z
      .string()
      .min(1)
      .optional()
      .describe('Only search this package directory, by its path in sfdx-project.json (for example "force-app").'),
  },
  outputSchema: {
    package: z.string(),
    version: z.string(),
    source: z.enum(['dependency', 'packageDirectory']),
    packageDirectory: z.string(),
    subscriberPackageVersionId: z.string().optional(),
  },
  async run(args, context) {
    const project = await readProject(context.directory);
    const matches = findPackageVersions(project, args.package, { directory: args.directory });

    if (matches.length === 0) {
      throw new ToolError(
        'package-not-found',
        messages.getMessage('error.packageNotFound', [args.package, describeSearchScope(project, args.directory)]),
      );
    }

    const versioned = matches.filter((match): match is PackageVersionMatch & { version: string } => !!match.version);
    if (versioned.length === 0) {
      throw new ToolError(
        'no-version-found',
        messages.getMessage('error.noVersionFound', [args.package, matches[0].packageDirectory]),
      );
    }
    if (new Set(versioned.map((match) => match.version)).size > 1) {
      throw new ToolError(
        'ambiguous-match',
        messages.getMessage('error.ambiguousMatch', [args.package, describeMatches(versioned)]),
      );
    }

    const match = versioned[0];
    return {
      package: match.package,
      version: match.version,
      source: match.source,
      packageDirectory: match.packageDirectory,
      ...(match.subscriberPackageVersionId ? { subscriberPackageVersionId: match.subscriberPackageVersionId } : {}),
    };
  },
  summarize: (result) => `${result.package} is at ${result.version} (${result.source} in ${result.packageDirectory}).`,
});

export const packageTools: ToolDefinition[] = [packageVersionGet];
