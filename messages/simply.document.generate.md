# summary

Generate a technical design document for a Salesforce project.

# description

Scans a Salesforce DX project's source directory for metadata (objects, fields, Apex, Lightning components, flows, permissions, and more) and renders a Confluence-storage-format technical design document covering the data model, security model, groups/queues/permissions, solution inventory, and custom code inventory.

# flags.directory.summary

Salesforce project source directory to scan.

# flags.output-file.summary

Path to write the generated document to.

# examples

- <%= config.bin %> <%= command.id %> --directory force-app --output-file technical-design-document.html

# error.scanFailed

Failed to scan the project directory: %s

# info.scanningProject

Scanning Salesforce project directory...

# info.mappingObjects

Processing and mapping custom/standard objects...

# info.renderingDocument

Rendering technical design document...

# info.complete

Technical design document written to %s
