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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OptionsError, parseOptions } from '../src/options.js';
import { tempDir } from './helpers.js';

describe('parseOptions', () => {
  let dir: string;
  let cleanup: () => void;

  beforeEach(() => ({ dir, cleanup } = tempDir()));
  afterEach(() => cleanup());

  it('defaults to the working directory, every toolset, and read', () => {
    expect(parseOptions([], dir)).toStrictEqual({
      directory: dir,
      toolsets: ['apex', 'aep', 'package'],
      allow: 'read',
    });
  });

  it('resolves --directory against the working directory', () => {
    const parent = path.dirname(dir);
    expect(parseOptions(['--directory', path.basename(dir)], parent)).toMatchObject({ directory: dir });
  });

  it('takes a comma-separated, deduplicated --toolsets', () => {
    expect(parseOptions(['--toolsets', 'aep, apex,aep'], dir)).toMatchObject({ toolsets: ['aep', 'apex'] });
  });

  it('takes --allow', () => {
    expect(parseOptions(['--allow', 'destructive'], dir)).toMatchObject({ allow: 'destructive' });
  });

  it.each([
    [['--toolsets', 'sobject'], /Unknown toolset: sobject/],
    [['--toolsets', ''], /Unknown toolset/],
    [['--allow', 'all'], /Unknown --allow tier: all/],
    [['--directory', 'does-not-exist'], /is not a directory/],
    [['--verbose'], /Unknown option/],
  ])('refuses %j', (argv, message) => {
    expect(() => parseOptions(argv, dir)).toThrow(OptionsError);
    expect(() => parseOptions(argv, dir)).toThrow(message);
  });

  it('recognizes --help and --version', () => {
    expect(parseOptions(['--help'], dir)).toBe('help');
    expect(parseOptions(['--version'], dir)).toBe('version');
  });
});
