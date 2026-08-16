# summary

Delete scratch orgs older than 3 hours from every configured Dev Hub.

# description

For each Dev Hub, queries `ActiveScratchOrg` records created more than 3 hours ago and bulk-deletes them. Useful for keeping a shared Dev Hub's scratch org allotment from being exhausted by abandoned CI runs.

# examples

- <%= config.bin %> <%= command.id %> --dev-hub-name main --dev-hub-username devhub@example.com --dev-hub-client-id 3MVG9... --dev-hub-instance-url https://login.salesforce.com --jwt-key-file ./server.key
