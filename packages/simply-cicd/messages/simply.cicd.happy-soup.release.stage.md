# summary

Start a staging branch, <team>/<app>/<name>, for work headed into a happy-soup release.

# description

Run this from a local clone of a happy-soup repository. It creates `<team>/<app>/<name>`, such as `platform/core/PROJ-1058`, from the remote's copy of the base branch, without checking out or pulling any other branch, and checks it out. The branch isn't pushed.

In a terminal, anything you leave out is asked for. The teams, and each team's applications, come from `config/release.json`. A team with no applications of its own offers the file's top-level `applications`. Each list ends with "Other", for a name that isn't configured. The base branches offered are the remote's `environment/*` and `release/*` branches, with `productionBranch` first. Without prompts, `--team`, `--app`, and `--name` are required, and the base defaults to `productionBranch` (by default `environment/production`).

`--team` matches a configured team ignoring case. Each part of the name must be a single valid git branch component: no `/`, spaces, `..`, or the other characters git refuses.

A working tree with uncommitted changes is refused. If the branch already exists, on the remote or only locally, it is checked out instead of created.

# flags.team.summary

Team, the first part of the branch name. Asked for when omitted in a terminal.

# flags.app.summary

Application, the second part of the branch name. Asked for when omitted in a terminal.

# flags.name.summary

Release name or ticket, the last part of the branch name, such as PROJ-1058. Asked for when omitted in a terminal.

# error.flagsRequired

Pass %s, or run this in a terminal to be asked.

# prompt.team

Which team is this for?

# prompt.teamName

What is the team name?

# prompt.app

Which application is this for?

# prompt.appName

What is the application name?

# prompt.name

What is the release name or ticket?

# prompt.base

Which branch do you want to stage from?

# prompt.baseName

What is the branch name?

# tableTitle

Staging branch

# examples

- Start platform/core/PROJ-1058 from the production branch:

  <%= config.bin %> <%= command.id %> --team platform --app core --name PROJ-1058

- Stage from a release branch instead:

  <%= config.bin %> <%= command.id %> --team platform --app core --name PROJ-1058 --base-branch release/2026-10-19

- Pick the team, application, and base branch from lists:

  <%= config.bin %> <%= command.id %>

# spinner.listingBranches

Fetching branches from %s

# spinner.listedBranches

Fetched branches from %s

# spinner.working

Staging the release branch

# spinner.done

Release branch %s: %s
