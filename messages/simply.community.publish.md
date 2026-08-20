# summary

Publish a Salesforce Community (Experience Cloud site), waiting until the publish completes.

# description

Looks up the community by `--name`, triggers a publish via the Connect REST API, then polls until the publish job reaches a terminal state — throwing an error if it fails, rather than returning as soon as the publish request is accepted. The Salesforce CLI's own `sf community publish` command does not wait for completion; this command exists to fill that gap for pipelines that need to know publishing actually succeeded before continuing.

# flags.name.summary

Name of the community (Experience Cloud site) to publish.

# flags.wait.summary

Minutes to wait for the publish to complete before giving up. Salesforce's own publish jobs time out after 15 minutes server-side, so waiting longer than that has no effect.

# info.publishing

Publishing community "%s"...

# info.published

Community "%s" published successfully.

# examples

- <%= config.bin %> <%= command.id %> --target-org my-org --name "My Community"

- <%= config.bin %> <%= command.id %> --target-org my-org --name "My Community" --wait 20
