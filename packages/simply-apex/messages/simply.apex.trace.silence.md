# summary

Silence debug logs for specific Apex classes.

# description

Creates or updates a 24-hour CLASS_TRACING trace flag with a fully suppressed (NONE) debug level for each specified Apex class, preventing those classes from generating debug log output. If a class already has a trace flag, its expiration is extended instead of creating a duplicate.

# flags.classes.summary

Comma-separated Apex class names

# flags.classes.description

A comma-separated list of Apex class names to silence.

# flags.classes-file.summary

Path to a JSON file listing classes to silence

# flags.classes-file.description

The path to a JSON file with the shape { "classes": ["ClassOne", "ClassTwo"] } listing the Apex class names to silence.

# flags.fflib.summary

Silence fflib base classes

# flags.fflib.description

Adds fflib_SObjectDescribe and fflib_SObjectDomain to the classes to silence.

# flags.at4dx.summary

Silence at4dx base classes

# flags.at4dx.description

Adds ApplicationSObjectDomain to the classes to silence.

# flags.force-di.summary

Silence force-di base classes

# flags.force-di.description

Adds di_Binding, di_Module, di_PlatformCache, and di_Injector to the classes to silence.

# examples

- <%= config.bin %> <%= command.id %> --target-org myOrg --classes NoisyClass,ChattyTrigger

- <%= config.bin %> <%= command.id %> --target-org myOrg --classes-file classesToSilence.json

- <%= config.bin %> <%= command.id %> --target-org myOrg --fflib --at4dx --force-di

- <%= config.bin %> <%= command.id %> --target-org myOrg --classes NoisyClass --fflib

# error.noClassesSpecified

No Apex classes specified to silence. Use --classes, --classes-file, --fflib, --at4dx, and/or --force-di.

# error.invalidClassesFile

The classes file is invalid: %s

# error.debugLevelCreateFailed

Failed to create the debug level: %s

# info.checkingDebugLevel

Checking debug level...

# info.findingClasses

Finding Apex classes...

# info.creatingTraceFlags

Creating trace flags...

# warning.noClassesFound

No Apex classes found matching the provided names.

# warning.someClassesNotFound

The following classes were not found and were skipped: %s

# warning.traceFlagCreateFailed

Failed to create a trace flag for class %s: %s

# warning.traceFlagUpdateFailed

Failed to update the existing trace flag for class %s: %s
