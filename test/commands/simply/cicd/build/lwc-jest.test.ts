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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runLwcJest } from '../../../../../src/common/build/lwcJest.js';
import BuildLwcJest from '../../../../../src/commands/simply/cicd/build/lwc-jest.js';

vi.mock('../../../../../src/common/build/lwcJest.js', () => ({ runLwcJest: vi.fn() }));

describe('build lwc-jest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(runLwcJest).mockResolvedValue({ skipped: false, success: true });
  });

  it('delegates to runLwcJest', async () => {
    const result = await BuildLwcJest.run([]);

    expect(result).toEqual({ skipped: false, success: true });
    expect(runLwcJest).toHaveBeenCalledWith({ disabled: false });
  });

  it('should skip lwc-jest if disabled', async () => {
    vi.mocked(runLwcJest).mockResolvedValue({ skipped: true, success: false });

    const result = await BuildLwcJest.run(['--disabled']);

    expect(result).toEqual({ skipped: true, success: false });
    expect(runLwcJest).toHaveBeenCalledWith({ disabled: true });
  });
});
