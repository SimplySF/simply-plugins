# flags.config.summary

Path to the release configuration file. Defaults to config/release.json or release.json, searched for from the current directory up to the repository root.

# flags.base-branch.summary

Branch to start from. Defaults to productionBranch in the release configuration, which defaults to environment/production.

# flags.remote.summary

Remote to fetch from and push to.

# flags.dry-run.summary

Print the plan without changing anything.

# flags.no-prompt.summary

Don't ask for anything. Values that would be asked for must then be passed as flags.

# flags.vcs-provider.summary

VCS platform for the merge request. Defaults to SIMPLY_VCS_PROVIDER, then vcs.provider in .sfdevrc.json, then gitlab.

# flags.vcs-host.summary

VCS hostname, for a self-hosted instance. Defaults to SIMPLY_VCS_HOST, then vcs.host in .sfdevrc.json.

# flags.vcs-project-id.summary

GitLab project ID or GitHub owner/repo. Defaults to SIMPLY_VCS_PROJECT_ID, then vcs.projectId in .sfdevrc.json.

# flags.vcs-token.summary

VCS API token for the merge request.

# prompt.other

Other (type a name)
