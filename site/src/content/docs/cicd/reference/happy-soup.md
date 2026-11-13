---
title: 'Happy Soup — Release Branches'
description: 'Command reference for the developer commands that open and stage happy-soup releases.'
---

## `sf simply cicd happy-soup release create`

Open a dated happy-soup release: create release/YYYY-MM-DD with its deployment files, push it, and open a draft merge request.

```
USAGE
  $ sf simply cicd happy-soup release create [--json] [--flags-dir <value>] [-d <value>] [-c <value>] [-b <value>] [--remote <value>]
    [--dry-run] [--no-prompt] [--message <value>] [--no-push] [--no-merge-request] [--vcs-provider github|gitlab]
    [--vcs-host <value>] [--vcs-project-id <value>] [--vcs-token <value>]

FLAGS
  -b, --base-branch=<value>     Branch to start from. Defaults to productionBranch in the release configuration, which
                                defaults to environment/production.
  -c, --config=<value>          Path to the release configuration file. Defaults to config/release.json or release.json,
                                searched for from the current directory up to the repository root.
  -d, --date=<value>            Release date, in YYYY-MM-DD form. Asked for when omitted in a terminal.
      --dry-run                 Print the plan without changing anything.
      --message=<value>         Commit message template for the deployment files, with an optional {DATE} placeholder.
                                Defaults to "chore: set up release {DATE}".
      --no-merge-request        Push the branch without opening a draft merge request.
      --no-prompt               Don't ask for anything. Values that would be asked for must then be passed as flags.
      --no-push                 Create and commit the branch locally only. Implies --no-merge-request.
      --remote=<value>          [default: origin] Remote to fetch from and push to.
      --vcs-host=<value>        VCS hostname, for a self-hosted instance. Defaults to SIMPLY_VCS_HOST, then vcs.host in
                                .sfdevrc.json.
      --vcs-project-id=<value>  GitLab project ID or GitHub owner/repo. Defaults to SIMPLY_VCS_PROJECT_ID, then
                                vcs.projectId in .sfdevrc.json.
      --vcs-provider=<option>   VCS platform for the merge request. Defaults to SIMPLY_VCS_PROVIDER, then vcs.provider
                                in .sfdevrc.json, then gitlab.
                                <options: github|gitlab>
      --vcs-token=<value>       [env: SIMPLY_VCS_TOKEN] VCS API token for the merge request.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Open a dated happy-soup release: create release/YYYY-MM-DD with its deployment files, push it, and open a draft merge
  request.

  Run this from a local clone of a happy-soup repository. It creates `release/<date>` from the remote's copy of the
  production branch (`productionBranch` in `config/release.json`, by default `environment/production`), without checking
  out or pulling any other branch, and checks it out.

  It then copies the deployment steps template to `deployment-steps/<date>.md` and the deployment configs template to
  `deployment-configs/<date>.json`, which is the file the `simply cicd deploy happy-soup` stages use for this branch,
  and commits both in one commit. The templates are read from the base branch, from the paths `deploymentStepsTemplate`
  and `deploymentConfigsTemplate` in `config/release.json` (by default `xdocs/deployment-steps-template.md` and
  `xdocs/deployment-configs-template.json`). A template that doesn't exist is skipped and reported. A deployment file
  that already exists on the base branch is left alone.

  Finally, it pushes the branch and opens a draft merge request back into the base branch, unless `--no-push` or
  `--no-merge-request`. The merge request needs a token, from `--vcs-token` or `SIMPLY_VCS_TOKEN`, and a project ID,
  from `--vcs-project-id`, `SIMPLY_VCS_PROJECT_ID`, or `vcs.projectId` in `.sfdevrc.json`. These are checked before
  anything changes.

  A working tree with uncommitted changes is refused. Nothing is ever force-checked-out, reset, or force-pushed, and
  your repository's commit hooks always run. If a hook rejects the commit, nothing is pushed and the files stay staged:
  commit them, push the branch, and run this command again to open the merge request.

  If the branch is already on the remote, nothing is created: it is checked out (a local copy that is only behind is
  fast-forwarded), and the merge request is opened if it's missing.

EXAMPLES
  Open the release for 19 October 2026:

    $ sf simply cicd happy-soup release create --date 2026-10-19

  See what would happen, without changing anything:

    $ sf simply cicd happy-soup release create --date 2026-10-19 --dry-run

  Ask for the date:

    $ sf simply cicd happy-soup release create

  Create the branch and its files, but push and open the merge request yourself:

    $ sf simply cicd happy-soup release create --date 2026-10-19 --no-push

  Use a commit message your repository's rules accept:

    $ sf simply cicd happy-soup release create --date 2026-10-19 --message "chore: PROJ-123 set up release {DATE}"
```

_See code: [lib/commands/simply/cicd/happy-soup/release/create.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.27.0/packages/simply-cicd/lib/commands/simply/cicd/happy-soup/release/create.js)_

## `sf simply cicd happy-soup release stage`

Start a staging branch, <team>/<app>/<name>, for work headed into a happy-soup release.

```
USAGE
  $ sf simply cicd happy-soup release stage [--json] [--flags-dir <value>] [--team <value>] [-a <value>] [-n <value>] [-c <value>] [-b
    <value>] [--remote <value>] [--dry-run] [--no-prompt]

FLAGS
  -a, --app=<value>          Application, the second part of the branch name. Asked for when omitted in a terminal.
  -b, --base-branch=<value>  Branch to start from. Defaults to productionBranch in the release configuration, which
                             defaults to environment/production.
  -c, --config=<value>       Path to the release configuration file. Defaults to config/release.json or release.json,
                             searched for from the current directory up to the repository root.
  -n, --name=<value>         Release name or ticket, the last part of the branch name, such as PROJ-1058. Asked for when
                             omitted in a terminal.
      --dry-run              Print the plan without changing anything.
      --no-prompt            Don't ask for anything. Values that would be asked for must then be passed as flags.
      --remote=<value>       [default: origin] Remote to fetch from and push to.
      --team=<value>         Team, the first part of the branch name. Asked for when omitted in a terminal.

GLOBAL FLAGS
  --flags-dir=<value>  Import flag values from a directory.
  --json               Format output as json.

DESCRIPTION
  Start a staging branch, <team>/<app>/<name>, for work headed into a happy-soup release.

  Run this from a local clone of a happy-soup repository. It creates `<team>/<app>/<name>`, such as
  `platform/core/PROJ-1058`, from the remote's copy of the base branch, without checking out or pulling any other
  branch, and checks it out. The branch isn't pushed.

  In a terminal, anything you leave out is asked for. The teams, and each team's applications, come from
  `config/release.json`. A team with no applications of its own offers the file's top-level `applications`. Each list
  ends with "Other", for a name that isn't configured. The base branches offered are the remote's `environment/*` and
  `release/*` branches, with `productionBranch` first. Without prompts, `--team`, `--app`, and `--name` are required,
  and the base defaults to `productionBranch` (by default `environment/production`).

  `--team` matches a configured team ignoring case. Each part of the name must be a single valid git branch component:
  no `/`, spaces, `..`, or the other characters git refuses.

  A working tree with uncommitted changes is refused. If the branch already exists, on the remote or only locally, it is
  checked out instead of created.

EXAMPLES
  Start platform/core/PROJ-1058 from the production branch:

    $ sf simply cicd happy-soup release stage --team platform --app core --name PROJ-1058

  Stage from a release branch instead:

    $ sf simply cicd happy-soup release stage --team platform --app core --name PROJ-1058 --base-branch \
      release/2026-10-19

  Pick the team, application, and base branch from lists:

    $ sf simply cicd happy-soup release stage
```

_See code: [lib/commands/simply/cicd/happy-soup/release/stage.js](https://github.com/SimplySF/simply-plugins/blob/@simplysf/simply-cicd@0.27.0/packages/simply-cicd/lib/commands/simply/cicd/happy-soup/release/stage.js)_
