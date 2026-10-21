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

import { promises as fs } from 'node:fs';
import {
  checkPermissionSets,
  loadPermissionSetsFile,
  PERMISSION_SETS_FILE_SUFFIX,
  PermissionSetBuildError,
  type PermissionSetCheckResult,
} from '@simplysf/simply-permissions-core';
import { logger } from '../logger.js';

/** Directories never searched: dependencies, VCS data, and Salesforce CLI state. */
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git', '.sf', '.sfdx']);

export type RunCheckPermissionSetsOptions = { disabled?: boolean };
export type PermissionSetsFileCheck = { file: string; permissionSets: PermissionSetCheckResult[] };
export type RunCheckPermissionSetsResult = { skipped: boolean; files: PermissionSetsFileCheck[] };

/**
 * Every permission sets file under the current directory: each file whose name ends in
 * {@link PERMISSION_SETS_FILE_SUFFIX}, found by walking the tree. Skipped directories are pruned
 * rather than filtered afterwards, so `node_modules` is never read, and symbolic links aren't followed.
 * Doesn't consult git: tracked, untracked, and ignored files are all found.
 *
 * @returns Paths relative to the current directory with `/` separators, sorted.
 */
export async function findPermissionSetsFiles(): Promise<string[]> {
  const matches: string[] = [];

  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relativePath = dir === '.' ? entry.name : `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) {
          // eslint-disable-next-line no-await-in-loop -- depth-first keeps the open directory handles to one
          await walk(relativePath);
        }
      } else if (entry.isFile() && entry.name.endsWith(PERMISSION_SETS_FILE_SUFFIX)) {
        matches.push(relativePath);
      }
    }
  };

  await walk('.');
  return matches.sort();
}

/** The same text `simply permissions build` reports for each `PermissionSetBuildError` code. */
function describeBuildError(error: PermissionSetBuildError): string {
  switch (error.code) {
    case 'scan-failed':
      return `Failed to scan the Salesforce project directory: ${error.args[0]}`;
    case 'invalid-config':
      return `The configuration file ${error.args[0]} is invalid: ${error.args[1]}`;
    case 'config-not-found':
      return `The configuration file ${error.args[0]} does not exist.`;
    case 'directory-not-found':
      return `The source directory ${error.args[0]} for permission set ${error.args[1]} does not exist.`;
  }
}

async function checkFile(file: string): Promise<PermissionSetsFileCheck> {
  try {
    return { file, permissionSets: await checkPermissionSets(await loadPermissionSetsFile(file)) };
  } catch (error) {
    if (error instanceof PermissionSetBuildError) {
      const message = `Permission sets file ${file}: ${describeBuildError(error)}`;
      logger.error(message);
      throw new Error(message, { cause: error });
    }
    throw error;
  }
}

/**
 * Finds every permission sets file in the repo and checks each permission set it declares against
 * the generated file on disk, writing nothing. A repo with no permission sets files is a skip. Every
 * file is checked before failing, so one run reports every stale permission set; an invalid file
 * fails at once.
 *
 * @throws When any permission set has drifted or is missing, or a permission sets file is invalid.
 */
export async function runCheckPermissionSets(
  options: RunCheckPermissionSetsOptions,
): Promise<RunCheckPermissionSetsResult> {
  if (options.disabled) {
    logger.warn('check-permission-sets is disabled. Skipping.');
    return { skipped: true, files: [] };
  }

  const files = await findPermissionSetsFiles();
  if (files.length === 0) {
    logger.warn('No permission sets files found. Skipping.');
    return { skipped: true, files: [] };
  }

  const checks: PermissionSetsFileCheck[] = [];
  let total = 0;
  let stale = 0;
  for (const file of files) {
    logger.info(`Checking permission sets file ${file}...`);
    // eslint-disable-next-line no-await-in-loop -- files are checked in order so the log reads top to bottom
    const check = await checkFile(file);
    checks.push(check);

    const staleSets = check.permissionSets.filter((permissionSet) => permissionSet.status !== 'up-to-date');
    total += check.permissionSets.length;
    stale += staleSets.length;
    if (staleSets.length === 0) {
      logger.success(`${check.permissionSets.length} permission set(s) up to date.`);
      continue;
    }
    for (const permissionSet of staleSets) {
      logger.error(`${permissionSet.name} ${permissionSet.status} ${permissionSet.path}`);
    }
    logger.log(`Regenerate with: sf simply permissions build --file ${file}`);
  }

  if (stale > 0) {
    const message = `${stale} of ${total} permission set(s) have drifted from their source metadata or are missing.`;
    logger.error(message);
    throw new Error(message);
  }

  logger.success(`All ${total} permission set(s) in ${files.length} permission sets file(s) are up to date.`);
  return { skipped: false, files: checks };
}
