# summary

Generate a change report between two git refs.

# description

Runs `git diff --name-status` between two git refs (tags, branches, or commits) in the current working directory, groups the changed files by Salesforce metadata component type, and renders a Confluence-storage-format change report suitable for pasting into a release or change-management page.

# flags.from-tag.summary

The starting git ref for the diff report.

# flags.to-tag.summary

The ending git ref for the diff report.

# flags.output-file.summary

Path to write the generated report to.

# flags.output-file.description

When specified, the generated report is written to this path instead of being printed to the terminal.

# flags.template-file.summary

Path to a custom Handlebars template to render instead of the built-in one.

# flags.template-file.description

When specified, this template is rendered with the same data the built-in report template receives, and can reuse the built-in `changeTable` partial. See this package's README "Custom Templates" section for the data shape and available partials.

# examples

- <%= config.bin %> <%= command.id %> --from-tag v1.0.0 --to-tag v1.1.0

- <%= config.bin %> <%= command.id %> --from-tag v1.0.0 --to-tag v1.1.0 --output-file change-report.html

- <%= config.bin %> <%= command.id %> --from-tag v1.0.0 --to-tag v1.1.0 --template-file my-change-report.hbs

# error.gitDiffFailed

Failed to run git diff: %s

# info.generatingDiff

Generating change report from %s to %s...

# info.complete

Change report written to %s
