# simply

[![NPM](https://img.shields.io/npm/v/@simplysf/simply.svg?label=@simplysf/simply)](https://www.npmjs.com/package/@simplysf/simply) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply.svg)](https://npmjs.org/package/@simplysf/simply) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply
```

## Issues

Please report any issues at https://github.com/SimplySF/simply-node/issues

## Commands

<!-- commands -->

- [`sf simply apex execute`](#sf-simply-apex-execute)
- [`sf simply apex logs purge`](#sf-simply-apex-logs-purge)
- [`sf simply apex trace setup`](#sf-simply-apex-trace-setup)
- [`sf simply apex trace silence`](#sf-simply-apex-trace-silence)
- [`sf simply data file upload`](#sf-simply-data-file-upload)
- [`sf simply data files download`](#sf-simply-data-files-download)
- [`sf simply data files upload`](#sf-simply-data-files-upload)
- [`sf simply document diff`](#sf-simply-document-diff)
- [`sf simply document generate`](#sf-simply-document-generate)
- [`sf simply package dependencies install`](#sf-simply-package-dependencies-install)
- [`sf simply package dependencies manage`](#sf-simply-package-dependencies-manage)
- [`sf simply package version cleanup`](#sf-simply-package-version-cleanup)
- [`sf simply permissions analyze`](#sf-simply-permissions-analyze)
- [`sf simply permissions build`](#sf-simply-permissions-build)
- [`sf simply project update api-version`](#sf-simply-project-update-api-version)
- [`sf simply schema generate`](#sf-simply-schema-generate)
- [`sf simply schema visualize`](#sf-simply-schema-visualize)
- [`sf simply sobject backup`](#sf-simply-sobject-backup)
- [`sf simply sobject deduplicate`](#sf-simply-sobject-deduplicate)
- [`sf simply sobject history export`](#sf-simply-sobject-history-export)
- [`sf simply sobject history query`](#sf-simply-sobject-history-query)
- [`sf simply sobject history schema`](#sf-simply-sobject-history-schema)

## `sf simply apex execute`

Execute anonymous Apex code.

```
USAGE
  $ sf simply apex execute -f <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -f, --file=<value>         (required) Path to Apex file
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Execute anonymous Apex code.

  Executes an anonymous block of Apex code from a local .apex file against a target org and reports the compile and
  execution results, including any debug logs produced.

EXAMPLES
  $ sf simply apex execute --target-org myOrg --file scripts/apex/data-fix.apex

FLAG DESCRIPTIONS
  -f, --file=<value>  Path to Apex file

    The path to the local .apex file containing the anonymous Apex code to execute.
```

_See code: [@simplysf/simply-apex](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/execute.js)_

## `sf simply apex logs purge`

Purge Apex debug logs.

```
USAGE
  $ sf simply apex logs purge -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-w <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -w, --where=<value>        SOQL WHERE clause
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Purge Apex debug logs.

  Deletes ApexLog records from the target org. By default all logs are purged; use --where to scope the deletion to a
  subset of logs.

EXAMPLES
  $ sf simply apex logs purge --target-org myOrg

  $ sf simply apex logs purge --target-org myOrg --where "Status = 'Success'"

FLAG DESCRIPTIONS
  -w, --where=<value>  SOQL WHERE clause

    A WHERE clause used to filter which ApexLog records are purged (e.g. "Status = 'Success'").
```

_See code: [@simplysf/simply-apex](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/logs/purge.js)_

## `sf simply apex trace setup`

Configure a debug log trace flag for the current user.

```
USAGE
  $ sf simply apex trace setup -o <value> [--json] [--flags-dir <value>] [--api-version <value>]

FLAGS
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Configure a debug log trace flag for the current user.

  Creates or updates a 24-hour DEVELOPER_LOG trace flag for the user running the command, using a FINEST/FINER debug
  level suitable for the Apex Replay Debugger.

EXAMPLES
  $ sf simply apex trace setup --target-org myOrg
```

_See code: [@simplysf/simply-apex](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/trace/setup.js)_

## `sf simply apex trace silence`

Silence debug logs for specific Apex classes.

```
USAGE
  $ sf simply apex trace silence -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-c <value> | --classes-file
    <value>]

FLAGS
  -c, --classes=<value>       Comma-separated Apex class names
  -o, --target-org=<value>    (required) Username or alias of the target org. Not required if the `target-org`
                              configuration variable is already set.
      --api-version=<value>   Override the api version used for api requests made by this command
      --classes-file=<value>  Path to a JSON file listing classes to silence

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Silence debug logs for specific Apex classes.

  Creates a 24-hour CLASS_TRACING trace flag with a fully suppressed (NONE) debug level for each specified Apex class,
  preventing those classes from generating debug log output.

EXAMPLES
  $ sf simply apex trace silence --target-org myOrg --classes NoisyClass,ChattyTrigger

  $ sf simply apex trace silence --target-org myOrg --classes-file classesToSilence.json

FLAG DESCRIPTIONS
  -c, --classes=<value>  Comma-separated Apex class names

    A comma-separated list of Apex class names to silence.

  --classes-file=<value>  Path to a JSON file listing classes to silence

    The path to a JSON file with the shape { "classes": ["ClassOne", "ClassTwo"] } listing the Apex class names to
    silence.
```

_See code: [@simplysf/simply-apex](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-apex@1.1.10/packages/simply-apex/lib/commands/simply/apex/trace/silence.js)_

## `sf simply data file upload`

Upload a file to a Salesforce org.

```
USAGE
  $ sf simply data file upload --file-path <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>]
    [--first-publish-location-id <value>] [--title <value>]

FLAGS
  -o, --target-org=<value>                 (required) Username or alias of the target org. Not required if the
                                           `target-org` configuration variable is already set.
      --api-version=<value>                Override the api version used for api requests made by this command
      --file-path=<value>                  (required) Path to the file to upload.
      --first-publish-location-id=<value>  Specify a record Id that the file should be linked to.
      --title=<value>                      Specify the title for the file being uploaded.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Upload a file to a Salesforce org.

  Uploads a file to a Salesforce org.

EXAMPLES
  $ sf simply data file upload --file-path fileToUpload.txt --target-org myTargetOrg

  $ sf simply data file upload --file-path fileToUpload.txt --first-publish-location-id 0019000000DmehK --target-org myTargetOrg
```

_See code: [@simplysf/simply-data](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-data@2.3.9/packages/simply-data/lib/commands/simply/data/file/upload.js)_

## `sf simply data files download`

Download files from a Salesforce org.

```
USAGE
  $ sf simply data files download -o <value> --where-content-version <value> [--json] [--flags-dir <value>] [--api-version
    <value>] [--max-parallel-jobs <value>]

FLAGS
  -o, --target-org=<value>             (required) Username or alias of the target org. Not required if the `target-org`
                                       configuration variable is already set.
      --api-version=<value>            Override the api version used for api requests made by this command
      --max-parallel-jobs=<value>      [default: 1] Maximum number of parallel jobs.
      --where-content-version=<value>  (required) WHERE clause for ContentVersion query.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Download files from a Salesforce org.

  Downloads files specified by a where clause for a ContentVersion query from a Salesforce org. By default, the plugin
  uses the REST API for the download as to allow for the streaming of large files without issue. This means that each
  file will use one REST API request.

EXAMPLES
  $ sf simply data files download --where-content-version "IsLatest=true" --target-org myTargetOrg

  $ sf simply data files download --where-content-version "IsLatest=true" --max-parallel-jobs 5 --target-org myTargetOrg

FLAG DESCRIPTIONS
  --max-parallel-jobs=<value>  Maximum number of parallel jobs.

    By default the plugin will only process a single file download at a time. You can increase this value to allow for
    quasi concurrent downloads. Please note that setting this value too high can cause performance issues.

  --where-content-version=<value>  WHERE clause for ContentVersion query.

    Provide a WHERE clause to allow the plugin to specify which ContentVersion records should be downloaded.
```

_See code: [@simplysf/simply-data](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-data@2.3.9/packages/simply-data/lib/commands/simply/data/files/download.js)_

## `sf simply data files upload`

Upload files to a Salesforce org.

```
USAGE
  $ sf simply data files upload --file-path <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>]
    [--max-parallel-jobs <value>]

FLAGS
  -o, --target-org=<value>         (required) Username or alias of the target org. Not required if the `target-org`
                                   configuration variable is already set.
      --api-version=<value>        Override the api version used for api requests made by this command
      --file-path=<value>          (required) Path to the csv file that specifies the upload.
      --max-parallel-jobs=<value>  [default: 1] Maximum number of parallel jobs.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Upload files to a Salesforce org.

  Uploads files specified by a csv to a Salesforce org. By default, the plugin uses the REST API for the upload as the
  Bulk API is limited in its payload size. This means that each file will use one REST API request.

EXAMPLES
  $ sf simply data files upload --file-path filesToUpload.csv --target-org myTargetOrg

  $ sf simply data files upload --file-path filesToUpload.csv --max-parallel-jobs 5 --target-org myTargetOrg

FLAG DESCRIPTIONS
  --file-path=<value>  Path to the csv file that specifies the upload.

    The csv file must specify the columns PathOnClient and Title. Optionally, a FirstPublishLocationId can be specified
    to have it linked directly to a Salesforce record after upload.

  --max-parallel-jobs=<value>  Maximum number of parallel jobs.

    By default the plugin will only process a single file upload at a time. You can increase this value to allow for
    quasi concurrent uploads. Please note that setting this value too high can cause performance issues.
```

_See code: [@simplysf/simply-data](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-data@2.3.9/packages/simply-data/lib/commands/simply/data/files/upload.js)_

## `sf simply document diff`

Generate a change report between two git refs.

```
USAGE
  $ sf simply document diff --from-tag <value> --to-tag <value> [--json] [--flags-dir <value>] [--output-file <value>]
    [--template-file <value>] [--output-format html]

FLAGS
  --from-tag=<value>        (required) The starting git ref for the diff report.
  --output-file=<value>     Path to write the generated report to.
  --output-format=<option>  [default: html] Output format to render the report in.
                            <options: html>
  --template-file=<value>   Path to a custom Handlebars template to render instead of the built-in one.
  --to-tag=<value>          (required) The ending git ref for the diff report.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a change report between two git refs.

  Runs `git diff --name-status` between two git refs (tags, branches, or commits) in the current working directory,
  groups the changed files by Salesforce metadata component type, and renders a Confluence-storage-format change report
  suitable for pasting into a release or change-management page.

EXAMPLES
  $ sf simply document diff --from-tag v1.0.0 --to-tag v1.1.0

  $ sf simply document diff --from-tag v1.0.0 --to-tag v1.1.0 --output-file change-report.html

  $ sf simply document diff --from-tag v1.0.0 --to-tag v1.1.0 --template-file my-change-report.hbs

FLAG DESCRIPTIONS
  --output-file=<value>  Path to write the generated report to.

    When specified, the generated report is written to this path instead of being printed to the terminal.

  --output-format=html  Output format to render the report in.

    Currently only `html` is supported. Reserved for future formats (e.g. Markdown).

  --template-file=<value>  Path to a custom Handlebars template to render instead of the built-in one.

    When specified, this template is rendered with the same data the built-in report template receives, and can reuse
    the built-in `changeTable` partial. See this package's README "Custom Templates" section for the data shape and
    available partials.
```

_See code: [@simplysf/simply-document](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-document@0.3.1/packages/simply-document/lib/commands/simply/document/diff.js)_

## `sf simply document generate`

Generate a technical design document for a Salesforce project.

```
USAGE
  $ sf simply document generate -d <value> --output-file <value> [--json] [--flags-dir <value>] [--template-file <value>]
    [--output-format html]

FLAGS
  -d, --directory=<value>       (required) Salesforce project source directory to scan.
      --output-file=<value>     (required) Path to write the generated document to.
      --output-format=<option>  [default: html] Output format to render the document in.
                                <options: html>
      --template-file=<value>   Path to a custom Handlebars template to render instead of the built-in one.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a technical design document for a Salesforce project.

  Scans a Salesforce DX project's source directory for metadata (objects, fields, Apex, Lightning components, flows,
  permissions, and more) and renders a Confluence-storage-format technical design document covering the data model,
  security model, groups/queues/permissions, solution inventory, and custom code inventory.

EXAMPLES
  $ sf simply document generate --directory force-app --output-file technical-design-document.html

  $ sf simply document generate --directory force-app --output-file technical-design-document.html --template-file my-tdd-template.hbs

FLAG DESCRIPTIONS
  --output-format=html  Output format to render the document in.

    Currently only `html` is supported. Reserved for future formats (e.g. Markdown).

  --template-file=<value>  Path to a custom Handlebars template to render instead of the built-in one.

    When specified, this template is rendered with the same scanned project data the built-in technical design document
    template receives, and can reuse the built-in `loud` helper. See this package's README "Custom Templates" section
    for the data shape.
```

_See code: [@simplysf/simply-document](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-document@0.3.1/packages/simply-document/lib/commands/simply/document/generate.js)_

## `sf simply package dependencies install`

Install package dependencies for a Salesforce project.

```
USAGE
  $ sf simply package dependencies install -o <value> [--json] [--flags-dir <value>] [-a all|package] [--api-version <value>] [-z
    <value>] [-i All|Delta|Upgrade] [-k <value>...] [-r] [--output-file <value>] [-b <value>] [-s AllUsers|AdminsOnly]
    [-v <value>] [-t DeprecateOnly|Mixed|Delete] [-w <value>]

FLAGS
  -a, --apex-compile=<option>        Compile all Apex in the org and package, or only Apex in the package; unlocked
                                     packages only.
                                     <options: all|package>
  -b, --publish-wait=<value>         Maximum number of minutes to wait for the Subscriber Package Version ID to become
                                     available in the target org before canceling the install request.
  -i, --install-type=<option>        [default: Upgrade] Install all packages, only deltas, or only newer versions.
                                     <options: All|Delta|Upgrade>
  -k, --installation-key=<value>...  Installation key for key-protected packages
  -o, --target-org=<value>           (required) Username or alias of the target org. Not required if the `target-org`
                                     configuration variable is already set.
  -r, --no-prompt                    Don't prompt for confirmation.
  -s, --security-type=<option>       [default: AdminsOnly] Security access type for the installed package. (deprecation
                                     notice: The default --security-type value will change from AllUsers to AdminsOnly
                                     in v47.0 or later.)
                                     <options: AllUsers|AdminsOnly>
  -t, --upgrade-type=<option>        [default: Mixed] Upgrade type for the package installation; available only for
                                     unlocked packages.
                                     <options: DeprecateOnly|Mixed|Delete>
  -v, --target-dev-hub=<value>       Username or alias of the Dev Hub org.
  -w, --wait=<value>                 Number of minutes to wait for installation status.
  -z, --branch=<value>               Package branch to consider when specifiying a Package/VersionNumber combination
      --api-version=<value>          Override the api version used for api requests made by this command
      --output-file=<value>          Path to write a JSON install report to.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Install package dependencies for a Salesforce project.

  Installs all specified package dependencies in a Salesforce DX project using the sfdx-project.json definition.

EXAMPLES
  $ sf simply package dependencies install --target-org myTargetOrg --target-dev-hub myTargetDevHub

  $ sf simply package dependencies install --target-org myTargetOrg --target-dev-hub myTargetDevHub --installation-key "MyPackage1Alias:MyPackage1Key"

  $ sf simply package dependencies install --target-org myTargetOrg --target-dev-hub myTargetDevHub --installation-key "MyPackage1Alias:MyPackage1Key" --installation-key "MyPackage2Alias:MyPackage2Key"

  $ sf simply package dependencies install --target-org myTargetOrg --target-dev-hub myTargetDevHub --output-file install-report.json

FLAG DESCRIPTIONS
  -a, --apex-compile=all|package

    Compile all Apex in the org and package, or only Apex in the package; unlocked packages only.

    Applies to unlocked packages only. Specifies whether to compile all Apex in the org and package, or only the Apex in
    the package.

    For package installs into production orgs, or any org that has Apex Compile on Deploy enabled, the platform compiles
    all Apex in the org after the package install or upgrade operation completes.

    This approach assures that package installs and upgrades don’t impact the performance of an org, and is done even if
    --apex-compile package is specified.

  -i, --install-type=All|Delta|Upgrade  Install all packages, only deltas, or only newer versions.

    If 'All' is specified, then all packages specified in package dependencies are installed, regardless of if the
    version already is installed in the org. If 'Delta' is specified, then only packages that differ from what is
    installed in the org will be installed. If 'Upgrade' is specified, then a package is installed only if it isn't
    already installed, or if its semantic version (major.minor.patch.build) is newer than the version currently
    installed in the org; packages with an installed version that is the same as or newer than the target version are
    skipped.

  -k, --installation-key=<value>...  Installation key for key-protected packages

    Installation key for key-protected packages in the key:value format of SubscriberPackageVersionId:Key

  -r, --no-prompt  Don't prompt for confirmation.

    Allows the following without an explicit confirmation response: 1) Remote Site Settings and Content Security Policy
    websites to send or receive data, and 2) --upgrade-type Delete to proceed.

  -t, --upgrade-type=DeprecateOnly|Mixed|Delete

    Upgrade type for the package installation; available only for unlocked packages.

    For package upgrades, specifies whether to mark all removed components as deprecated (DeprecateOnly), to delete
    removed components that can be safely deleted and deprecate the others (Mixed), or to delete all removed components,
    except for custom objects and custom fields, that don't have dependencies (Delete). The default is Mixed. Can
    specify DeprecateOnly or Delete only for unlocked package upgrades.

  -z, --branch=<value>  Package branch to consider when specifiying a Package/VersionNumber combination

    For dependencies specified by Package/VersionNumber combination, you can specify the branch group of builds to work
    from by entering the branch build name. If not specified, the builds from NULL branch will be considered.

  --output-file=<value>  Path to write a JSON install report to.

    When specified, a JSON report of the install outcome for every resolved dependency is written to this path, in
    addition to the normal terminal output you can continue to monitor as the command runs. Each entry includes the
    package name, the SubscriberPackageVersionId already installed in the org (if any), the SubscriberPackageVersionId
    that was attempted, and the decision made (Skipped, Installed, Installing, or Failed).
```

_See code: [@simplysf/simply-package](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-package@2.8.1/packages/simply-package/lib/commands/simply/package/dependencies/install.js)_

## `sf simply package dependencies manage`

Manage package dependency versions for a Salesforce project.

```
USAGE
  $ sf simply package dependencies manage -v <value> [--json] [--flags-dir <value>] [-b <value>] [--update-to-released |
    --update-to-latest] [--api-version <value>]

FLAGS
  -b, --branch=<value>          Package branch to consider when evaluating version options.
  -v, --target-dev-hub=<value>  (required) Username or alias of the Dev Hub org. Not required if the `target-dev-hub`
                                configuration variable is already set.
      --api-version=<value>     Override the api version used for api requests made by this command
      --update-to-latest        Automatically set all dependencies to the latest non-pinned build.
      --update-to-released      Automatically update all dependencies to the latest released version.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Manage package dependency versions for a Salesforce project.

  Interactively updates package dependency versions in sfdx-project.json by querying the Dev Hub for available versions.
  Supports interactive selection or automatic update to the latest released or latest build version.

  Project-level configuration (in sfdx-project.json) is read from the following keys:

  - plugins.simply.dependencies.ignore — array of Package2Ids or aliases to leave unchanged
  - plugins.simply.package.brancheswithreleasedversions — array of branch names that contain released versions

EXAMPLES
  $ sf simply package dependencies manage --target-dev-hub myDevHub

  $ sf simply package dependencies manage --target-dev-hub myDevHub --branch my-feature-branch

  $ sf simply package dependencies manage --target-dev-hub myDevHub --update-to-released

  $ sf simply package dependencies manage --target-dev-hub myDevHub --update-to-latest

FLAG DESCRIPTIONS
  -b, --branch=<value>  Package branch to consider when evaluating version options.

    When specified, the command will include the latest build on this branch as a selectable option for each dependency.

  --update-to-latest  Automatically set all dependencies to the latest non-pinned build.

    When specified, all dependencies managed by the Dev Hub are automatically set to a non-pinned X.Y.Z.LATEST version
    number without interactive prompts. Mutually exclusive with --update-to-released.

  --update-to-released  Automatically update all dependencies to the latest released version.

    When specified, all dependencies managed by the Dev Hub are automatically updated to the latest released package
    version without interactive prompts. Mutually exclusive with --update-to-latest.
```

_See code: [@simplysf/simply-package](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-package@2.8.1/packages/simply-package/lib/commands/simply/package/dependencies/manage.js)_

## `sf simply package version cleanup`

Cleanup package versions.

```
USAGE
  $ sf simply package version cleanup -p <value> -v <value> [--json] [--flags-dir <value>] [--api-version <value>] [-s <value> | -x
    <value>]

FLAGS
  -p, --package=<value>          (required) Package Id
  -s, --matcher=<value>          MAJOR.MINOR.PATCH to select on
  -v, --target-dev-hub=<value>   (required) Username or alias of the Dev Hub org. Not required if the `target-dev-hub`
                                 configuration variable is already set.
  -x, --exclude-matcher=<value>  MAJOR.MINOR.PATCH to exclude on
      --api-version=<value>      Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Cleanup package versions.

  Delete package versions for a given package provided a MAJOR.MINOR.PATCH matcher, either to select on or to exclude
  on. Does not delete released package versions.

  If --matcher is provided, only the unreleased versions matching MAJOR.MINOR.PATCH are deleted. If --exclude-matcher is
  provided instead, every unreleased version that does _not_ match MAJOR.MINOR.PATCH is deleted. Exactly one of
  --matcher or --exclude-matcher must be specified.

EXAMPLES
  $ sf simply package version cleanup --package 0Hoxx00000000CqCAI --matcher 2.10.0 --target-dev-hub myDevHub

  $ sf simply package version cleanup --package 0Hoxx00000000CqCAI --exclude-matcher 2.10.0 --target-dev-hub myDevHub

FLAG DESCRIPTIONS
  -p, --package=<value>  Package Id

    The 0Ht Package Id that you wish to cleanup versions for.

  -s, --matcher=<value>  MAJOR.MINOR.PATCH to select on

    The MAJOR.MINOR.PATCH matcher that should be used to find package versions to delete. Only versions matching this
    matcher are deleted. Mutually exclusive with --exclude-matcher.

  -x, --exclude-matcher=<value>  MAJOR.MINOR.PATCH to exclude on

    The MAJOR.MINOR.PATCH matcher that should be used to find package versions to keep. Every unreleased version that
    does not match this matcher is deleted. Mutually exclusive with --matcher.
```

_See code: [@simplysf/simply-package](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-package@2.8.1/packages/simply-package/lib/commands/simply/package/version/cleanup.js)_

## `sf simply permissions analyze`

Analyze permission sets and permission set groups in an org.

```
USAGE
  $ sf simply permissions analyze -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-f <value>...] [--output
    <value>]

FLAGS
  -f, --filter=<value>...    Permission set or group names to include
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --output=<value>       [default: permissions_report.html] Output HTML file path

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Analyze permission sets and permission set groups in an org.

  Generates an HTML report of every permission set and permission set group in the target org, grouped by installed
  package, including their object and field permissions.

EXAMPLES
  $ sf simply permissions analyze --target-org myOrg

  $ sf simply permissions analyze --target-org myOrg --output reports/permissions.html --filter My_Permission_Set --filter Another_Set

FLAG DESCRIPTIONS
  -f, --filter=<value>...  Permission set or group names to include

    One or more PermissionSet (Name) or PermissionSetGroup (DeveloperName) API names to restrict the report to. If
    omitted, all permission sets and groups are included.

  --output=<value>  Output HTML file path

    The path to write the generated HTML report to.
```

_See code: [@simplysf/simply-permissions](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-permissions@1.2.13/packages/simply-permissions/lib/commands/simply/permissions/analyze.js)_

## `sf simply permissions build`

Generate a permission set from Salesforce source metadata.

```
USAGE
  $ sf simply permissions build --type read-only|view-all|modify-all -n <value> -d <value> --output <value> [--json]
    [--flags-dir <value>] [-c <value>] [--include-record-types] [--label <value>] [--description <value>]

FLAGS
  -c, --config=<value>        Path to a permission set configuration file
  -d, --directory=<value>     (required) Path to the Salesforce project directory
  -n, --name=<value>          (required) API name for the permission set
      --description=<value>   Description for the permission set
      --include-record-types  Include record type visibilities
      --label=<value>         Label for the permission set
      --output=<value>        (required) Output directory
      --type=<option>         (required) Baseline permission type
                              <options: read-only|view-all|modify-all>

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate a permission set from Salesforce source metadata.

  Scans a Salesforce project directory for custom objects, fields, tabs, and (optionally) record types, then generates a
  permission set XML file with a baseline of permissions determined by --type. An optional JSON --config file can
  override individual object, field, tab, record type, and user permission settings, as well as whether the permission
  set requires activation.

EXAMPLES
  $ sf simply permissions build --type read-only --name My_Read_Only_Access --directory force-app --output force-app/main/default/permissionsets

  $ sf simply permissions build --type modify-all --name My_Admin_Access --directory force-app --config config/permission-overrides.json --output force-app/main/default/permissionsets --include-record-types

FLAG DESCRIPTIONS
  -c, --config=<value>  Path to a permission set configuration file

    The path to a JSON file that overrides individual object, field, tab, record type, and user permission settings, as
    well as whether the permission set requires activation, on top of the --type baseline.

  -d, --directory=<value>  Path to the Salesforce project directory

    The path to the Salesforce source directory to scan for custom objects, fields, tabs, and record types.

  -n, --name=<value>  API name for the permission set

    The API name for the generated permission set; also used to derive the output filename.

  --include-record-types  Include record type visibilities

    Automatically include record type visibilities discovered from the source metadata, marked as visible by default.

  --output=<value>  Output directory

    The directory to write the generated permission set XML file to.

  --type=read-only|view-all|modify-all  Baseline permission type

    The baseline permission level to generate: 'read-only' grants read access to all discovered objects and fields,
    'view-all' additionally grants view-all-records, and 'modify-all' grants full CRUD and modify-all-records access.
```

_See code: [@simplysf/simply-permissions](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-permissions@1.2.13/packages/simply-permissions/lib/commands/simply/permissions/build.js)_

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

_See code: [@simplysf/simply-project](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-project@1.2.10/packages/simply-project/lib/commands/simply/project/update/api-version.js)_

## `sf simply schema generate`

Generate Salesforce CustomObject/CustomField/RecordType metadata from a CSV or Excel schema definition file.

```
USAGE
  $ sf simply schema generate -f <value> -d <value> [--json] [--flags-dir <value>]

FLAGS
  -d, --output-dir=<value>  (required) The output directory to write the generated metadata into.
  -f, --file=<value>        (required) Path to the CSV or Excel (.xlsx/.xls) schema definition file.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate Salesforce CustomObject/CustomField/RecordType metadata from a CSV or Excel schema definition file.

  Reads a flat CSV or an Excel workbook describing one or more custom objects, their fields, and (CSV only) their record
  types, and writes Salesforce DX source-format metadata (`.object-meta.xml`, `.field-meta.xml`, `.recordType-meta.xml`)
  into `--output-dir`.

  For CSV input, each row's `Type` column (`CustomObject`, `CustomField`, or `RecordType`) and `ObjectName` column group
  the rows by object. For Excel input (`.xlsx`/`.xls`), the workbook must contain an `object` worksheet (a two-column
  key/value sheet describing the sObject) and a `fields` worksheet (one row per field); picklist fields may reference an
  additional values worksheet by name.

EXAMPLES
  $ sf simply schema generate --file schema.csv --output-dir force-app/main/default/objects

  $ sf simply schema generate --file MyObject__c.xlsx --output-dir force-app/main/default/objects

FLAG DESCRIPTIONS
  -f, --file=<value>  Path to the CSV or Excel (.xlsx/.xls) schema definition file.

    A `.csv` file processed as the flat CSV flow, or a `.xlsx`/`.xls` file processed as the Excel flow.
```

_See code: [@simplysf/simply-schema](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-schema@0.3.0/packages/simply-schema/lib/commands/simply/schema/generate.js)_

## `sf simply schema visualize`

Generate visualizations of Salesforce schema from a live org or local source files.

```
USAGE
  $ sf simply schema visualize [--json] [--flags-dir <value>] [-o <value>] [--api-version <value>] [-d <value>...]
    [--source-objects <value>] [--related-objects <value>] [--object-type custom|standard|all] [--field-type
    custom|standard|all] [--output-type html|md|csv...] [--output-dir <value>]

FLAGS
  -d, --source-dir=<value>...    One or more paths to directories containing Salesforce DX source. Use this for
                                 local-source generation.
  -o, --target-org=<value>       Username or alias of the org to visualize. Use this for live-org generation.
      --api-version=<value>      Override the api version used for api requests made by this command
      --field-type=<option>      [default: custom] Scope of relationship fields to include: custom, standard, or all.
                                 <options: custom|standard|all>
      --object-type=<option>     [default: custom] Scope of objects to include: custom, standard, or all.
                                 <options: custom|standard|all>
      --output-dir=<value>       The output directory for the generated files.
      --output-type=<option>...  [default: html,md] Output format(s) to generate.
                                 <options: html|md|csv>
      --related-objects=<value>  Comma-separated list of related objects to filter the visualization to, or `all`.
      --source-objects=<value>   Comma-separated list of source objects to start from, or `all`.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Generate visualizations of Salesforce schema from a live org or local source files.

  Builds an object-relationship diagram (interactive HTML), a Mermaid entity-relationship diagram (Markdown), and/or a
  relationship CSV, either from a live org's Tooling API or from local Salesforce DX source directories. Exactly one of
  `--target-org` or `--source-dir` must be specified.

EXAMPLES
  $ sf simply schema visualize --target-org myTargetOrg

  $ sf simply schema visualize --target-org myTargetOrg --source-objects Account,Contact --related-objects all

  $ sf simply schema visualize --source-dir force-app --output-type html,md

FLAG DESCRIPTIONS
  --output-type=html|md|csv...  Output format(s) to generate.

    One or more of `html` (interactive diagram), `md` (Mermaid entity-relationship diagram), or `csv` (relationship
    data).

  --related-objects=<value>  Comma-separated list of related objects to filter the visualization to, or `all`.

    Comma-separated API names of related objects to include in the visualization. If `all` is specified, every related
    object is included regardless of `--object-type`. If not specified, related objects aren't filtered.

  --source-objects=<value>  Comma-separated list of source objects to start from, or `all`.

    Comma-separated API names of the objects to start the visualization from (e.g. `Account,MyObject__c`). If `all` is
    specified, every discovered object is included. If not specified, every object matching `--object-type` is included.
```

_See code: [@simplysf/simply-schema](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-schema@0.3.0/packages/simply-schema/lib/commands/simply/schema/visualize.js)_

## `sf simply sobject backup`

Back up SObject data to a CSV file.

```
USAGE
  $ sf simply sobject backup -s <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -s, --sobject=<value>      (required) SObject API name
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Back up SObject data to a CSV file.

  Describes the given SObject, queries every field via the Bulk API, and writes the results to a timestamped CSV file.

EXAMPLES
  $ sf simply sobject backup --target-org myOrg --sobject Account

  $ sf simply sobject backup --target-org myOrg --sobject Custom_Object__c --output-dir backups

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the backup CSV file to. Defaults to the current directory.

  -s, --sobject=<value>  SObject API name

    The API name of the SObject to back up.
```

_See code: [@simplysf/simply-sobject](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/backup.js)_

## `sf simply sobject deduplicate`

Identify and prepare deduplication of an SObject's records.

```
USAGE
  $ sf simply sobject deduplicate -c <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [--dry-run]
    [--output-dir <value>]

FLAGS
  -c, --config=<value>       (required) Path to a deduplication configuration file
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --dry-run              Skip calculating associated object lookup replacements
      --output-dir=<value>   Output directory

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Identify and prepare deduplication of an SObject's records.

  Queries an SObject, groups records by a composite key built from configured fields, and writes CSV files listing which
  records are unique and which are duplicates that should be deleted. For each associated object with lookups to the
  primary object, also writes a CSV of the lookup field updates needed to re-point duplicate references at the surviving
  unique record. This command does not perform any deletes or updates in the org; it only prepares the CSV files for a
  subsequent data load.

EXAMPLES
  $ sf simply sobject deduplicate --target-org myOrg --config config/deduplicate-account.json

  $ sf simply sobject deduplicate --target-org myOrg --config config/deduplicate-account.json --dry-run

FLAG DESCRIPTIONS
  -c, --config=<value>  Path to a deduplication configuration file

    The path to a JSON file describing the primary object, its composite key fields, and any associated objects with
    lookups to it.

  --dry-run  Skip calculating associated object lookup replacements

    When set, only the primary object's unique/duplicate CSV files are generated; associated object lookup replacement
    files are not calculated.

  --output-dir=<value>  Output directory

    The directory to write the generated CSV files to. Defaults to ./temp/<primaryObjectApiName>.
```

_See code: [@simplysf/simply-sobject](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/deduplicate.js)_

## `sf simply sobject history export`

Export field history for an SObject within a date range to a CSV file.

```
USAGE
  $ sf simply sobject history export -s <value> --start-date <value> --end-date <value> -o <value> [--json] [--flags-dir <value>]
    [--api-version <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
  -s, --sobject=<value>      (required) SObject API name
      --api-version=<value>  Override the api version used for api requests made by this command
      --end-date=<value>     (required) End date (YYYY-MM-DD)
      --start-date=<value>   (required) Start date (YYYY-MM-DD)

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Export field history for an SObject within a date range to a CSV file.

  Queries the field history object for the given SObject (e.g. `AccountHistory`, `Custom_Object__History`, or
  `OpportunityFieldHistory`) for changes created within the given date range, and writes the results to a timestamped
  CSV file.

EXAMPLES
  $ sf simply sobject history export --target-org myOrg --sobject Account --start-date 2026-01-01 --end-date 2026-01-31

  $ sf simply sobject history export --target-org myOrg --sobject Custom_Object__c --start-date 2026-01-01 --end-date 2026-01-31 --output-dir exports

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the exported CSV file to. Defaults to the current directory.

  -s, --sobject=<value>  SObject API name

    The API name of the SObject to export field history for (e.g. Account or Custom_Object__c).

  --end-date=<value>  End date (YYYY-MM-DD)

    The end of the date range to export history for, inclusive.

  --start-date=<value>  Start date (YYYY-MM-DD)

    The start of the date range to export history for, inclusive.
```

_See code: [@simplysf/simply-sobject](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/history/export.js)_

## `sf simply sobject history query`

Query the field history of an SObject, with optional filtering.

```
USAGE
  $ sf simply sobject history query --object <value> -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [--filters
    <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command
      --filters=<value>      Path to a filter configuration file, or a raw JSON filter string
      --object=<value>       (required) SObject API name

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Query the field history of an SObject, with optional filtering.

  Queries the field history object for the given SObject (e.g. `AccountHistory`, `Custom_Object__History`, or
  `OpportunityFieldHistory`) and writes the results to a timestamped CSV file. An optional filter tree can be supplied
  to narrow the results: conditions on Field, CreatedById, CreatedDate, or the parent lookup field are pushed into the
  SOQL WHERE clause; conditions on any other field (e.g. OldValue or NewValue) are applied client-side after the query
  runs.

EXAMPLES
  $ sf simply sobject history query --target-org myOrg --object Account

  $ sf simply sobject history query --target-org myOrg --object Custom_Object__c --filters config/history-filters.json

  $ sf simply sobject history query --target-org myOrg --object Account --filters '{"logic":"AND","filters":[{"field":"Field","operator":"=","value":"Name"}]}'

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the query results CSV file to. Defaults to the current directory.

  --filters=<value>  Path to a filter configuration file, or a raw JSON filter string

    A JSON object describing a tree of filter conditions: `{ "logic": "AND", "filters": [ { "field": "Field",
    "operator": "=", "value": "Status__c" } ] }`. Each entry in `filters` is either a condition (`field`, `operator`,
    `value`) or another nested group with its own `logic`/`filters`. Supported operators are =, !=, >, <, >=, <=, IN,
    NOT IN, and LIKE (using `%` as a wildcard).

  --object=<value>  SObject API name

    The API name of the SObject to query field history for (e.g. Account or Custom_Object__c).
```

_See code: [@simplysf/simply-sobject](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/history/query.js)_

## `sf simply sobject history schema`

Report on which objects and fields have field history tracking enabled.

```
USAGE
  $ sf simply sobject history schema -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-d <value>]

FLAGS
  -d, --output-dir=<value>   Output directory
  -o, --target-org=<value>   (required) Username or alias of the target org. Not required if the `target-org`
                             configuration variable is already set.
      --api-version=<value>  Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Report on which objects and fields have field history tracking enabled.

  Identifies every object with field history tracking enabled, and every tracked field on each, resolving the
  managed/unlocked package each field belongs to, and writes the results to a timestamped CSV file and a browsable HTML
  report.

EXAMPLES
  $ sf simply sobject history schema --target-org myOrg

  $ sf simply sobject history schema --target-org myOrg --output-dir reports

FLAG DESCRIPTIONS
  -d, --output-dir=<value>  Output directory

    The directory to save the generated CSV and HTML report files to. Defaults to the current directory.
```

_See code: [@simplysf/simply-sobject](https://github.com/SimplySF/simply-node/blob/@simplysf/simply-sobject@1.4.0/packages/simply-sobject/lib/commands/simply/sobject/history/schema.js)_
<!-- commandsstop -->
