# summary

Fail the pipeline when any generated permission set in the repo has drifted from its source metadata.

# description

Finds every permission sets file in the repo, meaning every file whose name ends in `.psbuild.json` (the JSON format `sf simply permissions build --file` reads), and checks each permission set it declares, the same way `sf simply permissions build --file <file> --check` does. Nothing is written. Files are found by walking the directory tree from the current directory, skipping `node_modules`, `.git`, `.sf`, and `.sfdx`, so `find . -name '*.psbuild.json'` lists what will be checked. Relative paths in a permission sets file resolve against the current directory, so run this from the repo root.

Every file is checked before the command fails, so one run lists every permission set that has drifted or is missing, along with the command that regenerates each file. A `.psbuild.json` file that fails validation fails the command immediately. A repo with no `.psbuild.json` files is skipped with exit code 0, so the job is safe to include in a shared pipeline template. Formatting differences, such as indentation, line endings, or comments, don't count as drift.

# examples

- <%= config.bin %> <%= command.id %>
