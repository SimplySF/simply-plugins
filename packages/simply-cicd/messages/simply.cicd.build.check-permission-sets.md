# summary

Fail the pipeline when any generated permission set in the repo has drifted from its source metadata.

# description

Finds every permission sets file in the repo (the JSON format `sf simply permissions build --file` reads) and checks each permission set it declares, the same way `sf simply permissions build --file <file> --check` does. Nothing is written. A file counts as a permission sets file when it's a JSON object with a top-level `permissionSets` array. Files are found with `git ls-files`, so anything `.gitignore` excludes is never scanned. Relative paths in a permission sets file resolve against the current directory, so run this from the repo root.

Every file is checked before the command fails, so one run lists every permission set that has drifted or is missing, along with the command that regenerates each file. A permission sets file that fails validation fails the command immediately. A repo with no permission sets files is skipped with exit code 0, so the job is safe to include in a shared pipeline template. Formatting differences, such as indentation, line endings, or comments, don't count as drift.

# examples

- <%= config.bin %> <%= command.id %>
