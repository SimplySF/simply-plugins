/*
 * Copyright (c) 2026, SimplySF.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Messages } from '@salesforce/core';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import {
  applicationsForTeam,
  findReleaseTeam,
  listStagingBaseBranches,
  loadReleaseConfig,
  stageReleaseBranch,
  type HappySoupReleaseConfig,
  type ReleaseTeam,
  type StageReleaseBranchResult,
} from '@simplysf/simply-cicd-core';
import { select, spinner, text, type SelectOption } from '@simplysf/simply-plugin-kit';
import { canPrompt, OTHER, releaseConfigFlags, repositoryRoot } from '../../../../../common/happySoup/flags.js';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.happy-soup.release.stage');
const shared = Messages.loadMessages('@simplysf/simply-cicd', 'simply.cicd.happy-soup');

export type HappySoupReleaseStageResult = StageReleaseBranchResult;

/** Starts a `<team>/<app>/<name>` staging branch for work headed into a happy-soup release. */
export default class HappySoupReleaseStage extends SfCommand<HappySoupReleaseStageResult> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly enableJsonFlag = true;

  public static readonly flags = {
    ...SfCommand.baseFlags,
    team: Flags.string({ summary: messages.getMessage('flags.team.summary') }),
    app: Flags.string({ char: 'a', summary: messages.getMessage('flags.app.summary') }),
    name: Flags.string({ char: 'n', summary: messages.getMessage('flags.name.summary') }),
    ...releaseConfigFlags,
  };

  public async run(): Promise<HappySoupReleaseStageResult> {
    const { flags } = await this.parse(HappySoupReleaseStage);
    const interactive = canPrompt(flags['no-prompt'], this.jsonEnabled());

    if (!interactive) {
      const missing = (['team', 'app', 'name'] as const).filter((flag) => !flags[flag]).map((flag) => `--${flag}`);
      if (missing.length > 0) {
        this.error(messages.getMessage('error.flagsRequired', [missing.join(', ')]));
      }
    }

    const { config } = loadReleaseConfig({ configPath: flags.config, stopAt: await repositoryRoot() });

    const team = flags.team ? this.resolveTeam(config, flags.team) : await this.promptForTeam(config);
    const app = flags.app ?? (await this.promptForApp(applicationsForTeam(config, team.config)));
    const name = flags.name ?? (await this.promptForName());
    const baseBranch =
      flags['base-branch'] ??
      (interactive ? await this.promptForBase(config.productionBranch, flags.remote) : config.productionBranch);

    const result = await spinner(
      {
        message: messages.getMessage('spinner.working'),
        doneMessage: (staged: StageReleaseBranchResult) =>
          messages.getMessage('spinner.done', [staged.branch, staged.status]),
        enabled: interactive,
      },
      () =>
        stageReleaseBranch({
          team: team.name,
          app,
          name,
          baseBranch,
          remote: flags.remote,
          dryRun: flags['dry-run'],
        }),
    );

    for (const warning of result.warnings) {
      this.warn(warning);
    }
    this.table({
      title: messages.getMessage('tableTitle'),
      data: [
        { field: 'Branch', value: result.branch },
        { field: 'Base', value: result.base },
        { field: 'Status', value: result.status },
      ],
    });
    return result;
  }

  /** A configured team's own spelling when the name matches one, ignoring case; otherwise the name as typed. */
  // eslint-disable-next-line class-methods-use-this
  protected resolveTeam(config: HappySoupReleaseConfig, name: string): { name: string; config?: ReleaseTeam } {
    const configured = findReleaseTeam(config, name);
    return configured ? { name: configured.name, config: configured } : { name };
  }

  protected async promptForTeam(config: HappySoupReleaseConfig): Promise<{ name: string; config?: ReleaseTeam }> {
    const picked = await this.pickOrType(
      messages.getMessage('prompt.team'),
      config.teams.map((team) => ({ value: team.name, label: team.label ?? team.name })),
      messages.getMessage('prompt.teamName'),
    );
    return this.resolveTeam(config, picked);
  }

  protected async promptForApp(applications: ReturnType<typeof applicationsForTeam>): Promise<string> {
    return this.pickOrType(
      messages.getMessage('prompt.app'),
      applications.map((app) => ({ value: app.name, label: app.label ?? app.name, hint: app.description })),
      messages.getMessage('prompt.appName'),
    );
  }

  // eslint-disable-next-line class-methods-use-this -- kept as a method so tests can stub the prompt
  protected async promptForName(): Promise<string> {
    return text({ message: messages.getMessage('prompt.name'), placeholder: 'PROJ-1058' });
  }

  protected async promptForBase(productionBranch: string, remote: string): Promise<string> {
    // Only reached when interactive, so the spinner is always drawn here.
    const branches = await spinner(
      {
        message: messages.getMessage('spinner.listingBranches', [remote]),
        doneMessage: messages.getMessage('spinner.listedBranches', [remote]),
      },
      () => listStagingBaseBranches({ remote, productionBranch }),
    );
    const choices = branches.length > 0 ? branches : [productionBranch];
    return this.pickOrType(
      messages.getMessage('prompt.base'),
      choices.map((branch) => ({ value: branch, label: branch })),
      messages.getMessage('prompt.baseName'),
    );
  }

  /** A list ending in "Other", which asks for a name. With nothing configured, it asks straight away. */
  // eslint-disable-next-line class-methods-use-this
  protected async pickOrType(
    message: string,
    options: Array<SelectOption<string>>,
    typeMessage: string,
  ): Promise<string> {
    if (options.length > 0) {
      const picked = await select({
        message,
        options: [...options, { value: OTHER, label: shared.getMessage('prompt.other') }],
        maxItems: 10,
      });
      if (picked !== OTHER) {
        return picked;
      }
    }
    return text({ message: typeMessage });
  }
}
