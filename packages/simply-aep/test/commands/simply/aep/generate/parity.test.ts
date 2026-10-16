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

import {
  generate,
  generateDomain,
  generateSelector,
  generateService,
  generateUnitOfWork,
  type GenerationUseCase,
} from '@simplysf/simply-aep-core';
import { describe, expect, it } from 'vitest';
import AepGenerate from '../../../../../src/commands/simply/aep/generate.js';
import AepGenerateDomain from '../../../../../src/commands/simply/aep/generate/domain.js';
import AepGenerateSelector from '../../../../../src/commands/simply/aep/generate/selector.js';
import AepGenerateService from '../../../../../src/commands/simply/aep/generate/service.js';
import AepGenerateUnitOfWork from '../../../../../src/commands/simply/aep/generate/unit-of-work.js';
import { CLI_ONLY_FLAGS, FLAG_BY_OPTION, toOptions } from '../../../../../src/common/generate/runGeneration.js';

/**
 * Ported from apx's `parity.test.ts`: every option a generator's schema takes has a flag, and every
 * flag either feeds an option or is one of the CLI's own. A new option in simply-aep-core then fails
 * here instead of being silently unreachable from the CLI.
 */
const COMMANDS: Array<[string, { flags: Record<string, unknown> }, GenerationUseCase]> = [
  ['generate', AepGenerate, generate],
  ['generate selector', AepGenerateSelector, generateSelector],
  ['generate domain', AepGenerateDomain, generateDomain],
  ['generate service', AepGenerateService, generateService],
  ['generate unit-of-work', AepGenerateUnitOfWork, generateUnitOfWork],
];

describe('generate flag parity', () => {
  for (const [name, command, useCase] of COMMANDS) {
    const optionKeys = Object.keys((useCase.descriptor.optionsSchema as unknown as { shape: object }).shape);
    const flagNames = Object.keys(command.flags);

    it(`${name}: every option has a flag`, () => {
      const missing = optionKeys.filter((key) => !FLAG_BY_OPTION[key] || !flagNames.includes(FLAG_BY_OPTION[key]));
      expect(missing).to.deep.equal([]);
    });

    it(`${name}: every flag feeds an option or is the CLI's own`, () => {
      const optionFlags = new Set(optionKeys.map((key) => FLAG_BY_OPTION[key]));
      expect(flagNames.filter((flag) => !optionFlags.has(flag) && !CLI_ONLY_FLAGS.has(flag))).to.deep.equal([]);
    });

    it(`${name}: matches the use case's cliId`, () => {
      expect(useCase.descriptor.cliId).to.equal(`simply:aep:${name.replaceAll(' ', ':')}`);
    });
  }

  it('toOptions fails on an option no flag sets, instead of passing undefined', () => {
    const newer = {
      descriptor: { id: 'generate-future', optionsSchema: { shape: { sobject: {}, futureOption: {} } } },
    } as unknown as GenerationUseCase;
    expect(() => toOptions(newer, { sobject: 'Account' })).to.throw(
      'generate-future takes option futureOption, which no flag sets.',
    );
  });
});
