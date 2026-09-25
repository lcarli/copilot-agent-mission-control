import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';

import type { ParticipantAuthSession } from './auth.js';
import type { ParticipantConfigRepository } from './config.js';

export interface MissionEvidencePackage {
  readonly missionId: string;
  readonly schemaVersion: '1.0';
  readonly evidence: Readonly<Record<string, unknown>>;
}

export interface MissionSubmissionSummary {
  readonly status: string;
  readonly submissionId: string;
}

export interface MissionHintSummary {
  readonly contentKey: string;
  readonly level: number;
}

export interface LocalTestResult {
  readonly exitCode: number;
  readonly passed: boolean;
}

export interface LocalMissionTestRunner {
  run(missionId: string): Promise<LocalTestResult>;
}

export interface ParticipantMissionWorkflow {
  hint(missionId: string): Promise<MissionHintSummary>;
  start(missionId: string): Promise<void>;
  submit(
    missionId: string,
    evidencePath: string,
  ): Promise<MissionSubmissionSummary>;
  test(missionId: string): Promise<LocalTestResult>;
  validate(
    missionId: string,
    evidencePath: string,
  ): Promise<MissionEvidencePackage>;
}

export class MissionWorkflowError extends Error {
  constructor(
    readonly code:
      | 'configuration-missing'
      | 'evidence-invalid'
      | 'evidence-read-failed'
      | 'request-failed'
      | 'response-invalid',
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'MissionWorkflowError';
  }
}

export class SpawnLocalMissionTestRunner implements LocalMissionTestRunner {
  constructor(
    private readonly executable = process.platform === 'win32'
      ? 'pnpm.cmd'
      : 'pnpm',
  ) {}

  run(missionId: string): Promise<LocalTestResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.executable, ['test'], {
        env: { ...process.env, MISSION_CONTROL_MISSION_ID: missionId },
        shell: process.platform === 'win32',
        stdio: 'inherit',
      });
      child.once('error', reject);
      child.once('close', (exitCode) => {
        const normalizedExitCode = exitCode ?? 1;
        resolve({
          exitCode: normalizedExitCode,
          passed: normalizedExitCode === 0,
        });
      });
    });
  }
}

export interface HttpParticipantMissionWorkflowOptions {
  readonly auth: ParticipantAuthSession;
  readonly configRepository: ParticipantConfigRepository;
  readonly fetch?: typeof globalThis.fetch;
  readonly testRunner?: LocalMissionTestRunner;
}

const parseEvidence = (
  missionId: string,
  content: string,
): MissionEvidencePackage => {
  if (Buffer.byteLength(content, 'utf8') > 1_048_576) {
    throw new MissionWorkflowError('evidence-invalid');
  }
  let value: unknown;
  try {
    value = JSON.parse(content) as unknown;
  } catch (error) {
    throw new MissionWorkflowError('evidence-invalid', { cause: error });
  }
  if (typeof value !== 'object' || value === null) {
    throw new MissionWorkflowError('evidence-invalid');
  }
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== '1.0' ||
    candidate.missionId !== missionId ||
    typeof candidate.evidence !== 'object' ||
    candidate.evidence === null ||
    Array.isArray(candidate.evidence)
  ) {
    throw new MissionWorkflowError('evidence-invalid');
  }
  return {
    evidence: candidate.evidence as Readonly<Record<string, unknown>>,
    missionId,
    schemaVersion: '1.0',
  };
};

export class HttpParticipantMissionWorkflow implements ParticipantMissionWorkflow {
  readonly #auth: ParticipantAuthSession;
  readonly #configRepository: ParticipantConfigRepository;
  readonly #fetch: typeof globalThis.fetch;
  readonly #testRunner: LocalMissionTestRunner;

  constructor(options: HttpParticipantMissionWorkflowOptions) {
    this.#auth = options.auth;
    this.#configRepository = options.configRepository;
    this.#fetch = options.fetch ?? globalThis.fetch;
    this.#testRunner = options.testRunner ?? new SpawnLocalMissionTestRunner();
  }

  async start(missionId: string): Promise<void> {
    await this.#request(
      `/api/v1/missions/${encodeURIComponent(missionId)}/start`,
      {
        body: '{}',
        method: 'POST',
        mutation: true,
      },
    );
  }

  test(missionId: string): Promise<LocalTestResult> {
    return this.#testRunner.run(missionId);
  }

  async validate(
    missionId: string,
    evidencePath: string,
  ): Promise<MissionEvidencePackage> {
    try {
      return parseEvidence(missionId, await readFile(evidencePath, 'utf8'));
    } catch (error) {
      if (error instanceof MissionWorkflowError) throw error;
      throw new MissionWorkflowError('evidence-read-failed', { cause: error });
    }
  }

  async submit(
    missionId: string,
    evidencePath: string,
  ): Promise<MissionSubmissionSummary> {
    const evidence = await this.validate(missionId, evidencePath);
    const response = await this.#request(
      `/api/v1/missions/${encodeURIComponent(missionId)}/submissions`,
      {
        body: JSON.stringify(evidence),
        method: 'POST',
        mutation: true,
      },
    );
    const value = await response.json();
    if (typeof value !== 'object' || value === null) {
      throw new MissionWorkflowError('response-invalid');
    }
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.submissionId !== 'string' ||
      typeof candidate.status !== 'string'
    ) {
      throw new MissionWorkflowError('response-invalid');
    }
    return {
      status: candidate.status,
      submissionId: candidate.submissionId,
    };
  }

  async hint(missionId: string): Promise<MissionHintSummary> {
    const response = await this.#request(
      `/api/v1/missions/${encodeURIComponent(missionId)}/hints`,
      { body: '{}', method: 'POST', mutation: true },
    );
    const value = await response.json();
    if (typeof value !== 'object' || value === null) {
      throw new MissionWorkflowError('response-invalid');
    }
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.contentKey !== 'string' ||
      typeof candidate.level !== 'number'
    ) {
      throw new MissionWorkflowError('response-invalid');
    }
    return { contentKey: candidate.contentKey, level: candidate.level };
  }

  async #request(
    path: string,
    options: {
      readonly body?: string;
      readonly method?: 'GET' | 'POST';
      readonly mutation?: boolean;
    },
  ): Promise<Response> {
    const config = await this.#configRepository.load();
    if (config === undefined) {
      throw new MissionWorkflowError('configuration-missing');
    }
    const headers: Record<string, string> = {
      ...this.#auth.authorizationHeader(),
      'content-type': 'application/json',
    };
    if (options.mutation === true) {
      headers['idempotency-key'] = randomUUID();
    }
    let response: Response;
    try {
      response = await this.#fetch(`${config.apiUrl}${path}`, {
        ...(options.body === undefined ? {} : { body: options.body }),
        headers,
        method: options.method ?? 'GET',
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new MissionWorkflowError('request-failed', { cause: error });
    }
    if (!response.ok) {
      throw new MissionWorkflowError('request-failed');
    }
    return response;
  }
}
