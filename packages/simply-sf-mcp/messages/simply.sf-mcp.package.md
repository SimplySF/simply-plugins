# simply_package_version_get

Read the version a package is declared at in the project's `sfdx-project.json`: either a dependency's version or the version the project's own package builds.

Use this when you need a version number to put in a script, a branch name or a commit message, or to check which dependency version the project pins. Pass the package name or alias in `package`. If the same package is declared at different versions in more than one package directory, pass `directory` (a package directory path as written in `sfdx-project.json`, for example `force-app`) to pick one.

This reads the local project file only. It never contacts an org or Dev Hub.

# error.notAProject

%s is not a Salesforce DX project: no sfdx-project.json was found. Start the server with --directory pointing at the project root.

# error.packageNotFound

No package named '%s' is declared in %s.

# error.noVersionFound

The package '%s' is declared in '%s', but without a version. Add a version to its alias (name@version) or a versionNumber to the dependency.

# error.ambiguousMatch

The package '%s' is declared at more than one version: %s. Use directory to choose one package directory.
