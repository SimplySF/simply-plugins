# summary

Generate visualizations of Salesforce schema from a live org or local source files.

# description

Builds an object-relationship diagram (interactive HTML), a Mermaid entity-relationship diagram (Markdown), and/or a relationship CSV, either from a live org's Tooling API or from local Salesforce DX source directories. Exactly one of `--target-org` or `--source-dir` must be specified.

# flags.target-org.summary

Username or alias of the org to visualize. Use this for live-org generation.

# flags.source-dir.summary

One or more paths to directories containing Salesforce DX source. Use this for local-source generation.

# flags.source-objects.summary

Comma-separated list of source objects to start from, or `all`.

# flags.source-objects.description

Comma-separated API names of the objects to start the visualization from (e.g. `Account,MyObject__c`). If `all` is specified, every discovered object is included. If not specified, every object matching `--object-type` is included.

# flags.related-objects.summary

Comma-separated list of related objects to filter the visualization to, or `all`.

# flags.related-objects.description

Comma-separated API names of related objects to include in the visualization. If `all` is specified, every related object is included regardless of `--object-type`. If not specified, related objects aren't filtered.

# flags.object-type.summary

Scope of objects to include: custom, standard, or all.

# flags.field-type.summary

Scope of relationship fields to include: custom, standard, or all.

# flags.output-type.summary

Output format(s) to generate.

# flags.output-type.description

One or more of `html` (interactive diagram), `md` (Mermaid entity-relationship diagram), or `csv` (relationship data).

# flags.output-dir.summary

The output directory for the generated files.

# examples

- <%= config.bin %> <%= command.id %> --target-org myTargetOrg

- <%= config.bin %> <%= command.id %> --target-org myTargetOrg --source-objects Account,Contact --related-objects all

- <%= config.bin %> <%= command.id %> --source-dir force-app --output-type html,md

# error.targetOrgOrSourceDirRequired

You must specify either --target-org or --source-dir, but not both.

# error.localScanFailed

Failed to scan the project directory: %s

# error.noObjectDefinitionsFound

No object definitions found. Check your --source-dir paths.

# info.connectingToOrg

Connecting to %s...

# info.fetchingObjectList

Fetching object list...

# info.searchingReverseLookups

Searching for reverse lookups...

# info.resolvingPackageNames

Resolving package names...

# info.retrievingRelationships

Retrieving relationships...

# info.discoveringObjects

Discovering Salesforce object definitions...

# info.parsingMetadata

Parsing object and field metadata...

# info.generatingOutputs

Generating outputs...

# info.complete

Generated %s object(s) and %s relationship(s) in %s
