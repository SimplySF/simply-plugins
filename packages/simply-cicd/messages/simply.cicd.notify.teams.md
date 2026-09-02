# summary

Send a serialized JSON payload to a Microsoft Teams webhook.

# description

Posts a payload as-is to one or more Microsoft Teams incoming webhook URLs. Use this for custom notifications that don't fit the built-in `notify project` or `notify happy-soup` card templates.

# flags.payload.summary

The JSON payload to send to Teams, as a serialized string.

# flags.webhook-url.summary

The Teams webhook URL to send the payload to.

# flags.enabled.summary

Whether the notification is actually sent. Defaults to false so pipelines can gate this behind their own condition.

# flags.debug.summary

Enable verbose debug logging.

# examples

- <%= config.bin %> <%= command.id %> --payload '{"text":"Deployment complete"}' --webhook-url https://outlook.office.com/webhook/... --enabled
