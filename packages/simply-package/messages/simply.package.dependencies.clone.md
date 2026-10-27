# summary

Git-clone the source repositories of a Salesforce project's package dependencies.

# description

Clones each package dependency declared in sfdx-project.json whose source repository is given under plugins.simply.packages, so you can review the metadata the project depends on. Nothing is installed in an org.

Each plugins.simply.packages entry is keyed by package alias. Its "repository" gives a git "url", plus an optional "ref" (branch, tag, or commit SHA) and "path" (the subdirectory holding the repository's own sfdx-project.json). A key matches a dependency's "package" value exactly, or up to its first "@", so a key such as "fflib" keeps matching as the dependency moves from "fflib@3.0.0-1" to "fflib@3.1.0-2". A key also matches through packageAliases: a dependency written as a bare ID (0Ho… or 04t…) matches the key of any alias, or alias prefix, that packageAliases maps to that ID.

The command runs your own git, so any host works (GitHub, GitLab, self-hosted servers) with the SSH keys or credential helper you already use. A url that contains credentials is rejected. Dependencies with no mapping, such as AppExchange packages, are reported as "No repository".

Each repository is cloned into a folder named after it, next to the project by default. A folder that already holds a clone of the same repository is reused.

With --recursive, your own plugins.simply.packages entries always come first. A dependency's sfdx-project.json can supply a repository only for a package you don't map, and only as an https or ssh URL. Each repository that comes from one is named in the output.

Cloning runs nothing from the repositories: no install scripts, no git hooks, and no submodules. Treat the clones as untrusted code until you've reviewed them. Opening one in an editor that trusts the folder, running npm install or its scripts, or deploying its metadata can run code it contains.

# flags.output-dir.summary

Directory to clone into, relative to the project root.

# flags.output-dir.description

Each repository goes into "<output-dir>/<repository name>". The default, "..", puts clones next to the project. When two different repositories share a name, the second folder is prefixed with its group or owner.

# flags.recursive.summary

Also clone the dependencies of each dependency, following each clone's own sfdx-project.json.

# flags.depth.summary

Create shallow clones with this many commits of history.

# flags.depth.description

Passed to "git clone --depth". A dependency pinned to a commit SHA always gets a full clone, because a shallow clone can't check out an arbitrary commit.

# flags.update.summary

Fetch and update repositories that are already cloned.

# flags.update.description

A clone on the configured branch is fast-forwarded, and a clone at a detached HEAD (after a tag or SHA) is checked out at the configured ref. A clone with uncommitted changes, or on some other branch, is left alone and reported as skipped, because it may be your own working copy. A clone that follows a branch, including the default branch when no "ref" is set, gets that branch's newest commits; set "ref" to a tag to stay on one version.

# flags.dry-run.summary

Show what would be cloned, without running git.

# info.noDependencies

The project declares no package dependencies.

# examples

- Clone the direct dependencies of the project in the current directory, next to it:

  <%= config.bin %> <%= command.id %>

- Clone every dependency, including dependencies of dependencies, as shallow clones into a "deps" folder:

  <%= config.bin %> <%= command.id %> --recursive --depth 1 --output-dir ../deps

- Bring existing clones up to date with their configured refs:

  <%= config.bin %> <%= command.id %> --update

- Preview what would be cloned:

  <%= config.bin %> <%= command.id %> --recursive --dry-run
