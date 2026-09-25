import { describe, expect, it, vi } from 'vitest';

import {
  HttpParticipantRegistrationClient,
  ParticipantAuthSession,
  createMutableTokenSource,
  createParticipantProgram,
  type ParticipantCliConfig,
  type ParticipantConfigRepository,
  type ParticipantCredentialRepository,
  type ParticipantCredentials,
} from '../src/index.js';

const config: ParticipantCliConfig = {
  apiUrl: 'https://mission.example.test',
  locale: 'en',
  schemaVersion: 1,
};

const createToken = (expiresAt: number): string =>
  [
    Buffer.from('{}').toString('base64url'),
    Buffer.from(JSON.stringify({ exp: expiresAt })).toString('base64url'),
    'signature',
  ].join('.');

function createHarness() {
  let credentials: ParticipantCredentials | undefined;
  const requests: { readonly init?: RequestInit; readonly url: string }[] = [];
  const tokenSource = createMutableTokenSource(
    createToken(Math.floor(Date.now() / 1000) + 3_600),
  );
  const configRepository: ParticipantConfigRepository = {
    load: () => Promise.resolve(config),
    save: () => Promise.resolve(),
  };
  const credentialRepository: ParticipantCredentialRepository = {
    load: () => Promise.resolve(credentials),
    save: (value) => {
      credentials = value;
      return Promise.resolve();
    },
  };
  const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    requests.push(init === undefined ? { url } : { init, url });
    if (url.endsWith('/api/v1/registrations')) {
      return Promise.resolve(
        Response.json({
          eventSession: { eventSessionId: 'event-1' },
          reconnectSecret: 'reconnect-secret',
          unit: { unitId: 'unit-1' },
          unitToken: createToken(Math.floor(Date.now() / 1000) + 3_600),
        }),
      );
    }
    return Promise.resolve(new Response(undefined, { status: 200 }));
  });
  const client = new HttpParticipantRegistrationClient({
    auth: new ParticipantAuthSession(tokenSource),
    configRepository,
    credentialRepository,
    fetch,
    updateToken: (token) => {
      tokenSource.write(token);
    },
  });
  return {
    client,
    credentials: () => credentials,
    fetch,
    requests,
  };
}

describe('participant registration and connectivity', () => {
  it('joins an event and stores credentials without returning secrets', async () => {
    const harness = createHarness();

    const result = await harness.client.join({
      displayName: 'Harbor Team',
      eventCode: 'LIGHT-123',
      locale: 'en',
    });

    expect(result).toEqual({
      eventSessionId: 'event-1',
      unitId: 'unit-1',
    });
    expect(harness.credentials()).toEqual(
      expect.objectContaining({
        eventCode: 'LIGHT-123',
        eventSessionId: 'event-1',
        reconnectSecret: 'reconnect-secret',
        unitId: 'unit-1',
      }),
    );
    expect(JSON.stringify(result)).not.toContain('reconnect-secret');
    expect(JSON.stringify(result)).not.toContain('unitToken');
  });

  it('checks all required public and authenticated endpoints', async () => {
    const harness = createHarness();

    const results = await harness.client.checkConnectivity();

    expect(results).toEqual([
      { endpoint: 'liveness', status: 'pass', statusCode: 200 },
      { endpoint: 'readiness', status: 'pass', statusCode: 200 },
      { endpoint: 'event-session', status: 'pass', statusCode: 200 },
      { endpoint: 'unit', status: 'pass', statusCode: 200 },
      { endpoint: 'missions', status: 'pass', statusCode: 200 },
    ]);
    expect(harness.fetch).toHaveBeenCalledTimes(5);
    expect(harness.requests[0]?.init).not.toHaveProperty('headers');
    expect(
      new Headers(harness.requests[2]?.init?.headers).get('authorization'),
    ).toMatch(/^Bearer /u);
  });

  it('wires join and connectivity commands without printing credentials', async () => {
    const harness = createHarness();
    const output: string[] = [];
    const program = createParticipantProgram({
      auth: new ParticipantAuthSession({ read: () => undefined }),
      configRepository: {
        load: () => Promise.resolve(config),
        save: () => Promise.resolve(),
      },
      registrationClient: harness.client,
      setExitCode: () => undefined,
      writeOutput: (line) => output.push(line),
    });

    await program.parseAsync(
      [
        'node',
        'mission-control',
        'join',
        '--event-code',
        'LIGHT-123',
        '--name',
        'Harbor Team',
      ],
      { from: 'node' },
    );

    expect(output).toEqual(['Joined event as unit unit-1 · event-1']);
    expect(output.join(' ')).not.toContain('reconnect-secret');
    expect(output.join(' ')).not.toContain('signature');
  });
});
