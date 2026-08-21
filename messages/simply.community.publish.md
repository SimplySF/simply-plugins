# summary

Publish a Salesforce Community (Experience Cloud site), waiting until the publish completes.

# description

Looks up the community by `--name`, triggers a publish via the Connect REST API, then polls until the publish job reaches a terminal state — throwing an error if it fails, rather than returning as soon as the publish request is accepted. The Salesforce CLI's own `sf community publish` command does not wait for completion; this command exists to fill that gap for pipelines that need to know publishing actually succeeded before continuing.

# flags.name.summary

Name of the community (Experience Cloud site) to publish.

# flags.wait.summary

Minutes to wait for the publish to complete before giving up. Salesforce's own publish jobs time out after 15 minutes server-side, so waiting longer than that has no effect.

# flags.retry-attempts.summary

Number of additional attempts to make if the initial publish request fails, before giving up. Defaults to 0 (no retries). Does not apply to polling for the publish job's completion, which already retries until --wait elapses.

# flags.retry-backoff.summary

Factor the delay between publish request retries grows by after each failed attempt (e.g. 2 doubles the delay each time). Only relevant when --retry-attempts is greater than 0.

# flags.ignore-errors.summary

Log a warning and exit successfully if the publish fails, instead of throwing an error.

# info.publishing

Publishing community "%s"...

# info.published

Community "%s" published successfully.

# warning.publishFailed

Failed to publish community "%s": %s

# examples

- <%= config.bin %> <%= command.id %> --target-org my-org --name "My Community"

- <%= config.bin %> <%= command.id %> --target-org my-org --name "My Community" --wait 20

- <%= config.bin %> <%= command.id %> --target-org my-org --name "My Community" --retry-attempts 3 --retry-backoff 2

- <%= config.bin %> <%= command.id %> --target-org my-org --name "My Community" --ignore-errors
