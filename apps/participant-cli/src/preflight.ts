import { spawn } from 'node:child_process';

import type { ParticipantAuthSession } from './auth.js';
import type { ParticipantConfigRepository } from './config.js';
import {
  runParticipantDiagnostics,
  type DiagnosticResult,
  type DiagnosticStatus,
} from './diagnostics.js';

export interface CommandProbeResult {
  readonly exitCode: number;
  readonly stdout: string;
}

export interface CommandProbe {
  run(command: string, args: readonly string[]): Promise<CommandProbeResult>;
}

export interface ParticipantPreflightResult {
  readonly check:
    | 'node'
    | 'pnpm'
    | 'git'
    | 'vscode'
    | 'copilot'
    | 'configuration'
    | 'authentication'
    | 'api';
  readonly detail: string;
  readonly status: DiagnosticStatus;
}

export class SpawnCommandProbe implements CommandProbe {
  run(command: string, args: readonly string[]): Promise<CommandProbeResult> {
    return new Promise((resolve) => {
      const child = spawn(command, [...args], {
        shell: process.platform === 'win32',
        stdio: ['ignore', 'pipe', 'ignore'],
        windowsHide: true,
      });
      let stdout = '';
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.once('error', () => {
        resolve({ exitCode: 1, stdout: '' });
      });
      child.once('close', (exitCode) => {
        resolve({ exitCode: exitCode ?? 1, stdout: stdout.trim() });
      });
    });
  }
}

export interface ParticipantPreflightOptions {
  readonly auth: ParticipantAuthSession;
  readonly configRepository: ParticipantConfigRepository;
  readonly fetch?: typeof globalThis.fetch;
  readonly nodeVersion?: string;
  readonly probe?: CommandProbe;
}

const executableCheck = async (
  probe: CommandProbe,
  check: 'pnpm' | 'git' | 'vscode',
  command: string,
  args: readonly string[],
  expectedMajor?: number,
): Promise<ParticipantPreflightResult> => {
  const result = await probe.run(command, args);
  const major = Number.parseInt(result.stdout.match(/\d+/u)?.[0] ?? '', 10);
  const passed =
    result.exitCode === 0 &&
    (expectedMajor === undefined || major === expectedMajor);
  return {
    check,
    detail: result.stdout || 'not found',
    status: passed ? 'pass' : 'fail',
  };
};

const isPreflightDiagnostic = (
  result: DiagnosticResult,
): result is DiagnosticResult & {
  readonly check: 'configuration' | 'authentication' | 'api';
} => result.check !== 'runtime';

export async function runParticipantPreflight({
  auth,
  configRepository,
  fetch,
  nodeVersion = process.versions.node,
  probe = new SpawnCommandProbe(),
}: ParticipantPreflightOptions): Promise<
  readonly ParticipantPreflightResult[]
> {
  const nodeMajor = Number.parseInt(nodeVersion.split('.')[0] ?? '', 10);
  const [pnpm, git, vscode, extensions] = await Promise.all([
    executableCheck(probe, 'pnpm', 'pnpm', ['--version'], 11),
    executableCheck(probe, 'git', 'git', ['--version']),
    executableCheck(probe, 'vscode', 'code', ['--version']),
    probe.run('code', ['--list-extensions']),
  ]);
  const copilotInstalled = extensions.stdout
    .split(/\r?\n/u)
    .some((extension) => extension.toLowerCase() === 'github.copilot');
  const diagnostics = await runParticipantDiagnostics({
    auth,
    configRepository,
    ...(fetch === undefined ? {} : { fetch }),
    nodeVersion,
  });

  return [
    {
      check: 'node',
      detail: nodeVersion,
      status: nodeMajor === 24 ? 'pass' : 'fail',
    },
    pnpm,
    git,
    vscode,
    {
      check: 'copilot',
      detail: copilotInstalled ? 'GitHub.copilot' : 'not found',
      status: copilotInstalled ? 'pass' : 'fail',
    },
    ...diagnostics
      .filter(isPreflightDiagnostic)
      .map(({ check, detail, status }) => ({ check, detail, status })),
  ];
}
