import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  FileParticipantConfigRepository,
  ParticipantAuthSession,
  ParticipantAuthenticationError,
  createCliLocalizer,
  createParticipantProgram,
  runParticipantDiagnostics,
  validateParticipantConfig,
  type ParticipantCliConfig,
  type ParticipantConfigRepository,
} from '../src/index.js';

const createToken = (payload: Record<string, unknown>): string =>
  [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
    'signature',
  ].join('.');

describe('participant CLI foundation', () => {
  it('validates and atomically persists non-secret configuration', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'mission-control-cli-'));
    const path = join(directory, 'config.json');
    const repository = new FileParticipantConfigRepository(path);
    const config = validateParticipantConfig({
      apiUrl: 'https://mission.example.test/',
      locale: 'pt-BR',
      schemaVersion: 1,
    });

    await repository.save(config);

    expect(await repository.load()).toEqual({
      apiUrl: 'https://mission.example.test',
      locale: 'pt-BR',
      schemaVersion: 1,
    });
    expect(await readFile(path, 'utf8')).not.toContain('token');
  });

  it('rejects insecure non-local API URLs', () => {
    expect(() =>
      validateParticipantConfig({
        apiUrl: 'http://mission.example.test',
        locale: 'en',
        schemaVersion: 1,
      }),
    ).toThrow('config-invalid');
  });

  it('creates authorization headers without exposing the token in status', () => {
    const token = createToken({
      event_session_id: 'event-1',
      exp: 2_000_000_000,
      unit_id: 'unit-1',
    });
    const auth = new ParticipantAuthSession(
      { read: () => token },
      () => new Date('2026-01-01T00:00:00Z'),
    );

    expect(auth.status()).toEqual({
      authenticated: true,
      claims: {
        eventSessionId: 'event-1',
        expiresAt: 2_000_000_000,
        unitId: 'unit-1',
      },
    });
    expect(auth.authorizationHeader()).toEqual({
      authorization: `Bearer ${token}`,
    });
  });

  it('rejects expired participant tokens', () => {
    const token = createToken({ exp: 1 });
    const auth = new ParticipantAuthSession(
      { read: () => token },
      () => new Date('2026-01-01T00:00:00Z'),
    );

    expect(() => auth.authorizationHeader()).toThrow(
      new ParticipantAuthenticationError('token-expired'),
    );
  });

  it('runs localized diagnostics without printing credentials', async () => {
    const token = createToken({ exp: 2_000_000_000 });
    const auth = new ParticipantAuthSession(
      { read: () => token },
      () => new Date('2026-01-01T00:00:00Z'),
    );
    const configRepository: ParticipantConfigRepository = {
      load: () =>
        Promise.resolve({
          apiUrl: 'https://mission.example.test',
          locale: 'fr',
          schemaVersion: 1,
        }),
      save: () => Promise.resolve(),
    };
    let requestedUrl = '';
    let requestedSignal: AbortSignal | undefined;
    const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
      requestedUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      requestedSignal = init?.signal ?? undefined;
      return Promise.resolve(new Response(undefined, { status: 200 }));
    });

    const results = await runParticipantDiagnostics({
      auth,
      configRepository,
      fetch,
      nodeVersion: '24.13.0',
    });

    expect(results.map(({ status }) => status)).toEqual([
      'pass',
      'pass',
      'pass',
      'pass',
    ]);
    expect(requestedUrl).toBe(
      'https://mission.example.test/api/v1/health/ready',
    );
    expect(requestedSignal).toBeInstanceOf(AbortSignal);
    expect(JSON.stringify(results)).not.toContain(token);
    expect(createCliLocalizer('fr')('diagnostic.api')).toBe('Connectivité API');
  });

  it('wires Commander configuration and authentication commands', async () => {
    let saved: ParticipantCliConfig | undefined;
    const output: string[] = [];
    const configRepository: ParticipantConfigRepository = {
      load: () => Promise.resolve(saved),
      save: (config) => {
        saved = config;
        return Promise.resolve();
      },
    };
    const program = createParticipantProgram({
      auth: new ParticipantAuthSession({ read: () => undefined }),
      configRepository,
      environmentLocale: 'pt-BR',
      setExitCode: () => undefined,
      writeError: (line) => output.push(line),
      writeOutput: (line) => output.push(line),
    });

    await program.parseAsync(
      [
        'node',
        'mission-control',
        'config',
        'set',
        '--api-url',
        'http://localhost:3000',
        '--locale',
        'pt-BR',
      ],
      { from: 'node' },
    );

    expect(saved).toEqual({
      apiUrl: 'http://localhost:3000',
      locale: 'pt-BR',
      schemaVersion: 1,
    });
    expect(output).toContain('Configuração da CLI salva.');
  });
});
