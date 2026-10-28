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

import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import { runLwcJest, type RunLwcJestResult } from '@simplysf/simply-cicd-core';
import { debugFlag, disabledFlag } from '../../../../common/build/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.build.lwc-jest');

/** Installs the LWC Jest test libraries and runs the project's LWC Jest tests with coverage and a JUnit report. */
export default class BuildLwcJest extends SfCommand<RunLwcJestResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');

  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...debugFlag,
    ...disabledFlag,
    'lwc-jest-fail-on-test-failure': Flags.boolean({
      summary: messages.getMessage('flags.lwc-jest-fail-on-test-failure.summary'),
      default: false,
      env: 'SIMPLY_CICD_LWC_JEST_FAIL_ON_TEST_FAILURE',
    }),
  };

  public async run(): Promise<RunLwcJestResult> {
    const { flags } = await this.parse(BuildLwcJest);

    return runLwcJest({ disabled: flags.disabled, failOnTestFailure: flags['lwc-jest-fail-on-test-failure'] });
  }
}
