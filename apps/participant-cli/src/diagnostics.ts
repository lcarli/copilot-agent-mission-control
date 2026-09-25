import type { ParticipantAuthSession } from './auth.js';
import type { ParticipantConfigRepository } from './config.js';

export type DiagnosticStatus = 'pass' | 'fail' | 'warning';

export interface DiagnosticResult {
  readonly check: 'runtime' | 'configuration' | 'authentication' | 'api';
  readonly status: DiagnosticStatus;
  readonly detail: string;
}

export interface ParticipantDiagnosticOptions {
  readonly auth: ParticipantAuthSession;
  readonly configRepository: ParticipantConfigRepository;
  readonly fetch?: typeof globalThis.fetch;
  readonly nodeVersion?: string;
}

export async function runParticipantDiagnostics({
  auth,
  configRepository,
  fetch: fetchImplementation = globalThis.fetch,
  nodeVersion = process.versions.node,
}: ParticipantDiagnosticOptions): Promise<readonly DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  const nodeMajor = Number.parseInt(nodeVersion.split('.')[0] ?? '', 10);
  results.push({
    check: 'runtime',
    detail: nodeVersion,
    status:
      Number.isSafeInteger(nodeMajor) && nodeMajor >= 24 ? 'pass' : 'fail',
  });

  let config;
  try {
    config = await configRepository.load();
    results.push({
      check: 'configuration',
      detail: config?.apiUrl ?? 'not configured',
      status: config === undefined ? 'fail' : 'pass',
    });
  } catch (error) {
    results.push({
      check: 'configuration',
      detail: error instanceof Error ? error.message : 'config-read-failed',
      status: 'fail',
    });
  }

  try {
    const status = auth.status();
    results.push({
      check: 'authentication',
      detail: status.authenticated ? 'token available' : 'token unavailable',
      status: status.authenticated ? 'pass' : 'warning',
    });
  } catch (error) {
    results.push({
      check: 'authentication',
      detail: error instanceof Error ? error.message : 'token-invalid',
      status: 'fail',
    });
  }

  if (config === undefined) {
    results.push({ check: 'api', detail: 'not attempted', status: 'warning' });
    return results;
  }

  try {
    const response = await fetchImplementation(
      `${config.apiUrl}/api/v1/health/ready`,
      {
        signal: AbortSignal.timeout(5_000),
      },
    );
    results.push({
      check: 'api',
      detail: `HTTP ${String(response.status)}`,
      status: response.ok ? 'pass' : 'fail',
    });
  } catch (error) {
    results.push({
      check: 'api',
      detail: error instanceof Error ? error.message : 'request-failed',
      status: 'fail',
    });
  }
  return results;
}
