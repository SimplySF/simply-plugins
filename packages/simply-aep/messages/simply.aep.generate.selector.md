# summary

Generate a selector class, its interface and test, and its AT4DX binding for an SObject.

# description

Describes --sobject in --target-org and scaffolds the selector into --output-dir: the implementation (selecting every filterable, non-textarea field), its interface, a unit test, and their -meta.xml files. With --flavor at4dx it also writes the ApplicationFactory_SelectorBinding record, using BindingSObject__c when EntityDefinition can reference the object and BindingSObjectAlternate__c when it can't.

The binding is checked against the project's package directories and --output-dir before anything is written; see `simply aep generate --help` for the --force and --overwrite rules.

# examples

- Generate an AT4DX selector for Account:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --flavor at4dx

- Generate an fflib selector with a class prefix:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Property__c --flavor fflib --prefix acme
