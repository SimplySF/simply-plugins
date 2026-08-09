# simply

[![NPM](https://img.shields.io/npm/v/@simplysf/simply.svg?label=@simplysf/simply)](https://www.npmjs.com/package/@simplysf/simply) [![Downloads/week](https://img.shields.io/npm/dw/@simplysf/simply.svg)](https://npmjs.org/package/@simplysf/simply) [![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://raw.githubusercontent.com/SimplySF/simply/main/LICENSE.txt)

## Install

```bash
sf plugins install @simplysf/simply
```

## Issues

Please report any issues at https://github.com/SimplySF/simply/issues

## Commands

<!-- commands -->

- [`sf simply data file upload`](#sf-simply-data-file-upload)
- [`sf simply data files download`](#sf-simply-data-files-download)
- [`sf simply data files upload`](#sf-simply-data-files-upload)
- [`sf simply package dependencies install`](#sf-simply-package-dependencies-install)
- [`sf simply package dependencies manage`](#sf-simply-package-dependencies-manage)
- [`sf simply package version cleanup`](#sf-simply-package-version-cleanup)

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

_See code: [@simplysf/simply-data](https://github.com/SimplySF/simply/blob/@simplysf/simply-data@2.1.9/packages/simply-data/lib/commands/simply/data/file/upload.js)_

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

_See code: [@simplysf/simply-data](https://github.com/SimplySF/simply/blob/@simplysf/simply-data@2.1.9/packages/simply-data/lib/commands/simply/data/files/download.js)_

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

_See code: [@simplysf/simply-data](https://github.com/SimplySF/simply/blob/@simplysf/simply-data@2.1.9/packages/simply-data/lib/commands/simply/data/files/upload.js)_

## `sf simply package dependencies install`

Install package dependencies for a Salesforce project.

```
USAGE
  $ sf simply package dependencies install -o <value> [--json] [--flags-dir <value>] [-a all|package] [--api-version <value>] [-z
    <value>] [-i All|Delta] [-k <value>...] [-r] [-b <value>] [-s AllUsers|AdminsOnly] [-v <value>] [-t
    DeprecateOnly|Mixed|Delete] [-w <value>]

FLAGS
  -a, --apex-compile=<option>        Compile all Apex in the org and package, or only Apex in the package; unlocked
                                     packages only.
                                     <options: all|package>
  -b, --publish-wait=<value>         Maximum number of minutes to wait for the Subscriber Package Version ID to become
                                     available in the target org before canceling the install request.
  -i, --install-type=<option>        [default: Delta] Install all packages or only deltas.
                                     <options: All|Delta>
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

FLAG DESCRIPTIONS
  -a, --apex-compile=all|package

    Compile all Apex in the org and package, or only Apex in the package; unlocked packages only.

    Applies to unlocked packages only. Specifies whether to compile all Apex in the org and package, or only the Apex in
    the package.

    For package installs into production orgs, or any org that has Apex Compile on Deploy enabled, the platform compiles
    all Apex in the org after the package install or upgrade operation completes.

    This approach assures that package installs and upgrades don’t impact the performance of an org, and is done even if
    --apex-compile package is specified.

  -i, --install-type=All|Delta  Install all packages or only deltas.

    If 'All' is specified, then all packages specified in package dependencies are installed, regardless of if the
    version already is installed in the org. If 'Delta' is specified, then only packages that differ from what is
    installed in the org will be installed.

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
```

_See code: [@simplysf/simply-package](https://github.com/SimplySF/simply/blob/@simplysf/simply-package@2.3.8/packages/simply-package/lib/commands/simply/package/dependencies/install.js)_

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

_See code: [@simplysf/simply-package](https://github.com/SimplySF/simply/blob/@simplysf/simply-package@2.3.8/packages/simply-package/lib/commands/simply/package/dependencies/manage.js)_

## `sf simply package version cleanup`

Cleanup package versions.

```
USAGE
  $ sf simply package version cleanup -s <value> -p <value> -v <value> [--json] [--flags-dir <value>] [--api-version
  <value>]

FLAGS
  -p, --package=<value>         (required) Package Id
  -s, --matcher=<value>         (required) MAJOR.MINOR.PATCH
  -v, --target-dev-hub=<value>  (required) Username or alias of the Dev Hub org. Not required if the `target-dev-hub`
                                configuration variable is already set.
      --api-version=<value>     Override the api version used for api requests made by this command

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Cleanup package versions.

  Delete package versions for a given package provided a MAJOR.MINOR.PATCH matcher. Does not delete released pacakge
  versions.

EXAMPLES
  $ sf simply package version cleanup --package 0Hoxx00000000CqCAI --matcher 2.10.0 --target-dev-hub myDevHub

FLAG DESCRIPTIONS
  -p, --package=<value>  Package Id

    The 0Ht Package Id that you wish to cleanup versions for.

  -s, --matcher=<value>  MAJOR.MINOR.PATCH

    The MAJOR.MINOR.PATCH matcher that should be used to find package versions to delete.
```

_See code: [@simplysf/simply-package](https://github.com/SimplySF/simply/blob/@simplysf/simply-package@2.3.8/packages/simply-package/lib/commands/simply/package/version/cleanup.js)_
<!-- commandsstop -->
