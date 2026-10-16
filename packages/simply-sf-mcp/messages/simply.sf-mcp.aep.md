# simply_aep_binding_list

List the AT4DX Application Factory bindings (Service, Selector, Domain and Unit of Work custom metadata) and which record wins for each key.

Use this to answer "which class does `Application.Service.newInstance(IAccountsService.class)` return?" or "which selector is used for Account?". Each item has the binding type, the key (the interface or SObject), the bound class in `to`, its priority or sequence, and `effective`, which is true for the record AT4DX actually resolves to. A Domain key with more than one candidate is marked `ambiguous`.

Read local source by passing `source_dir` (for example `force-app`), or read an org with `target_org`. With neither, the project's default org is read. Narrow with `type` and `effective_only`. Run `simply_aep_binding_validate` to find wiring problems.

# simply_aep_binding_validate

Check the AT4DX Application Factory bindings for wiring problems: two Domain or Unit of Work bindings for one SObject, two bindings to the same class, colliding sequences, duplicate developer names, SObject references that are missing or ambiguous, and Domain bindings whose SObject has no trigger.

Each issue has a `severity` (`error` for a real bug, `warning` for a likely one), the `rule` it broke and a `message`. Use it after changing binding custom metadata, or to explain why AT4DX resolves the wrong class. Pass `source_dir` to check local source or `target_org` to check an org; with neither, the project's default org is checked.

# simply_aep_domain_process_binding_list

List the AT4DX Trigger Action Framework bindings (`DomainProcessBinding__mdt`): the criteria and action classes run for each SObject's trigger events or domain method tokens, in execution order.

Use this to see what runs when, for example, an Account is inserted. Items carry the SObject, the trigger operation or domain method token, the type (Criteria or Action), the order, the class, and whether the binding is active or asynchronous. `orderCollision` marks two active bindings that share an order. Filter with `sobject` and `active_only`. Pass `source_dir` for local source or `target_org` for an org; with neither, the project's default org is read.

# simply_aep_domain_process_binding_validate

Check the AT4DX Trigger Action Framework bindings for wiring problems: active bindings that share an order, a missing trigger operation or domain method token, duplicate developer names, and SObject references that are missing or ambiguous.

With `sobject`, the issues about those SObjects come first, followed by issues that affect the whole scan. Each issue has a `severity`, a `rule` and a `message`. Pass `source_dir` for local source or `target_org` for an org; with neither, the project's default org is checked.

# simply_aep_field_set_inclusion_list

List the AT4DX selector field set inclusions (`SelectorConfig_FieldSetInclusion__mdt`): which field sets are added to each SObject's selector.

Every active record contributes its field set; there is no winner to resolve. Use this to find out why a selector queries a field. Pass `source_dir` for local source or `target_org` for an org; with neither, the project's default org is read.

# simply_aep_field_set_inclusion_validate

Check the AT4DX selector field set inclusions for wiring problems: the same field set included twice for an SObject, duplicate developer names, and SObject references that are missing or ambiguous.

Each issue has a `severity`, a `rule` and a `message`. Pass `source_dir` for local source or `target_org` for an org; with neither, the project's default org is checked.

# simply_aep_platform_event_subscription_list

List the AT4DX Platform Event Distributor subscriptions (`PlatformEvents_Subscription__mdt`), sorted by event bus, then category, then name.

Every active subscription that matches an event is invoked; there is no winner to resolve. Use this to find which consumer classes run for a platform event. Pass `source_dir` for local source or `target_org` for an org; with neither, the project's default org is read.

# simply_aep_platform_event_subscription_validate

Check the AT4DX Platform Event Distributor subscriptions for wiring problems, several of which fail silently at run time: a missing event bus or consumer, a matcher rule without the field it matches on, subscriptions that can never be reached, an event bus that lacks the fields the distributor needs, and duplicate consumers or developer names.

Each issue has a `severity`, a `rule` and a `message`. Pass `source_dir` for local source or `target_org` for an org; with neither, the project's default org is checked.

# error.targetOrgAndSourceDir

Pass either target_org or source_dir, not both.

# error.localScanFailed

Failed to scan the project directory: %s

# error.binding.notDetected

AT4DX doesn't appear to be present in this source: none of the Application Factory binding Custom Metadata Types were found.

# error.binding.orgQueryFailed

Failed to query bindings from the org: %s

# error.domainProcessBinding.notDetected

AT4DX's Trigger Action Framework doesn't appear to be present in this source: the DomainProcessBinding__mdt Custom Metadata Type wasn't found.

# error.domainProcessBinding.orgQueryFailed

Failed to query bindings from the org: %s

# error.fieldSetInclusion.notDetected

AT4DX doesn't appear to be present in this source: the SelectorConfig_FieldSetInclusion__mdt Custom Metadata Type wasn't found.

# error.fieldSetInclusion.orgQueryFailed

Failed to query field set inclusions from the org: %s

# error.platformEventSubscription.notDetected

AT4DX doesn't appear to be present in this source: the PlatformEvents_Subscription__mdt Custom Metadata Type wasn't found.

# error.platformEventSubscription.orgQueryFailed

Failed to query platform event subscriptions from the org: %s
