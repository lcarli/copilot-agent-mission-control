import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface ParticipantCredentials {
  readonly eventCode: string;
  readonly eventSessionId: string;
  readonly reconnectSecret: string;
  readonly unitId: string;
  readonly unitToken: string;
}

export interface ParticipantCredentialRepository {
  load(): Promise<ParticipantCredentials | undefined>;
  save(credentials: ParticipantCredentials): Promise<void>;
}

export class ParticipantCredentialError extends Error {
  constructor(
    readonly code:
      | 'credentials-invalid'
      | 'credentials-read-failed'
      | 'credentials-write-failed',
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'ParticipantCredentialError';
  }
}

const validateCredentials = (value: unknown): ParticipantCredentials => {
  if (typeof value !== 'object' || value === null) {
    throw new ParticipantCredentialError('credentials-invalid');
  }
  const candidate = value as Record<string, unknown>;
  for (const key of [
    'eventCode',
    'eventSessionId',
    'reconnectSecret',
    'unitId',
    'unitToken',
  ] as const) {
    if (typeof candidate[key] !== 'string' || candidate[key].length === 0) {
      throw new ParticipantCredentialError('credentials-invalid');
    }
  }
  return {
    eventCode: candidate.eventCode as string,
    eventSessionId: candidate.eventSessionId as string,
    reconnectSecret: candidate.reconnectSecret as string,
    unitId: candidate.unitId as string,
    unitToken: candidate.unitToken as string,
  };
};

export class FileParticipantCredentialRepository implements ParticipantCredentialRepository {
  constructor(readonly path: string) {}

  async load(): Promise<ParticipantCredentials | undefined> {
    try {
      return validateCredentials(JSON.parse(await readFile(this.path, 'utf8')));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return undefined;
      }
      if (error instanceof ParticipantCredentialError) throw error;
      throw new ParticipantCredentialError('credentials-read-failed', {
        cause: error,
      });
    }
  }

  async save(credentials: ParticipantCredentials): Promise<void> {
    const validated = validateCredentials(credentials);
    const directory = dirname(this.path);
    const temporaryPath = `${this.path}.${String(process.pid)}.tmp`;
    try {
      await mkdir(directory, { mode: 0o700, recursive: true });
      await writeFile(
        temporaryPath,
        `${JSON.stringify(validated, undefined, 2)}\n`,
        { encoding: 'utf8', mode: 0o600 },
      );
      await rename(temporaryPath, this.path);
    } catch (error) {
      throw new ParticipantCredentialError('credentials-write-failed', {
        cause: error,
      });
    }
  }
}

export function defaultParticipantCredentialPath(
  homeDirectory: string,
): string {
  return join(homeDirectory, '.mission-control', 'credentials.json');
}
