import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  HttpParticipantMissionWorkflow,
  MissionWorkflowError,
  ParticipantAuthSession,
  createParticipantProgram,
  type LocalMissionTestRunner,
  type ParticipantConfigRepository,
} from '../src/index.js';

const token = [
  Buffer.from('{}').toString('base64url'),
  Buffer.from(JSON.stringify({ exp: 2_000_000_000 })).toString('base64url'),
  'signature',
].join('.');

const configRepository: ParticipantConfigRepository = {
  load: () =>
    Promise.resolve({
      apiUrl: 'https://mission.example.test',
      locale: 'en',
      schemaVersion: 1,
    }),
  save: () => Promise.resolve(),
};

async function createEvidence(missionId = 'mission-1'): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'mission-evidence-'));
  const path = join(directory, 'evidence.json');
  await writeFile(
    path,
    JSON.stringify({
      evidence: { checks: ['reliability', 'grounding'] },
      missionId,
      schemaVersion: '1.0',
    }),
  );
  return path;
}

function createHarness() {
  const requests: { readonly init?: RequestInit; readonly url: string }[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>((input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    requests.push(init === undefined ? { url } : { init, url });
    if (url.endsWith('/hints')) {
      return Promise.resolve(
        Response.json({ contentKey: 'hint.mission-1.level-1', level: 1 }),
      );
    }
    if (url.endsWith('/submissions')) {
      return Promise.resolve(
        Response.json({ status: 'queued', submissionId: 'submission-1' }),
      );
    }
    return Promise.resolve(new Response(undefined, { status: 204 }));
  });
  const testRunner: LocalMissionTestRunner = {
    run: () => Promise.resolve({ exitCode: 0, passed: true }),
  };
  const workflow = new HttpParticipantMissionWorkflow({
    auth: new ParticipantAuthSession(
      { read: () => token },
      () => new Date('2026-01-01T00:00:00Z'),
    ),
    configRepository,
    fetch,
    testRunner,
  });
  return { fetch, requests, workflow };
}

describe('participant mission workflow', () => {
  it('validates bounded mission-specific evidence packages', async () => {
    const harness = createHarness();
    const evidencePath = await createEvidence();

    await expect(
      harness.workflow.validate('mission-1', evidencePath),
    ).resolves.toEqual({
      evidence: { checks: ['reliability', 'grounding'] },
      missionId: 'mission-1',
      schemaVersion: '1.0',
    });
    await expect(
      harness.workflow.validate('another-mission', evidencePath),
    ).rejects.toEqual(new MissionWorkflowError('evidence-invalid'));
  });

  it('starts, submits, retries, and requests hints with authentication and idempotency', async () => {
    const harness = createHarness();
    const evidencePath = await createEvidence();

    await harness.workflow.start('mission-1');
    await expect(
      harness.workflow.submit('mission-1', evidencePath),
    ).resolves.toEqual({
      status: 'queued',
      submissionId: 'submission-1',
    });
    await expect(harness.workflow.hint('mission-1')).resolves.toEqual({
      contentKey: 'hint.mission-1.level-1',
      level: 1,
    });

    expect(harness.fetch).toHaveBeenCalledTimes(3);
    for (const request of harness.requests) {
      const headers = new Headers(request.init?.headers);
      expect(headers.get('authorization')).toMatch(/^Bearer /u);
      expect(headers.get('idempotency-key')).toMatch(/^[0-9a-f-]{36}$/u);
    }
  });

  it('runs local tests and exposes all CLI mission commands', async () => {
    const harness = createHarness();
    const output: string[] = [];
    const program = createParticipantProgram({
      auth: new ParticipantAuthSession({ read: () => token }),
      configRepository,
      missionWorkflow: harness.workflow,
      setExitCode: () => undefined,
      writeOutput: (line) => output.push(line),
    });

    await program.parseAsync(
      ['node', 'mission-control', 'mission', 'test', 'mission-1'],
      { from: 'node' },
    );

    expect(output).toEqual(['Local tests passed.']);
    expect(
      program.commands.some((command) => command.name() === 'mission'),
    ).toBe(true);
  });
});
