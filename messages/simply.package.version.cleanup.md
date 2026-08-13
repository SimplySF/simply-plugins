# summary

Cleanup package versions.

# description

Delete package versions for a given package provided a MAJOR.MINOR.PATCH matcher, either to select on or to exclude on. Does not delete released package versions.

If --matcher is provided, only the unreleased versions matching MAJOR.MINOR.PATCH are deleted. If --exclude-matcher is provided instead, every unreleased version that does _not_ match MAJOR.MINOR.PATCH is deleted. Exactly one of --matcher or --exclude-matcher must be specified.

# flags.package.summary

Package Id

# flags.package.description

The 0Ht Package Id that you wish to cleanup versions for.

# flags.matcher.summary

MAJOR.MINOR.PATCH to select on

# flags.matcher.description

The MAJOR.MINOR.PATCH matcher that should be used to find package versions to delete. Only versions matching this matcher are deleted. Mutually exclusive with --exclude-matcher.

# flags.exclude-matcher.summary

MAJOR.MINOR.PATCH to exclude on

# flags.exclude-matcher.description

The MAJOR.MINOR.PATCH matcher that should be used to find package versions to keep. Every unreleased version that does not match this matcher is deleted. Mutually exclusive with --matcher.

# examples

- <%= config.bin %> <%= command.id %> --package 0Hoxx00000000CqCAI --matcher 2.10.0 --target-dev-hub myDevHub

- <%= config.bin %> <%= command.id %> --package 0Hoxx00000000CqCAI --exclude-matcher 2.10.0 --target-dev-hub myDevHub

# errors.connectionFailed

Unable to establish connection to the org.

# errors.matcherRequired

You must specify either --matcher or --exclude-matcher.

# errors.matcherFormatMismatch

The matcher must be in the format of MAJOR.MINOR.PATCH.

# errors.deletionJob

There was an unexpected error performing the deletion job.
