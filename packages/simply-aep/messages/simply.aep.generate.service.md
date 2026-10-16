# summary

Generate a service facade, interface, implementation, exception, and test, and its AT4DX binding.

# description

Scaffolds a service named from --service-basename into --output-dir — `--service-basename Billing` gives BillingService, IBillingService, BillingServiceImpl, BillingServiceException, and BillingServiceTest — with their -meta.xml files. With --flavor at4dx it also writes the ApplicationFactory_ServiceBinding record mapping the interface to the implementation.

A service isn't tied to an SObject, so nothing is described and no org is needed. The generated -meta.xml files declare --api-version, else the version of --target-org if one is given, else 60.0.

# flags.service-basename.summary

Base name for the generated classes, used as given (not pluralized).

# examples

- Generate an AT4DX service without an org:

  <%= config.bin %> <%= command.id %> --service-basename LimitMonitors --flavor at4dx --api-version 62.0

- Generate an fflib service at a connected org's API version:

  <%= config.bin %> <%= command.id %> --target-org myOrg --service-basename Billing --flavor fflib
