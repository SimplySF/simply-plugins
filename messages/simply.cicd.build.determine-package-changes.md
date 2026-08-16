# summary

Determine if any package-relevant files have changed since the last release tag.

# description

Reads the default package directory from `sfdx-project.json`, finds the closest reachable git tag matching its version prefix, and diffs that tag against `HEAD` for the package directory and `sfdx-project.json` itself. Writes `PACKAGE_CHANGED=TRUE|FALSE` and `LAST_TAG=<tag>` to the output file. Any failure during detection (missing/invalid sfdx-project.json, git errors) defaults to `PACKAGE_CHANGED=TRUE`, so a build never silently skips work it should have done.

# flags.out.summary

Output dotenv file path.

# examples

- <%= config.bin %> <%= command.id %> --out changes.env
