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

import { describe, expect, it } from 'vitest';
import { parseDevHubs } from '../../../src/common/build/devHubs.js';

describe('parseDevHubs', () => {
  it('should zip parallel arrays into a list of Dev Hub configs', () => {
    const devHubs = parseDevHubs(
      ['main', 'backup'],
      ['main@hub.com', 'backup@hub.com'],
      ['id1', 'id2'],
      ['https://a.com', 'https://b.com'],
    );

    expect(devHubs).toEqual([
      { name: 'main', username: 'main@hub.com', clientId: 'id1', instanceUrl: 'https://a.com' },
      { name: 'backup', username: 'backup@hub.com', clientId: 'id2', instanceUrl: 'https://b.com' },
    ]);
  });

  it('should return an empty array when given no arguments', () => {
    expect(parseDevHubs()).toEqual([]);
  });

  it('should throw when the arrays have mismatched lengths', () => {
    expect(() =>
      parseDevHubs(['main', 'backup'], ['main@hub.com'], ['id1', 'id2'], ['https://a.com', 'https://b.com']),
    ).toThrow(/Mismatched number of Dev Hub arguments/);
  });
});
