/*
 * Copyright (c) 2026, Clay Chipps; Copyright (c) 2026 Salesforce, Inc.
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

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // @salesforce/core/testSetup registers its stub/restore hooks against the
    // global beforeEach/afterEach, so vitest must expose test globals at runtime.
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    testTimeout: 10_000,
    // oclif/ink table rendering patches the global console via `patch-console`,
    // which expects a real console.Console constructor. Vitest's intercepted
    // console shim doesn't provide one, so leave the real console in place.
    disableConsoleIntercept: true,
    coverage: {
      provider: 'v8',
      reporter: ['lcov', 'text'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts'],
    },
  },
});
