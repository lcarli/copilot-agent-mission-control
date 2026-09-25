import { Command } from 'commander';

import type { ParticipantAuthSession } from './auth.js';
import {
  validateParticipantConfig,
  type ParticipantConfigRepository,
} from './config.js';
import { runParticipantDiagnostics } from './diagnostics.js';
import type { ParticipantRegistrationClient } from './registration.js';
import type { ParticipantMissionWorkflow } from './workflow.js';
import { createCliLocalizer } from './translations.js';

export interface ParticipantCliDependencies {
  readonly auth: ParticipantAuthSession;
  readonly configRepository: ParticipantConfigRepository;
  readonly environmentLocale?: string;
  readonly fetch?: typeof globalThis.fetch;
  readonly registrationClient?: ParticipantRegistrationClient;
  readonly missionWorkflow?: ParticipantMissionWorkflow;
  readonly setExitCode?: (code: number) => void;
  readonly writeError?: (message: string) => void;
  readonly writeOutput?: (message: string) => void;
}

export function createParticipantProgram(
  dependencies: ParticipantCliDependencies,
): Command {
  const writeOutput = dependencies.writeOutput ?? console.log;
  const writeError = dependencies.writeError ?? console.error;
  const setExitCode =
    dependencies.setExitCode ??
    ((code: number) => {
      process.exitCode = code;
    });
  const program = new Command()
    .name('mission-control')
    .description('Copilot Agent Mission Control participant CLI')
    .version('0.0.0')
    .showHelpAfterError()
    .configureOutput({
      writeErr: (text) => {
        writeError(text.trimEnd());
      },
      writeOut: (text) => {
        writeOutput(text.trimEnd());
      },
    });

  const configCommand = program
    .command('config')
    .description('Manage CLI configuration');
  configCommand
    .command('set')
    .option('--api-url <url>')
    .option('--locale <locale>')
    .action(async (options: { apiUrl?: string; locale?: string }) => {
      const current = await dependencies.configRepository.load();
      const apiUrl = options.apiUrl ?? current?.apiUrl;
      const locale =
        options.locale ?? current?.locale ?? dependencies.environmentLocale;
      if (apiUrl === undefined || locale === undefined) {
        throw new Error('config-invalid');
      }
      const config = validateParticipantConfig({
        apiUrl,
        locale,
        schemaVersion: 1,
      });
      await dependencies.configRepository.save(config);
      const t = createCliLocalizer(config.locale);
      writeOutput(t('config.saved'));
    });

  configCommand.command('show').action(async () => {
    const config = await dependencies.configRepository.load();
    const t = createCliLocalizer(
      config?.locale ?? dependencies.environmentLocale,
    );
    if (config === undefined) {
      writeOutput(t('config.missing'));
      return;
    }
    writeOutput(JSON.stringify(config, undefined, 2));
  });

  program
    .command('auth')
    .description('Show participant authentication status')
    .action(() => {
      const status = dependencies.auth.status();
      const t = createCliLocalizer(dependencies.environmentLocale);
      writeOutput(
        t(status.authenticated ? 'auth.available' : 'auth.unavailable'),
      );
    });

  const mission = program
    .command('mission')
    .description('Run mission workflows');
  const requireWorkflow = (): ParticipantMissionWorkflow => {
    if (dependencies.missionWorkflow === undefined) {
      throw new Error('mission-workflow-unavailable');
    }
    return dependencies.missionWorkflow;
  };
  const missionOutput = async (
    action: () => Promise<string>,
  ): Promise<void> => {
    writeOutput(await action());
  };

  mission.command('start <mission-id>').action(async (missionId: string) => {
    await requireWorkflow().start(missionId);
    const t = createCliLocalizer(dependencies.environmentLocale);
    writeOutput(t('mission.started'));
  });
  mission.command('test <mission-id>').action(async (missionId: string) => {
    const result = await requireWorkflow().test(missionId);
    const t = createCliLocalizer(dependencies.environmentLocale);
    writeOutput(
      t(result.passed ? 'mission.testsPassed' : 'mission.testsFailed'),
    );
    if (!result.passed) setExitCode(result.exitCode);
  });
  mission
    .command('validate <mission-id>')
    .requiredOption('--evidence <path>')
    .action(async (missionId: string, options: { evidence: string }) => {
      await requireWorkflow().validate(missionId, options.evidence);
      const t = createCliLocalizer(dependencies.environmentLocale);
      writeOutput(t('mission.evidenceValid'));
    });
  for (const commandName of ['submit', 'retry'] as const) {
    mission
      .command(`${commandName} <mission-id>`)
      .requiredOption('--evidence <path>')
      .action(async (missionId: string, options: { evidence: string }) => {
        await missionOutput(async () => {
          const result = await requireWorkflow().submit(
            missionId,
            options.evidence,
          );
          return `${result.submissionId} · ${result.status}`;
        });
      });
  }
  mission.command('hint <mission-id>').action(async (missionId: string) => {
    await missionOutput(async () => {
      const result = await requireWorkflow().hint(missionId);
      return `L${String(result.level)} · ${result.contentKey}`;
    });
  });

  program
    .command('join')
    .description('Join an event and create a participant unit')
    .requiredOption('--event-code <code>')
    .requiredOption('--name <display-name>')
    .option('--locale <locale>')
    .action(
      async (options: { eventCode: string; locale?: string; name: string }) => {
        if (dependencies.registrationClient === undefined) {
          throw new Error('registration-client-unavailable');
        }
        const config = await dependencies.configRepository.load();
        const locale = options.locale ?? config?.locale;
        const validated = validateParticipantConfig({
          apiUrl: config?.apiUrl,
          locale,
          schemaVersion: 1,
        });
        const joined = await dependencies.registrationClient.join({
          displayName: options.name,
          eventCode: options.eventCode,
          locale: validated.locale,
        });
        const t = createCliLocalizer(validated.locale);
        writeOutput(
          `${t('registration.joined')} ${joined.unitId} · ${joined.eventSessionId}`,
        );
      },
    );

  program
    .command('connectivity')
    .description('Verify required Mission Control endpoints')
    .action(async () => {
      if (dependencies.registrationClient === undefined) {
        throw new Error('registration-client-unavailable');
      }
      const config = await dependencies.configRepository.load();
      const t = createCliLocalizer(
        config?.locale ?? dependencies.environmentLocale,
      );
      const checks = await dependencies.registrationClient.checkConnectivity();
      for (const check of checks) {
        writeOutput(
          `${check.status.toUpperCase()} ${t(
            `connectivity.${check.endpoint}`,
          )}${check.statusCode === undefined ? '' : ` · HTTP ${String(check.statusCode)}`}`,
        );
      }
      if (checks.some(({ status }) => status === 'fail')) {
        setExitCode(1);
      }
    });

  program
    .command('diagnose')
    .description(
      'Check local runtime, configuration, authentication, and API connectivity',
    )
    .action(async () => {
      const config = await dependencies.configRepository.load();
      const t = createCliLocalizer(
        config?.locale ?? dependencies.environmentLocale,
      );
      const results = await runParticipantDiagnostics({
        auth: dependencies.auth,
        configRepository: dependencies.configRepository,
        ...(dependencies.fetch === undefined
          ? {}
          : { fetch: dependencies.fetch }),
      });
      for (const result of results) {
        writeOutput(
          `${result.status.toUpperCase()} ${t(
            `diagnostic.${result.check}`,
          )}: ${result.detail}`,
        );
      }
      if (results.some(({ status }) => status === 'fail')) {
        setExitCode(1);
      }
    });

  return program;
}
