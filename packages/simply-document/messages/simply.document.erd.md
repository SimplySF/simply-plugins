# summary

Generate Mermaid entity relationship diagrams for a Salesforce project.

# description

Scan a Salesforce DX source directory and write Markdown with Mermaid ER diagrams showing objects and Lookup, Master-Detail, and Hierarchy relationships, without field attributes. Paste each block into Gliffy via Create from code → Mermaid, then use the diagram in Confluence.

Standard relationships such as Contact → Account aren't in DX source and aren't shown. Referenced objects outside the project are included; objects with no relationships are listed separately. Custom settings, custom metadata types, and platform events are excluded.

Above --max-objects connected in-project objects, split into clusters. External and unrelated objects do not count toward the limit. Hub objects do not join clusters when splitting and can appear in several diagrams. The default hub is User; giving --hub replaces that default, so use --hub User --hub Account to keep both. Clusters that still exceed the limit are written with a warning.

# flags.directory.summary

Salesforce project source directory to scan.

# flags.output-file.summary

Path to write the generated Markdown to (overwrites existing files).

# flags.max-objects.summary

Maximum connected in-project objects before splitting into clusters.

# flags.hub.summary

Object API names (matched case-insensitively) that do not join clusters when splitting (replaces the User default).

# flags.title.summary

Title for the generated document (default: the name in sfdx-project.json, else the directory name).

# examples

- <%= config.bin %> <%= command.id %> --directory force-app --output-file erd.md

- <%= config.bin %> <%= command.id %> --directory force-app --output-file erd.md --max-objects 25 --hub User --hub Account

- <%= config.bin %> <%= command.id %> --directory force-app --output-file erd.md --title "Billing data model"

# info.wrote

Wrote %s diagram(s) to %s.

# info.noRelationships

No relationships found; wrote the object list to %s.

# info.noObjects

No objects found; wrote an empty document to %s.

# warning.unknownHub

Hub object(s) not found in the project or its relationships and ignored: %s

# warning.oversized

%s has %s in-project objects, more than --max-objects (%s). Add a --hub to split it further.

# warning.skippedFields

Skipped %s relationship field(s) with no referenceTo: %s
