# summary

Fail the pipeline when any generated permission set in the repo has drifted from its source metadata.

# description

Finds every permission set build file in the repo, meaning every file whose name ends in `.psbuild.json`, each of which defines one permission set (see `sf simply permissions build`). It checks each of those permission sets the same way `sf simply permissions build --check` does. Nothing is written. Files are found by walking the directory tree from the current directory, skipping `node_modules`, `.git`, `.sf`, and `.sfdx`, so `find . -name '*.psbuild.json'` lists what will be checked. Relative paths in a permission set build file resolve against the current directory, so run this from the repo root.

Every file is loaded and validated before any permission set is checked: a `.psbuild.json` file that fails validation, one in the old `permissionSets` list format, or two files that define the same permission set name fail the command immediately. Every permission set is then checked before the command fails, so one run lists every permission set that has drifted or is missing, with the file that defines it and the command that regenerates them. A repo with no `.psbuild.json` files is skipped with exit code 0, so the job is safe to include in a shared pipeline template. Formatting differences, such as indentation, line endings, or comments, don't count as drift.

# examples

- <%= config.bin %> <%= command.id %>
