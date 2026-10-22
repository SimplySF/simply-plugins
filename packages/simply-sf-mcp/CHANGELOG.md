# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [0.2.0](https://github.com/SimplySF/simply-plugins/compare/%40simplysf%2Fsimply-sf-mcp%400.1.1...%40simplysf%2Fsimply-sf-mcp%400.2.0) (2026-10-22)

- fix(deps)!: bump @simplysf core packages to their latest versions (#101), closes [#101](https://github.com/SimplySF/simply-plugins/issues/101)

### BREAKING CHANGES

- simply-cicd's check-permission-sets now loads
  .psbuild.json files with simply-permissions-core 0.10.0, so config
  overrides must use the PermissionSet metadata names (objectPermissions,
  fieldPermissions, tabSettings, viewAllRecords, modifyAllRecords, and tab
  visibility). Files with the old names fail with a "renamed to" message,
  as they already do in simply-permissions 3.0.0.

## [0.1.1](https://github.com/SimplySF/simply-plugins/compare/%40simplysf%2Fsimply-sf-mcp%400.1.0...%40simplysf%2Fsimply-sf-mcp%400.1.1) (2026-10-19)

### Bug Fixes

- **deps:** bump @simplysf/simply-apex-core from 0.3.11 to 0.3.16 ([#88](https://github.com/SimplySF/simply-plugins/issues/88)) ([048e658](https://github.com/SimplySF/simply-plugins/commit/048e6581583fedcf3e74230674f23a59fdae7179))

# 0.1.0 (2026-10-16)

### Features

- **simply-sf-mcp:** add an MCP server over the -core libraries ([#79](https://github.com/SimplySF/simply-plugins/issues/79)) ([5f88bdd](https://github.com/SimplySF/simply-plugins/commit/5f88bdd3cf730750cfdd858250f1f1cb707bb32f))
