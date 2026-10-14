# summary

Activate and show states in State and Country/Territory Picklists by deploying the org's AddressSettings.

# description

Retrieves the org's AddressSettings, sets `<active>` and `<visible>` to true on exactly the states listed in the JSON file, and deploys the settings back. This is the step `simply settings address state create` leaves for afterwards, because new states are created inactive and hidden.

Only the listed states are changed. Other states, including standard ones an admin deliberately hid, and every country, are left as they are. A listed state that isn't in the org is reported and skipped; create it first.

States come from the same places as for `create`: a `--file` mapping ISO 3166-2 codes to state names, e.g. `{ "US-CA": "California" }`, or `--iso-codes debian` to download them from Debian's iso-codes project. Use the same flags as the `create` run, including `--iso-codes-version`, so the same states are activated.

# flags.country.summary

Only activate states in these countries (two-letter ISO 3166-1 codes). Can be specified multiple times.

# flags.wait.summary

Minutes to wait for the AddressSettings retrieve and deploy.

# flags.dry-run.summary

Report which states would be activated, without deploying anything.

# info.activating

Activating states

# info.nothingToActivate

No listed state needs activating.

# info.dryRun

Dry run: %s states would be activated. Nothing was deployed.

# info.deployed

Activated %s states (deploy %s).

# warning.notInOrg

%s listed states aren't in the org, so they were skipped: %s. Create them with "%s".

# error.deployFailed

The AddressSettings deploy %s failed: %s

# examples

- Activate every state listed in states.json:

  <%= config.bin %> <%= command.id %> --target-org my-org --file states.json

- Activate only the United States entries:

  <%= config.bin %> <%= command.id %> --target-org my-org --file states.json --country US

- See which states would be activated without deploying:

  <%= config.bin %> <%= command.id %> --target-org my-org --file states.json --dry-run

- Activate the French states created from Debian's iso-codes, using the same pinned release:

  <%= config.bin %> <%= command.id %> --target-org my-org --iso-codes debian --iso-codes-version v4.20.1 --country FR
