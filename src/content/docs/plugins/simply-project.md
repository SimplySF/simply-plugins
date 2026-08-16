---
title: '@simplysf/simply-project'
description: 'Utilities for working with Salesforce projects'
---

Utilities for working with Salesforce projects

```sh
sf plugins install @simplysf/simply-project
```

## Commands

## `sf simply project update api-version`

Update the Salesforce API version across a project's metadata.

```
USAGE
  $ sf simply project update api-version -d <value> -a <value> [--json] [--flags-dir <value>]

FLAGS
  -a, --api-version=<value>  (required) Target Salesforce API version
  -d, --directory=<value>    (required) Path to the Salesforce project directory

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Update the Salesforce API version across a project's metadata.

  Recursively scans a directory for `-meta.xml` files and updates every `<apiVersion>` tag to the target version. If the
  directory contains an `sfdx-project.json` file, its `sourceApiVersion` property is updated to match.

EXAMPLES
  $ sf simply project update api-version --directory force-app --api-version 62.0

  $ sf simply project update api-version --directory . --api-version 63.0

FLAG DESCRIPTIONS
  -a, --api-version=<value>  Target Salesforce API version

    The Salesforce API version to set on all metadata files and, if present, sfdx-project.json.

  -d, --directory=<value>  Path to the Salesforce project directory

    The path to the Salesforce project directory to scan for metadata files.
```

_See code: [lib/commands/simply/project/update/api-version.js](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-project@1.2.10/packages/simply-project/lib/commands/simply/project/update/api-version.js)_
