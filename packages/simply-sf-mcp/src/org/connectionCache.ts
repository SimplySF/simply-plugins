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

import { ConfigAggregator, Org, OrgConfigProperties, StateAggregator, type Connection } from '@salesforce/core';
import type { Tier } from '../tiers.js';
import { ToolError } from '../toolError.js';

/** The part of an `Org` the cache uses. */
export type OrgHandle = {
  getConnection: (apiVersion?: string) => Connection;
  refreshAuth: () => Promise<unknown>;
};

/**
 * Everything the cache reads from the CLI's auth and config state, behind an interface so tests
 * don't need real `~/.sf` files.
 */
export type OrgBackend = {
  /** @returns The username `aliasOrUsername` names; the input itself when it isn't an alias. */
  resolveUsername: (aliasOrUsername: string) => Promise<string>;
  /** @throws An error named `NamedOrgNotFoundError` when no auth file exists for `username`. */
  loadOrg: (username: string) => Promise<OrgHandle>;
  /** @returns The project's (or the global) `target-org` config value, if set. */
  defaultTargetOrg: (directory: string) => Promise<string | undefined>;
  /** Forgets cached aliases and auth files, so an org logged in to since startup is found. */
  resetState: () => Promise<void>;
};

/** The real backend: the same `~/.sf` / `~/.sfdx` state the `sf` CLI uses. */
export const salesforceOrgBackend: OrgBackend = {
  async resolveUsername(aliasOrUsername) {
    const state = await StateAggregator.getInstance();
    return state.aliases.resolveUsername(aliasOrUsername);
  },
  async loadOrg(username) {
    return Org.create({ aliasOrUsername: username });
  },
  async defaultTargetOrg(directory) {
    // Cleared first so a `sf config set target-org` made while the server runs is picked up.
    await ConfigAggregator.clearInstance(directory);
    const config = await ConfigAggregator.create({ projectPath: directory });
    const value = config.getPropertyValue(OrgConfigProperties.TARGET_ORG);
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  },
  async resetState() {
    await StateAggregator.clearInstanceAsync();
  },
};

/** Which org a tool asked for, and how much it's allowed to do there. */
export type ConnectionRequest = {
  targetOrg?: string;
  apiVersion?: string;
  tier: Tier;
};

export type ResolvedConnection = {
  connection: Connection;
  /** Identifies the cache entry, for {@link ConnectionCache.invalidate}. */
  key: string;
};

function isOrgNotFound(error: unknown): boolean {
  return error instanceof Error && error.name === 'NamedOrgNotFoundError';
}

/**
 * Resolves the org a tool call targets and keeps one `Connection` per username and API version for
 * the life of the server, so only the first call to an org pays for reading auth.
 */
export class ConnectionCache {
  private readonly entries = new Map<string, Promise<Connection>>();
  /** Entries dropped after `INVALID_SESSION_ID`, whose next connection refreshes auth first. */
  private readonly stale = new Set<string>();

  public constructor(
    private readonly directory: string,
    private readonly backend: OrgBackend = salesforceOrgBackend,
  ) {}

  /**
   * Applies the org resolution rules: an explicit `targetOrg` always wins; a `read` tool may fall
   * back to the project's `target-org`; a tool that changes an org must name one.
   *
   * @throws {ToolError} `target-org-required`, `no-default-org` or `org-not-found`.
   */
  public async resolve(request: ConnectionRequest): Promise<ResolvedConnection> {
    const aliasOrUsername = request.targetOrg ?? (await this.fallbackOrg(request.tier));
    const username = await this.backend.resolveUsername(aliasOrUsername);
    const key = `${username}\u0000${request.apiVersion ?? ''}`;

    let entry = this.entries.get(key);
    if (!entry) {
      const created = this.connect(aliasOrUsername, username, request.apiVersion, key);
      this.entries.set(key, created);
      // A failed connect mustn't stay cached, or the next call would get the same rejection.
      created.catch(() => {
        if (this.entries.get(key) === created) this.entries.delete(key);
      });
      entry = created;
    }
    return { connection: await entry, key };
  }

  /** Drops an entry after the org rejected its session; the next resolve refreshes auth. */
  public invalidate(key: string): void {
    this.entries.delete(key);
    this.stale.add(key);
  }

  private async fallbackOrg(tier: Tier): Promise<string> {
    if (tier !== 'read') {
      throw new ToolError('target-org-required', 'target_org is required for tools that change an org.');
    }
    const configured = await this.backend.defaultTargetOrg(this.directory);
    if (!configured) {
      throw new ToolError(
        'no-default-org',
        `No target_org was given and no default target-org is set for ${this.directory}. ` +
          'Pass target_org, or have the user run `sf config set target-org <alias>`.',
      );
    }
    return configured;
  }

  private async connect(
    aliasOrUsername: string,
    username: string,
    apiVersion: string | undefined,
    key: string,
  ): Promise<Connection> {
    const org = await this.loadOrg(aliasOrUsername, username);
    if (this.stale.delete(key)) {
      await org.refreshAuth();
    }
    return org.getConnection(apiVersion);
  }

  /** Loads the org, retrying once after forgetting cached state, for an org logged in to since startup. */
  private async loadOrg(aliasOrUsername: string, username: string): Promise<OrgHandle> {
    try {
      return await this.backend.loadOrg(username);
    } catch (error) {
      if (!isOrgNotFound(error)) throw error;
    }

    await this.backend.resetState();
    try {
      return await this.backend.loadOrg(await this.backend.resolveUsername(aliasOrUsername));
    } catch (error) {
      if (!isOrgNotFound(error)) throw error;
      throw new ToolError(
        'org-not-found',
        `No authorized org was found for "${aliasOrUsername}". ` +
          `Have the user run \`sf org login web --alias ${aliasOrUsername}\`, then try again.`,
      );
    }
  }
}
