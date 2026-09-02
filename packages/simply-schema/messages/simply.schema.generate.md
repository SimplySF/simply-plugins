# summary

Generate Salesforce CustomObject/CustomField/RecordType metadata from a CSV or Excel schema definition file.

# description

Reads a flat CSV or an Excel workbook describing one or more custom objects, their fields, and (CSV only) their record types, and writes Salesforce DX source-format metadata (`.object-meta.xml`, `.field-meta.xml`, `.recordType-meta.xml`) into `--output-dir`.

For CSV input, each row's `Type` column (`CustomObject`, `CustomField`, or `RecordType`) and `ObjectName` column group the rows by object. For Excel input (`.xlsx`/`.xls`), the workbook must contain an `object` worksheet (a two-column key/value sheet describing the sObject) and a `fields` worksheet (one row per field); picklist fields may reference an additional values worksheet by name.

# flags.file.summary

Path to the CSV or Excel (.xlsx/.xls) schema definition file.

# flags.file.description

A `.csv` file processed as the flat CSV flow, or a `.xlsx`/`.xls` file processed as the Excel flow.

# flags.output-dir.summary

The output directory to write the generated metadata into.

# examples

- <%= config.bin %> <%= command.id %> --file schema.csv --output-dir force-app/main/default/objects

- <%= config.bin %> <%= command.id %> --file MyObject__c.xlsx --output-dir force-app/main/default/objects

# error.missingObjectWorksheet

Missing or invalid 'object' worksheet/data in the Excel workbook.

# error.generationFailed

Failed to generate metadata: %s

# error.readFileFailed

Failed to read CSV file: %s

# error.parseCsvFailed

Failed to parse CSV: %s

# error.objectGenerationFailed

Failed to generate metadata for %s: %s

# info.readingExcelFile

Reading Excel file from %s...

# info.readingCsvFile

Reading CSV file from %s...

# info.foundObjects

Found %s object(s) to process.

# info.generatingObject

Generating metadata for %s...

# info.complete

Generated %s object(s), %s field(s), and %s record type(s) in %s

# warning.noCustomObjectRow

Skipping object %s as no 'CustomObject' type row was found.
