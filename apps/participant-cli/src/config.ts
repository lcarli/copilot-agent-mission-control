import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  isSupportedLocale,
  type SupportedLocale,
} from '@mission-control/localization';

export interface ParticipantCliConfig {
  readonly schemaVersion: 1;
  readonly apiUrl: string;
  readonly locale: SupportedLocale;
}

export interface ParticipantConfigRepository {
  load(): Promise<ParticipantCliConfig | undefined>;
  save(config: ParticipantCliConfig): Promise<void>;
}

export class ParticipantConfigError extends Error {
  constructor(
    readonly code:
      'config-invalid' | 'config-read-failed' | 'config-write-failed',
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'ParticipantConfigError';
  }
}

export function validateParticipantConfig(
  value: unknown,
): ParticipantCliConfig {
  if (typeof value !== 'object' || value === null) {
    throw new ParticipantConfigError('config-invalid');
  }
  const candidate = value as Record<string, unknown>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.apiUrl !== 'string' ||
    typeof candidate.locale !== 'string' ||
    !isSupportedLocale(candidate.locale)
  ) {
    throw new ParticipantConfigError('config-invalid');
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(candidate.apiUrl);
  } catch (error) {
    throw new ParticipantConfigError('config-invalid', { cause: error });
  }
  const isLocal =
    apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1';
  if (
    apiUrl.protocol !== 'https:' &&
    !(isLocal && apiUrl.protocol === 'http:')
  ) {
    throw new ParticipantConfigError('config-invalid');
  }

  return {
    apiUrl: apiUrl.href.replace(/\/$/u, ''),
    locale: candidate.locale,
    schemaVersion: 1,
  };
}

export class FileParticipantConfigRepository implements ParticipantConfigRepository {
  constructor(readonly path: string) {}

  async load(): Promise<ParticipantCliConfig | undefined> {
    let content: string;
    try {
      content = await readFile(this.path, 'utf8');
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return undefined;
      }
      throw new ParticipantConfigError('config-read-failed', { cause: error });
    }

    try {
      return validateParticipantConfig(JSON.parse(content) as unknown);
    } catch (error) {
      if (error instanceof ParticipantConfigError) throw error;
      throw new ParticipantConfigError('config-invalid', { cause: error });
    }
  }

  async save(config: ParticipantCliConfig): Promise<void> {
    const validated = validateParticipantConfig(config);
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
      throw new ParticipantConfigError('config-write-failed', { cause: error });
    }
  }
}

export function defaultParticipantConfigPath(homeDirectory: string): string {
  return join(homeDirectory, '.mission-control', 'config.json');
}
