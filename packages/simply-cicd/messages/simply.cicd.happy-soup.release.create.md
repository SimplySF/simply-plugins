# summary

Open a dated happy-soup release: create release/YYYY-MM-DD with its deployment files, push it, and open a draft merge request.

# description

Run this from a local clone of a happy-soup repository. It creates `release/<date>` from the remote's copy of the production branch (`productionBranch` in `config/release.json`, by default `environment/production`), without checking out or pulling any other branch, and checks it out.

It then copies the deployment steps template to `deployment-steps/<date>.md` and the deployment configs template to `deployment-configs/<date>.json`, which is the file the `simply cicd deploy happy-soup` stages use for this branch, and commits both in one commit. The templates are read from the base branch, from the paths `deploymentStepsTemplate` and `deploymentConfigsTemplate` in `config/release.json` (by default `xdocs/deployment-steps-template.md` and `xdocs/deployment-configs-template.json`). A template that doesn't exist is skipped and reported. A deployment file that already exists on the base branch is left alone.

Finally, it pushes the branch and opens a draft merge request back into the base branch, unless `--no-push` or `--no-merge-request`. The merge request needs a token, from `--vcs-token` or `SIMPLY_VCS_TOKEN`, and a project ID, from `--vcs-project-id`, `SIMPLY_VCS_PROJECT_ID`, or `vcs.projectId` in `.sfdevrc.json`. These are checked before anything changes.

A working tree with uncommitted changes is refused. Nothing is ever force-checked-out, reset, or force-pushed, and your repository's commit hooks always run. If a hook rejects the commit, nothing is pushed and the files stay staged: commit them, push the branch, and run this command again to open the merge request.

If the branch is already on the remote, nothing is created: it is checked out (a local copy that is only behind is fast-forwarded), and the merge request is opened if it's missing.

# flags.date.summary

Release date, in YYYY-MM-DD form. Asked for when omitted in a terminal.

# flags.message.summary

Commit message template for the deployment files, with an optional {DATE} placeholder. Defaults to "chore: set up release {DATE}".

# flags.no-push.summary

Create and commit the branch locally only. Implies --no-merge-request.

# flags.no-merge-request.summary

Push the branch without opening a draft merge request.

# error.dateRequired

Pass --date with the release date, in YYYY-MM-DD form.

# prompt.date

What is the release date (YYYY-MM-DD)?

# tableTitle

Release branch

# examples

- Open the release for 19 October 2026:

  <%= config.bin %> <%= command.id %> --date 2026-10-19

- See what would happen, without changing anything:

  <%= config.bin %> <%= command.id %> --date 2026-10-19 --dry-run

- Ask for the date:

  <%= config.bin %> <%= command.id %>

- Create the branch and its files, but push and open the merge request yourself:

  <%= config.bin %> <%= command.id %> --date 2026-10-19 --no-push

- Use a commit message your repository's rules accept:

  <%= config.bin %> <%= command.id %> --date 2026-10-19 --message "chore: PROJ-123 set up release {DATE}"

# spinner.working

Creating the release branch

# spinner.done

Release branch %s: %s
