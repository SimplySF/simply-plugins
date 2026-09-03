# @simplysf/simply-plugin-kit

[![NPM](https://img.shields.io/npm/v/@simplysf/simply-plugin-kit?label=@simplysf/simply-plugin-kit)](https://npmjs.com/@simplysf/simply-plugin-kit) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply-plugin-kit.svg)](https://npmjs.com/@simplysf/simply-plugin-kit) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt)

Shared oclif command building blocks for [`@simplysf`](https://github.com/SimplySF/simply-plugins) Salesforce CLI plugins. This is not a Salesforce CLI plugin itself — it's a plain library consumed by the other packages in this monorepo.

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

## Issues

Please report any issues at https://github.com/SimplySF/simply-plugins/issues

## Contributing

This package is part of the [`@simplysf/simply`](https://github.com/SimplySF/simply-plugins) monorepo. See [CONTRIBUTING.md](CONTRIBUTING.md) for what's specific to this package, and the repo's [root CONTRIBUTING.md](https://github.com/SimplySF/simply-plugins/blob/main/CONTRIBUTING.md) for repo structure, setup, commit conventions, and how to submit a pull request. Please also read our [Code of Conduct](https://github.com/SimplySF/simply-plugins/blob/main/CODE_OF_CONDUCT.md).

## License

Licensed under the [Apache-2.0](https://raw.githubusercontent.com/SimplySF/simply-plugins/main/LICENSE.txt) license.
