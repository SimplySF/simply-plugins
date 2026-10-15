# summary

Generate an AT4DX unit-of-work binding for an SObject, or print the fflib Application entry to add.

# description

With --flavor at4dx, writes the ApplicationFactory_UnitOfWorkBinding record registering --sobject with the Unit of Work at --sequence. With --flavor fflib nothing is written, since fflib has no unit-of-work binding: the command prints the Application.UnitOfWorkFactory entry to add by hand, and returns it as manualSteps.

Two unit-of-work bindings can't share a sequence or an SObject, so a run that would introduce either fails validation unless you pass --force.

# flags.sequence.summary

BindingSequence__c: where the SObject falls in the commit order, lower first. Defaults to 1000.

# examples

- Register Account with the AT4DX Unit of Work:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --flavor at4dx --sequence 1000

- Print the fflib Application entry for Account:

  <%= config.bin %> <%= command.id %> --target-org myOrg --sobject Account --flavor fflib
