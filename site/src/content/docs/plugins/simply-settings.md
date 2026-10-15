---
title: '@simplysf/simply-settings'
description: 'Salesforce Settings metadata utilities, starting with State and Country/Territory picklists (AddressSettings)'
---

Salesforce Settings metadata utilities, starting with State and Country/Territory picklists (AddressSettings)

```sh
sf plugins install @simplysf/simply-settings
```

## Commands

## `sf simply settings address state activate`

Activate and show states in State and Country/Territory Picklists by deploying the org's AddressSettings.

```
USAGE
  $ sf simply settings address state activate -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-f <value>]
    [--iso-codes-version <value> --iso-codes debian] [--all-levels ] [-c <value>...] [-w <value>] [--dry-run]

FLAGS
  -c, --country=<value>...         Only activate states in these countries (two-letter ISO 3166-1 codes). Can be
                                   specified multiple times.
  -f, --file=<value>               JSON file mapping ISO 3166-2 codes to state names, e.g. {"US-CA": "California"}.
  -o, --target-org=<value>         (required) Username or alias of the target org. Not required if the `target-org`
                                   configuration variable is already set.
  -w, --wait=<value>               [default: 33 minutes] Minutes to wait for the AddressSettings retrieve and deploy.
      --all-levels                 Include subdivisions nested under another subdivision, such as French departments
                                   under their regions. By default only top-level subdivisions are used.
      --api-version=<value>        Override the api version used for api requests made by this command
      --dry-run                    Report which states would be activated, without deploying anything.
      --iso-codes=<option>         Download the states from this ISO 3166-2 source at run time, instead of reading a
                                   file.
                                   <options: debian>
      --iso-codes-version=<value>  Version of the --iso-codes source to use. For "debian", a tag such as v4.20.1, or a
                                   branch such as main. Defaults to the latest release.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Activate and show states in State and Country/Territory Picklists by deploying the org's AddressSettings.

  Retrieves the org's AddressSettings, sets `<active>` and `<visible>` to true on exactly the states listed in the JSON
  file, and deploys the settings back. This is the step `simply settings address state create` leaves for afterwards,
  because new states are created inactive and hidden.

  Only the listed states are changed. Other states, including standard ones an admin deliberately hid, and every
  country, are left as they are. A listed state that isn't in the org is reported and skipped; create it first.

  States come from the same places as for `create`: a `--file` mapping ISO 3166-2 codes to state names, e.g. `{ "US-CA":
  "California" }`, or `--iso-codes debian` to download them from Debian's iso-codes project. Use the same flags as the
  `create` run, including `--iso-codes-version`, so the same states are activated.

EXAMPLES
  Activate every state listed in states.json:

    $ sf simply settings address state activate --target-org my-org --file states.json

  Activate only the United States entries:

    $ sf simply settings address state activate --target-org my-org --file states.json --country US

  See which states would be activated without deploying:

    $ sf simply settings address state activate --target-org my-org --file states.json --dry-run

  Activate the French states created from Debian's iso-codes, using the same pinned release:

    $ sf simply settings address state activate --target-org my-org --iso-codes debian --iso-codes-version v4.20.1 \
      --country FR

FLAG DESCRIPTIONS
  --iso-codes=debian  Download the states from this ISO 3166-2 source at run time, instead of reading a file.

    "debian" is Debian's iso-codes project (https://salsa.debian.org/iso-codes-team/iso-codes). The data is downloaded
    each time the command runs and is never stored, so it's always as current as the version you choose. Downloads honor
    the HTTPS_PROXY and NO_PROXY environment variables.
```

_See code: [lib/commands/simply/settings/address/state/activate.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-settings@0.3.0/packages/simply-settings/lib/commands/simply/settings/address/state/activate.js)_

## `sf simply settings address state create`

Create missing states in State and Country/Territory Picklists by submitting Setup's Configure New State form.

```
USAGE
  $ sf simply settings address state create -o <value> [--json] [--flags-dir <value>] [--api-version <value>] [-f <value>]
    [--iso-codes-version <value> --iso-codes debian] [--all-levels ] [-c <value>...] [--concurrency <value>] [-w
    <value>] [--dry-run]

FLAGS
  -c, --country=<value>...         Only create states in these countries (two-letter ISO 3166-1 codes). Can be specified
                                   multiple times.
  -f, --file=<value>               JSON file mapping ISO 3166-2 codes to state names, e.g. {"US-CA": "California"}.
  -o, --target-org=<value>         (required) Username or alias of the target org. Not required if the `target-org`
                                   configuration variable is already set.
  -w, --wait=<value>               [default: 33 minutes] Minutes to wait for the AddressSettings retrieve.
      --all-levels                 Include subdivisions nested under another subdivision, such as French departments
                                   under their regions. By default only top-level subdivisions are used.
      --api-version=<value>        Override the api version used for api requests made by this command
      --concurrency=<value>        [default: 4] How many states to submit at the same time.
      --dry-run                    Report which states would be created, without submitting anything.
      --iso-codes=<option>         Download the states from this ISO 3166-2 source at run time, instead of reading a
                                   file.
                                   <options: debian>
      --iso-codes-version=<value>  Version of the --iso-codes source to use. For "debian", a tag such as v4.20.1, or a
                                   branch such as main. Defaults to the latest release.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Create missing states in State and Country/Territory Picklists by submitting Setup's Configure New State form.

  Salesforce offers no API for creating states (only for editing existing ones), so this command does what an admin
  would do by hand in Setup: for each state, it loads the Configure New State form for the state's country and submits
  it.

  It reads the org's AddressSettings first. A state whose ISO code already exists under its country is reported as
  `exists`, and a state whose country isn't in the org is reported as `country-missing`; neither causes any Setup
  traffic. Everything else is submitted, several states at a time.

  The states come from one of two places. Use `--file` for a JSON file that maps ISO 3166-2 codes to state names, e.g.
  `{ "US-CA": "California", "AD-02": "Canillo" }`. Or use `--iso-codes debian` to download them from Debian's iso-codes
  project (https://salsa.debian.org/iso-codes-team/iso-codes) each time the command runs, so the list never goes out of
  date. Pin `--iso-codes-version` so `create` and `activate` use the same data. Only top-level subdivisions are used
  unless you pass `--all-levels`. Each state's integration value is set to its name.

  New states are created inactive and hidden. Run `simply settings address state activate` with the same flags
  afterwards to activate them.

  The org's auth must be able to open Setup pages (the `web` or `full` OAuth scope, as granted by `sf org login web`).

  Exits with code 1 when any state is `rejected` or `failed`; the JSON result still lists every state.

EXAMPLES
  Create every state listed in states.json that the org is missing:

    $ sf simply settings address state create --target-org my-org --file states.json

  Create only the United States and Canada entries, two at a time:

    $ sf simply settings address state create --target-org my-org --file states.json --country US --country CA \
      --concurrency 2

  See what would be created without changing anything:

    $ sf simply settings address state create --target-org my-org --file states.json --dry-run

  Create France's and Germany's states from Debian's iso-codes, pinned to a release:

    $ sf simply settings address state create --target-org my-org --iso-codes debian --iso-codes-version v4.20.1 \
      --country FR --country DE

  See which of France's states, including departments, the org is missing according to the latest iso-codes release:

    $ sf simply settings address state create --target-org my-org --iso-codes debian --all-levels --country FR \
      --dry-run

FLAG DESCRIPTIONS
  --iso-codes=debian  Download the states from this ISO 3166-2 source at run time, instead of reading a file.

    "debian" is Debian's iso-codes project (https://salsa.debian.org/iso-codes-team/iso-codes). The data is downloaded
    each time the command runs and is never stored, so it's always as current as the version you choose. Downloads honor
    the HTTPS_PROXY and NO_PROXY environment variables.
```

_See code: [lib/commands/simply/settings/address/state/create.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-settings@0.3.0/packages/simply-settings/lib/commands/simply/settings/address/state/create.js)_
