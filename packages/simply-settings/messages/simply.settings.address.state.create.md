# summary

Create missing states in State and Country/Territory Picklists by submitting Setup's Configure New State form.

# description

Salesforce offers no API for creating states (only for editing existing ones), so this command does what an admin would do by hand in Setup: for each state, it loads the Configure New State form for the state's country and submits it.

It reads the org's AddressSettings first. A state whose ISO code already exists under its country is reported as `exists`, and a state whose country isn't in the org is reported as `country-missing`; neither causes any Setup traffic. Everything else is submitted, several states at a time.

States are listed in a JSON file that maps ISO 3166-2 codes to state names, e.g. `{ "US-CA": "California", "AD-02": "Canillo" }`. Each state's integration value is set to its name.

New states are created inactive and hidden. Run `simply settings address state activate` with the same flags afterwards to activate them.

The org's auth must be able to open Setup pages (the `web` or `full` OAuth scope, as granted by `sf org login web`).

Exits with code 1 when any state is `rejected` or `failed`; the JSON result still lists every state.

# flags.file.summary

JSON file mapping ISO 3166-2 codes to state names, e.g. {"US-CA": "California"}.

# flags.country.summary

Only create states in these countries (two-letter ISO 3166-1 codes). Can be specified multiple times.

# flags.concurrency.summary

How many states to submit at the same time.

# flags.wait.summary

Minutes to wait for the AddressSettings retrieve.

# flags.dry-run.summary

Report which states would be created, without submitting anything.

# info.retrieving

Reading the org's AddressSettings

# info.openingSession

Opening a Setup session

# info.creating

Creating %s states

# info.progress

%s of %s

# info.nothingToCreate

All %s states already exist or belong to countries the org doesn't have. Nothing to create.

# info.dryRun

Dry run: %s states would be created. Nothing was submitted.

# info.activateHint

New states are inactive and hidden. Run "%s" to activate them.

# warning.problems

%s states were rejected or failed.

# examples

- Create every state listed in states.json that the org is missing:

  <%= config.bin %> <%= command.id %> --target-org my-org --file states.json

- Create only the United States and Canada entries, two at a time:

  <%= config.bin %> <%= command.id %> --target-org my-org --file states.json --country US --country CA --concurrency 2

- See what would be created without changing anything:

  <%= config.bin %> <%= command.id %> --target-org my-org --file states.json --dry-run
