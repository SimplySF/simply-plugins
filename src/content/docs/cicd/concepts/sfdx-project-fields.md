---
title: sfdx-project.json fields simply-cicd reads
description: The extra sfdx-project.json fields the build commands read beyond standard dependencies — definitionFile, packageMetadataAccess, seedMetadata.path, and the coverage-requirement override.
---

Beyond the dependencies every `install-packaged`/`install-dependencies` command installs (`packageDirectories[].dependencies`, standard `sfdx-project.json`), a handful of `build *` commands read a few extra fields. The package-directory-level ones all belong on the **default** package directory — the entry with `"default": true`.

```json
{
  "packageDirectories": [
    {
      "path": "force-app",
      "default": true,
      "package": "MyPackage",
      "versionNumber": "1.0.0.NEXT",
      "definitionFile": "config/project-scratch-def.json",
      "seedMetadata": {
        "path": "seed-data"
      },
      "packageMetadataAccess": {
        "permissionSets": ["My_Permission_Set"],
        "permissionSetLicenses": ["MyPackage_License"]
      }
    }
  ],
  "plugins": {
    "simply": {
      "coverageRequirement": {
        "minimumCoverageRequired": "80"
      }
    }
  }
}
```

- **`definitionFile`** — the scratch org definition file [`build create-scratch`](/cicd/reference/build/) creates the org from. Falls back to `--scratch-definition-file` if omitted here; required (along with `package`) for [`build create-package-version`](/cicd/reference/build/) to know what to version.
- **`packageMetadataAccess.permissionSets`** / **`packageMetadataAccess.permissionSetLicenses`** — assigned to the scratch org's default user right after creation, by `build create-scratch`. Both are optional and independent — set either, both, or neither.
- **`seedMetadata.path`** — an extra source directory `build push-scratch` deploys alongside the default package directory. Only pushed when the stage is also given `--scratch-org-source-dir`; the field by itself doesn't trigger anything (see [Scratch org build lifecycle](/cicd/guides/scratch-org-lifecycle/)).
- **`plugins.simply.coverageRequirement.minimumCoverageRequired`** — overrides `create-package-version`'s `--code-coverage-minimum` default of `75`. A string, not a number, matching the rest of `sfdx-project.json`'s convention for numeric-looking values nested under `plugins`.

None of these fields are required to use `simply-cicd` — every command falls back to a CLI flag or a hardcoded default when they're absent. They exist so a value that's really a property of the project (which permission sets a scratch org needs, what coverage bar the package must clear) can live in source control next to the project it describes, instead of being repeated across pipeline YAML.
