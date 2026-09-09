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

import fs from 'node:fs/promises';
import { SfCommand, Flags } from '@salesforce/sf-plugins-core';
import { requireConnection, targetOrgFlags } from '@simplysf/simply-plugin-kit';
import { AuthInfo, Connection, Messages } from '@salesforce/core';
import { Duration } from '@salesforce/kit';
import {
  installPackageDependencies,
  type InstallPackageDependenciesOptions,
  type PackageInstallApexCompileType,
  type PackageInstallSecurityType,
  type PackageInstallType,
  type PackageInstallUpgradeType,
  type PackageToInstall,
} from '@simplysf/simply-package-core';

Messages.importMessagesDirectoryFromMetaUrl(import.meta.url);
const messages = Messages.loadMessages('@simplysf/simply-package', 'simply.package.dependencies.install');

export type { PackageToInstall };

/** Matches one or more comma-separated `alias:key` pairs, as accepted by `--installation-key`. */
const installationKeyRegex = new RegExp(/^(\w+:\w+)(,\s*\w+:\w+)*/);

/** Matches a single `alias:count` pair, as accepted by `--package-retry-attempts`. */
const packageRetryAttemptsRegex = /^\w+:\d+$/;

/**
 * @param packagesToInstall - The install outcome for every resolved dependency.
 * @returns A pretty-printed JSON install report.
 */
function buildInstallReport(packagesToInstall: PackageToInstall[]): string {
  return JSON.stringify(packagesToInstall, null, 2);
}

/**
 * Installs all specified package dependencies in a Salesforce DX project using the
 * sfdx-project.json definition.
 */
export default class PackageDependenciesInstall extends SfCommand<PackageToInstall[]> {
  public static readonly summary = messages.getMessage('summary');
  public static readonly description = messages.getMessage('description');
  public static readonly examples = messages.getMessages('examples');
  public static readonly requiresProject = true;

  public static readonly flags = {
    ...SfCommand.baseFlags,
    'apex-compile': Flags.custom<PackageInstallApexCompileType>({
      options: ['all', 'package'],
    })({
      summary: messages.getMessage('flags.apex-compile.summary'),
      description: messages.getMessage('flags.apex-compile.description'),
      char: 'a',
    }),
    ...targetOrgFlags,
    branch: Flags.string({
      summary: messages.getMessage('flags.branch.summary'),
      description: messages.getMessage('flags.branch.description'),
      char: 'z',
      default: '',
    }),
    'install-type': Flags.custom<PackageInstallType>({
      options: ['All', 'Delta', 'Upgrade'],
    })({
      char: 'i',
      summary: messages.getMessage('flags.install-type.summary'),
      description: messages.getMessage('flags.install-type.description'),
      default: 'Upgrade',
    }),
    'installation-key': Flags.string({
      summary: messages.getMessage('flags.installation-key.summary'),
      description: messages.getMessage('flags.installation-key.description'),
      char: 'k',
      multiple: true,
    }),
    'no-prompt': Flags.boolean({
      summary: messages.getMessage('flags.no-prompt.summary'),
      description: messages.getMessage('flags.no-prompt.description'),
      char: 'r',
      default: false,
      required: false,
    }),
    'output-file': Flags.string({
      summary: messages.getMessage('flags.output-file.summary'),
      description: messages.getMessage('flags.output-file.description'),
    }),
    'package-retry-attempts': Flags.string({
      summary: messages.getMessage('flags.package-retry-attempts.summary'),
      description: messages.getMessage('flags.package-retry-attempts.description'),
      multiple: true,
    }),
    'publish-wait': Flags.duration({
      unit: 'minutes',
      summary: messages.getMessage('flags.publish-wait.summary'),
      char: 'b',
      default: Duration.minutes(0),
    }),
    'retry-attempts': Flags.integer({
      summary: messages.getMessage('flags.retry-attempts.summary'),
      default: 0,
      min: 0,
    }),
    'retry-backoff': Flags.integer({
      summary: messages.getMessage('flags.retry-backoff.summary'),
      default: 2,
      min: 1,
    }),
    'security-type': Flags.custom<PackageInstallSecurityType>({
      options: ['AllUsers', 'AdminsOnly'],
    })({
      char: 's',
      summary: messages.getMessage('flags.security-type.summary'),
      default: 'AdminsOnly',
    }),
    'skip-handlers': Flags.string({
      multiple: true,
      options: ['FeatureEnforcement'],
      char: 'l',
      summary: messages.getMessage('flags.skip-handlers.summary'),
      description: messages.getMessage('flags.skip-handlers.description'),
      hidden: true,
    }),
    'target-dev-hub': Flags.string({
      summary: messages.getMessage('flags.target-dev-hub.summary'),
      char: 'v',
    }),
    'upgrade-type': Flags.custom<PackageInstallUpgradeType>({
      options: ['DeprecateOnly', 'Mixed', 'Delete'],
    })({
      char: 't',
      summary: messages.getMessage('flags.upgrade-type.summary'),
      description: messages.getMessage('flags.upgrade-type.description'),
      default: 'Mixed',
    }),
    wait: Flags.duration({
      unit: 'minutes',
      char: 'w',
      summary: messages.getMessage('flags.wait.summary'),
      default: Duration.minutes(30),
    }),
  };

  /** @returns The install outcome for every resolved dependency. */
  public async run(): Promise<PackageToInstall[]> {
    const { flags } = await this.parse(PackageDependenciesInstall);

    // Authorize to the target org
    const targetOrgConnection = requireConnection(flags);

    // The Dev Hub is only needed for dependencies given as Package/VersionNumber, so it's resolved
    // lazily — the library invokes this only if such a dependency exists.
    const targetDevHub = flags['target-dev-hub'];
    const targetDevHubConnection = targetDevHub
      ? async (): Promise<Connection> => {
          const targetDevHubAuthInfo = await AuthInfo.create({ username: targetDevHub });
          const connection = await Connection.create({ authInfo: targetDevHubAuthInfo });

          if (!connection) {
            throw messages.createError('error.targetDevHubConnectionFailed');
          }

          return connection;
        }
      : undefined;

    const installationKeys = this.parseInstallationKeys(flags['installation-key']);
    const packageRetryAttempts = this.parsePackageRetryAttempts(flags['package-retry-attempts']);

    const prompts: InstallPackageDependenciesOptions['prompts'] = flags['no-prompt']
      ? undefined
      : {
          confirmUpgradeTypeDelete: () => this.confirm({ message: messages.getMessage('prompt.upgradeType') }),
          confirmEnableRss: (_packageName, externalSites) =>
            this.confirm({ message: messages.getMessage('prompt.enableRss', [externalSites.join('\n')]) }),
        };

    const packagesToInstall = await installPackageDependencies({
      project: this.project!,
      targetOrgConnection,
      targetDevHubConnection,
      branch: flags.branch,
      installType: flags['install-type'],
      installationKeys,
      apexCompile: flags['apex-compile'],
      securityType: flags['security-type'],
      upgradeType: flags['upgrade-type'],
      skipHandlers: flags['skip-handlers'],
      publishWait: flags['publish-wait'],
      wait: flags.wait,
      retryAttempts: flags['retry-attempts'],
      retryBackoff: flags['retry-backoff'],
      packageRetryAttempts,
      progress: {
        info: (message) => this.info(message),
        warn: (message) => this.warn(message),
        stepStart: (message) => this.spinner.start(message, '', { stdout: true }),
        stepStatus: (message) => {
          this.spinner.status = message;
        },
        stepStop: (message) => this.spinner.stop(message),
      },
      prompts,
    });

    // If requested, write a JSON report of the install outcome to a file alongside the normal
    // terminal output — including when there was nothing to install.
    const outputPath = flags['output-file'];
    if (outputPath) {
      await fs.writeFile(outputPath, buildInstallReport(packagesToInstall), 'utf-8');
      this.info(messages.getMessage('info.reportWritten', [outputPath]));
    }

    return packagesToInstall;
  }

  /**
   * @param values - The raw `--installation-key` values.
   * @returns Installation keys keyed by package alias or id, for the library to resolve.
   */
  private parseInstallationKeys(values: string[] | undefined): Record<string, string> {
    const installationKeys: Record<string, string> = {};

    if (!values) {
      return installationKeys;
    }

    this.spinner.start('Processing package installation keys', '', { stdout: true });
    for (let installationKey of values) {
      installationKey = installationKey.trim();

      if (!installationKeyRegex.test(installationKey)) {
        throw messages.createError('error.installationKeyFormat');
      }

      const [aliasOrId, packageInstallationKey] = installationKey.split(':');
      installationKeys[aliasOrId] = packageInstallationKey;
    }
    this.spinner.stop();

    return installationKeys;
  }

  /**
   * @param values - The raw `--package-retry-attempts` values.
   * @returns Retry-attempt overrides keyed by package alias or id, for the library to resolve.
   */
  private parsePackageRetryAttempts(values: string[] | undefined): Record<string, number> {
    const packageRetryAttempts: Record<string, number> = {};

    if (!values) {
      return packageRetryAttempts;
    }

    this.spinner.start('Processing package retry attempts', '', { stdout: true });
    for (let packageRetryAttempt of values) {
      packageRetryAttempt = packageRetryAttempt.trim();

      if (!packageRetryAttemptsRegex.test(packageRetryAttempt)) {
        throw messages.createError('error.packageRetryAttemptsFormat');
      }

      const [aliasOrId, retryAttemptsValue] = packageRetryAttempt.split(':');
      packageRetryAttempts[aliasOrId] = parseInt(retryAttemptsValue, 10);
    }
    this.spinner.stop();

    return packageRetryAttempts;
  }
}
