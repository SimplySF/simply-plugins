# summary

Generate selector, domain, and unit-of-work layers for an SObject in one run.

# description

Describes --sobject in --target-org once and scaffolds every layer you select (at least one of --selector, --domain, or --unit-of-work) into --output-dir, sharing --flavor and --prefix. With --flavor at4dx each layer also gets its Application Factory binding record.

Before writing, the binding records are checked against the project's package directories and --output-dir with the rules `simply aep at4dx binding validate` uses. An error-severity issue they would introduce — a second Domain binding for the same SObject, say — stops the run unless you pass --force; problems that were already there don't. Existing files stop it too unless you pass --overwrite. Nothing is written in either case.

With --flavor fflib, --unit-of-work writes no file: fflib has no unit-of-work binding, so the command prints the Application factory entry to add by hand, and returns it as manualSteps.

# flags.sequence.summary

BindingSequence__c for the unit-of-work binding (at4dx only): where the SObject falls in the commit order, lower first.

# flags.selector.summary

Generate the selector layer.

# flags.domain.summary

Generate the domain layer and its trigger.

# flags.unit-of-work.summary

Generate the unit-of-work binding (at4dx) or print the Application entry to add (fflib).

# examples

- Generate all three AT4DX layers for Account:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --flavor at4dx --selector --domain --unit-of-work

- Preview an fflib selector and domain with a class prefix, writing nothing:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Property__c --flavor fflib --prefix acme --selector --domain --dry-run
