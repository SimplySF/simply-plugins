# summary

Generate a domain class, its interface, test, and trigger, and its AT4DX binding for an SObject.

# description

Describes --sobject in --target-org and scaffolds the domain into --output-dir: the implementation, its interface, a unit test, the trigger that hands every event to fflib_SObjectDomain.triggerHandler, and their -meta.xml files. With --flavor at4dx it also writes the ApplicationFactory_DomainBinding record.

An SObject can have only one Domain binding, so generating one where the project already has one fails validation; pass --force to write it anyway. See `simply aep generate --help` for the full --force and --overwrite rules.

# examples

- Generate an AT4DX domain for Account:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --flavor at4dx

- Preview the files without writing them:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --flavor at4dx --dry-run
