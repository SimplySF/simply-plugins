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

/* eslint-disable camelcase -- mocked GitLab API response bodies use GitLab's snake_case field names */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePackageDetails } from '@simplysf/simply-cicd-core';
import SfdxDependabot from '../../../../src/commands/simply/cicd/sfdx-dependabot.js';

// resolvePackageDetails shells out to `sf`; the rest of the run (VCS discovery and updates) is
// exercised for real against the stubbed `fetch` below. resolvePackageDetails, filterProject and
// generateMrDescription are unit-tested in @simplysf/simply-cicd-core.
vi.mock('@simplysf/simply-cicd-core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@simplysf/simply-cicd-core')>()),
  resolvePackageDetails: vi.fn(),
}));

function jsonResponse(
  body: unknown,
  init: { ok?: boolean; status?: number; statusText?: string; headers?: Record<string, string> } = {},
): Response {
  const headers = new Headers(init.headers ?? {});
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    statusText: init.statusText ?? 'OK',
    headers,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

const enabledVariable = { key: 'SFDX_DEPENDABOT_ENABLED', value: 'TRUE' };

describe('sfdx-dependabot', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    process.env.SFDX_DEPENDABOT_VCS_API_URL = 'https://gitlab.example.com/api/v4';
    process.env.SFDX_DEPENDABOT_VCS_TOKEN = 'test-token';
    process.env.SFDX_DEPENDABOT_ROOT_GROUP_ID = '12345';
    process.env.SUBSCRIBER_PACKAGE_VERSION_ID = '04tSJ000000AKwjYAG';
    process.env.PACKAGING_DEVHUB_USERNAME = 'hub@example.com';
    delete process.env.CI_PROJECT_PATH;
    delete process.env.CI_PROJECT_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('run', () => {
    let fetchMock: ReturnType<typeof vi.fn<(url: string, options?: RequestInit) => Promise<Response>>>;

    beforeEach(() => {
      vi.mocked(resolvePackageDetails).mockResolvedValue({ packageName: 'lwc-utilities', packageVersion: '2.41.0-1' });
      fetchMock = vi.fn<(url: string, options?: RequestInit) => Promise<Response>>();
      vi.stubGlobal('fetch', fetchMock);
    });

    it('fails globally if a critical variable is missing', async () => {
      delete process.env.SFDX_DEPENDABOT_VCS_TOKEN;
      await expect(SfdxDependabot.run([])).rejects.toThrow(/VCS access token/i);
    });

    it('executes dry-run flawlessly with zero write calls', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/groups/12345/projects')) {
          return Promise.resolve(
            jsonResponse([
              {
                id: 201,
                path_with_namespace: 'my-group/downstream-repo',
                archived: false,
                empty_repo: false,
                default_branch: 'main',
              },
            ]),
          );
        }
        if (url.includes('/projects/201/repository/files/sfdx-project.json/raw')) {
          return Promise.resolve(
            jsonResponse({
              packageDirectories: [
                { path: 'force-app', default: true, dependencies: [{ package: 'lwc-utilities@2.40.0-10' }] },
              ],
              packageAliases: { 'lwc-utilities@2.40.0-10': '04t000000000002' },
            }),
          );
        }
        if (url.includes('/projects/201/variables')) {
          return Promise.resolve(jsonResponse([enabledVariable]));
        }
        return Promise.resolve(jsonResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' }));
      });

      const result = await SfdxDependabot.run(['--dry-run']);

      expect(result.projectsDiscovered).toBe(1);
      expect(result.projectsEligible).toBe(1);
      expect(result.projectsUpdated).toBe(1);
      expect(result.mergeRequestsCreated).toBe(1);
      expect(result.mergeRequestsAlreadyOpen).toBe(0);
      expect(result.dryRun).toBe(true);

      const postCalls = fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST');
      expect(postCalls).toHaveLength(0);
    });

    it('skips a project that has not opted in via the SFDX_DEPENDABOT_ENABLED variable', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/groups/12345/projects')) {
          return Promise.resolve(
            jsonResponse([
              {
                id: 201,
                path_with_namespace: 'my-group/downstream-repo',
                archived: false,
                empty_repo: false,
                default_branch: 'main',
              },
            ]),
          );
        }
        if (url.includes('/projects/201/repository/files/sfdx-project.json/raw')) {
          return Promise.resolve(
            jsonResponse({
              packageDirectories: [
                { path: 'force-app', default: true, dependencies: [{ package: 'lwc-utilities@2.40.0-10' }] },
              ],
            }),
          );
        }
        if (url.includes('/projects/201/variables')) {
          return Promise.resolve(jsonResponse([{ key: 'SFDX_DEPENDABOT_ENABLED', value: 'FALSE' }]));
        }
        return Promise.resolve(jsonResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' }));
      });

      const result = await SfdxDependabot.run([]);

      expect(result.projectsDiscovered).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.projectsUpdated).toBe(0);
    });

    it('executes a full write-run: creates branch, commits, and opens an MR', async () => {
      fetchMock.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/groups/12345/projects')) {
          return Promise.resolve(
            jsonResponse([
              {
                id: 201,
                path_with_namespace: 'my-group/downstream-repo',
                archived: false,
                empty_repo: false,
                default_branch: 'main',
              },
            ]),
          );
        }
        if (url.includes('/projects/201/repository/files/sfdx-project.json/raw')) {
          return Promise.resolve(
            jsonResponse({
              packageDirectories: [
                { path: 'force-app', default: true, dependencies: [{ package: 'lwc-utilities@2.40.0-10' }] },
              ],
              packageAliases: { 'lwc-utilities@2.40.0-10': '04t000000000002' },
            }),
          );
        }
        if (url.includes('/projects/201/variables')) {
          return Promise.resolve(jsonResponse([enabledVariable]));
        }
        if (
          url.includes('/projects/201/repository/branches/devops%2Fdependabot%2Flwc-utilities') &&
          options?.method === 'GET'
        ) {
          return Promise.resolve(jsonResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' }));
        }
        if (url.includes('/projects/201/repository/branches') && options?.method === 'POST') {
          return Promise.resolve(jsonResponse({ name: 'devops/dependabot/lwc-utilities' }));
        }
        if (url.includes('/projects/201/repository/commits') && options?.method === 'POST') {
          return Promise.resolve(jsonResponse({ id: 'commit-sha-abc' }));
        }
        if (url.includes('/projects/201/merge_requests?state=opened')) {
          return Promise.resolve(jsonResponse([]));
        }
        if (url.includes('/projects/201/merge_requests') && options?.method === 'POST') {
          return Promise.resolve(jsonResponse({ id: 1, iid: 1, web_url: 'https://gitlab.example.com/mr/123' }));
        }
        return Promise.resolve(jsonResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' }));
      });

      const result = await SfdxDependabot.run([]);

      expect(result.projectsUpdated).toBe(1);
      expect(result.mergeRequestsCreated).toBe(1);
      expect(result.mergeRequestsAlreadyOpen).toBe(0);
      expect(result.dryRun).toBe(false);

      const postCalls = fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST');
      expect(postCalls).toHaveLength(3);
    });

    it('reuses an existing branch and merge request on rerun', async () => {
      fetchMock.mockImplementation((url: string, options?: RequestInit) => {
        if (url.includes('/groups/12345/projects')) {
          return Promise.resolve(
            jsonResponse([
              {
                id: 201,
                path_with_namespace: 'my-group/downstream-repo',
                archived: false,
                empty_repo: false,
                default_branch: 'main',
              },
            ]),
          );
        }
        if (url.includes('/projects/201/repository/files/sfdx-project.json/raw?ref=main')) {
          return Promise.resolve(
            jsonResponse({
              packageDirectories: [
                { path: 'force-app', default: true, dependencies: [{ package: 'lwc-utilities@2.40.0-10' }] },
              ],
              packageAliases: { 'lwc-utilities@2.40.0-10': '04t000000000002' },
            }),
          );
        }
        if (url.includes('/projects/201/variables')) {
          return Promise.resolve(jsonResponse([enabledVariable]));
        }
        if (
          url.includes('/projects/201/repository/branches/devops%2Fdependabot%2Flwc-utilities') &&
          options?.method === 'GET'
        ) {
          return Promise.resolve(jsonResponse({ name: 'devops/dependabot/lwc-utilities' }));
        }
        if (
          url.includes('/projects/201/repository/files/sfdx-project.json/raw?ref=devops%2Fdependabot%2Flwc-utilities')
        ) {
          return Promise.resolve(
            jsonResponse({
              packageDirectories: [
                { path: 'force-app', default: true, dependencies: [{ package: 'lwc-utilities@2.41.0-1' }] },
              ],
              packageAliases: {
                'lwc-utilities@2.40.0-10': '04t000000000002',
                'lwc-utilities@2.41.0-1': '04tSJ000000AKwjYAG',
              },
            }),
          );
        }
        if (url.includes('/projects/201/merge_requests?state=opened')) {
          return Promise.resolve(
            jsonResponse([{ id: 123, iid: 123, web_url: 'https://gitlab.example.com/mr/reused-mr-123' }]),
          );
        }
        if (url.includes('/projects/201/merge_requests/123') && options?.method === 'PUT') {
          return Promise.resolve(
            jsonResponse({ id: 123, iid: 123, web_url: 'https://gitlab.example.com/mr/reused-mr-123' }),
          );
        }
        return Promise.resolve(jsonResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' }));
      });

      const result = await SfdxDependabot.run([]);

      expect(result.projectsUpdated).toBe(1);
      expect(result.mergeRequestsCreated).toBe(0);
      expect(result.mergeRequestsAlreadyOpen).toBe(1);

      const postCalls = fetchMock.mock.calls.filter((call) => call[1]?.method === 'POST');
      expect(postCalls).toHaveLength(0);
      const putCalls = fetchMock.mock.calls.filter((call) => call[1]?.method === 'PUT');
      expect(putCalls).toHaveLength(1);
    });

    it('throws a global error when failOnError is set and a project failed', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/groups/12345/projects')) {
          return Promise.resolve(
            jsonResponse([
              {
                id: 201,
                path_with_namespace: 'my-group/downstream-repo',
                archived: false,
                empty_repo: false,
                default_branch: 'main',
              },
            ]),
          );
        }
        // Everything else 500s, so processing project 201 throws.
        return Promise.resolve(jsonResponse('Server Error', { ok: false, status: 500, statusText: 'Server Error' }));
      });

      await expect(SfdxDependabot.run(['--fail-on-error'])).rejects.toThrow(/1 per-project operation/);
    });

    it('applies the max-projects safety limit', async () => {
      fetchMock.mockImplementation((url: string) => {
        if (url.includes('/groups/12345/projects')) {
          return Promise.resolve(
            jsonResponse([
              {
                id: 201,
                path_with_namespace: 'my-group/repo-a',
                archived: false,
                empty_repo: false,
                default_branch: 'main',
              },
              {
                id: 202,
                path_with_namespace: 'my-group/repo-b',
                archived: false,
                empty_repo: false,
                default_branch: 'main',
              },
            ]),
          );
        }
        return Promise.resolve(jsonResponse('Not Found', { ok: false, status: 404, statusText: 'Not Found' }));
      });

      const result = await SfdxDependabot.run(['--max-projects', '1']);

      expect(result.projectsEligible).toBe(2);
      expect(result.skipped).toBe(1);
    });
  });
});
