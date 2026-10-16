# summary

Install the LWC Jest test libraries and run the project's LWC Jest tests with coverage.

# description

Installs `@salesforce/sfdx-lwc-jest`, `@sa11y/jest`, and `jest-junit`, then runs `sfdx-lwc-jest --coverage -- --passWithNoTests` with the `jest-junit` reporter added to any reporters the project's own Jest config sets, writing a JUnit report to `./test-results/lwc/test-result.xml` for the pipeline to upload as an artifact. By default failures are logged, not thrown, so they don't fail the pipeline; pass `--lwc-jest-fail-on-test-failure` to make them exit non-zero.

# flags.lwc-jest-fail-on-test-failure.summary

Exit non-zero when the LWC Jest tests (or their install) fail, failing the pipeline. By default failures are only logged.

# examples

- <%= config.bin %> <%= command.id %>

- Fail the pipeline when a test fails:

  <%= config.bin %> <%= command.id %> --lwc-jest-fail-on-test-failure
