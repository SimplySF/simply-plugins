# @simplysf/simply-plugin-kit

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-plugin-kit?label=@simplysf/simply-plugin-kit)](https://npmjs.com/@simplysf/simply-plugin-kit) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-plugin-kit.svg)](https://npmjs.com/@simplysf/simply-plugin-kit) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-node/main/LICENSE.txt)

Shared oclif command building blocks for [`@simplysf`](https://github.com/SimplySF/simply-node) Salesforce CLI plugins. This is not a Salesforce CLI plugin itself — it's a plain library consumed by the other packages in this monorepo.

It exists as its own package rather than living in [`@simplysf/simply-core`](https://npmjs.com/@simplysf/simply-core) so that `simply-core` stays free of a `@salesforce/sf-plugins-core` dependency. Anything here that needs the oclif flag layer belongs on this side of that line.

## Install

```bash
npm install @simplysf/simply-plugin-kit
```

## Usage

```ts
import { Messages } from '@salesforce/core';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';

export default class MyCommand extends SfCommand<void> {
  public static readonly flags = {
    ...SfCommand.baseFlags,
    ...targetOrgFlags,
    sobject: Flags.string({ summary: messages.getMessage('flags.sobject.summary'), required: true }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(MyCommand);
    const connection = requireConnection(flags);
    // ...
  }
}
```

## API

| Export                     | Description                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `targetOrgFlags`           | The `--target-org` / `--api-version` flag pair every org-touching command declares.                                                    |
| `requireConnection(flags)` | Resolves the connection for `--target-org` at `--api-version`, throwing `TargetOrgConnectionFailedError` if none could be established. |
| `TargetOrgFlagValues`      | Structural type for the parsed flags `requireConnection` reads.                                                                        |
