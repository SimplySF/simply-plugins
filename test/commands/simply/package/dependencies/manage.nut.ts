/*
 * Copyright (c) 2026, Clay Chipps.
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

import { TestSession } from '@salesforce/cli-plugins-testkit';
import { afterAll, beforeAll, describe, it } from 'vitest';

describe('simply package dependencies manage', () => {
  let session: TestSession;

  beforeAll(async () => {
    session = await TestSession.create({ devhubAuthStrategy: 'NONE' });
  });

  it.todo('add test coverage for simply package dependencies manage');

  afterAll(async () => {
    await session?.clean();
  });
});
