import { describe, expect, it } from 'vitest';

import {
  ParticipantAuthSession,
  runParticipantPreflight,
  type CommandProbe,
  type ParticipantConfigRepository,
} from '../src/index.js';

const token = [
  Buffer.from('{}').toString('base64url'),
  Buffer.from(JSON.stringify({ exp: 2_000_000_000 })).toString('base64url'),
  'signature',
].join('.');

describe('participant preflight', () => {
  it('passes when required tools, Copilot, configuration, and API are available', async () => {
    const responses = new Map([
      ['pnpm --version', '11.27.0'],
      ['git --version', 'git version 2.51.0'],
      ['code --version', '1.105.0'],
      ['code --list-extensions', 'GitHub.copilot\nGitHub.copilot-chat'],
    ]);
    const probe: CommandProbe = {
      run: (command, args) =>
        Promise.resolve({
          exitCode: 0,
          stdout: responses.get(`${command} ${args.join(' ')}`) ?? '',
        }),
    };
    const configRepository: ParticipantConfigRepository = {
      load: () =>
        Promise.resolve({
          apiUrl: 'https://mission.example.test',
          locale: 'en',
          schemaVersion: 1,
        }),
      save: () => Promise.resolve(),
    };

    const results = await runParticipantPreflight({
      auth: new ParticipantAuthSession(
        { read: () => token },
        () => new Date('2026-01-01T00:00:00Z'),
      ),
      configRepository,
      fetch: () => Promise.resolve(new Response(undefined, { status: 200 })),
      nodeVersion: '24.13.0',
      probe,
    });

    expect(results).toHaveLength(8);
    expect(results.every(({ status }) => status === 'pass')).toBe(true);
  });

  it('reports missing prerequisites without exposing credentials', async () => {
    const probe: CommandProbe = {
      run: () => Promise.resolve({ exitCode: 1, stdout: '' }),
    };
    const results = await runParticipantPreflight({
      auth: new ParticipantAuthSession({ read: () => undefined }),
      configRepository: {
        load: () => Promise.resolve(undefined),
        save: () => Promise.resolve(),
      },
      nodeVersion: '22.0.0',
      probe,
    });

    expect(results.filter(({ status }) => status === 'fail')).toHaveLength(6);
    expect(
      results.find(({ check }) => check === 'authentication')?.status,
    ).toBe('warning');
    expect(JSON.stringify(results)).not.toContain('authorization');
  });
});
