import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

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

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

async function createEvidence(missionId = 'mission-1'): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'mission-evidence-'));
  temporaryDirectories.push(directory);
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
  it('invokes tools with a retry key and reports an observed tool failure through the CLI', async () => {
    const harness = createHarness();
    const requestPath = await createEvidence();
    await writeFile(
      requestPath,
      JSON.stringify({ tool: 'weather', operation: 'forecast', arguments: {} }),
    );
    const receipt = {
      schemaVersion: '1.0',
      evidenceId: 'evidence-1',
      eventSessionId: 'event-1',
      unitId: 'unit-1',
      missionId: 'connected-city',
      sequence: 1,
      recordedAt: '2026-09-29T12:00:00Z',
      tool: 'weather',
      operation: 'forecast',
      arguments: {},
      result: {
        ok: false,
        error: {
          code: 'temporarily-unavailable',
          message: 'Retry forecast.',
          retryable: true,
        },
      },
    };
    harness.fetch.mockResolvedValueOnce(Response.json(receipt));
    await expect(
      harness.workflow.invokeTool('connected-city', requestPath, 'tool-retry'),
    ).resolves.toEqual(receipt);
    expect(
      new Headers(harness.fetch.mock.calls[0]?.[1]?.headers).get(
        'idempotency-key',
      ),
    ).toBe('tool-retry');
    harness.fetch.mockResolvedValueOnce(
      Response.json({ ...receipt, missionId: 'other' }),
    );
    await expect(
      harness.workflow.invokeTool('connected-city', requestPath),
    ).rejects.toMatchObject({ code: 'response-invalid' });
    harness.fetch.mockResolvedValueOnce(Response.json(receipt));
    const output: string[] = [];
    const setExitCode = vi.fn<(code: number) => void>();
    await createParticipantProgram({
      auth: new ParticipantAuthSession({ read: () => token }),
      configRepository,
      missionWorkflow: harness.workflow,
      setExitCode,
      writeOutput: (line) => output.push(line),
    }).parseAsync(
      ['mission', 'tool', 'connected-city', '--request', requestPath],
      { from: 'user' },
    );
    expect(setExitCode).toHaveBeenCalledWith(1);
    expect(JSON.parse(output[0] ?? '{}')).toEqual(receipt);
    await writeFile(
      requestPath,
      JSON.stringify({
        tool: 'weather',
        operation: 'forecast',
        arguments: {},
        unitId: 'foreign',
      }),
    );
    await expect(
      harness.workflow.invokeTool('connected-city', requestPath),
    ).rejects.toMatchObject({ code: 'tool-request-invalid' });
  });

  it('preserves an explicit retry key and reads bounded evaluated feedback', async () => {
    const harness = createHarness();
    const path = await createEvidence();
    await harness.workflow.submit('mission-1', path, 'replay-key');
    expect(
      new Headers(harness.requests[0]?.init?.headers).get('idempotency-key'),
    ).toBe('replay-key');
    const feedback = {
      schemaVersion: '1.0',
      submissionId: 'submission-1',
      missionId: 'mission-1',
      status: 'evaluated',
      outcome: 'partial',
      rules: [],
      score: { missionPoints: 30, totalPoints: 30, awardedPoints: 30 },
      evaluatedAt: '2026-09-29T12:00:00Z',
    };
    harness.fetch.mockResolvedValueOnce(Response.json(feedback));
    await expect(harness.workflow.feedback('submission-1')).resolves.toEqual(
      feedback,
    );
    harness.fetch.mockResolvedValueOnce(
      Response.json({ ...feedback, submissionId: 'another' }),
    );
    await expect(
      harness.workflow.feedback('submission-1'),
    ).rejects.toMatchObject({ code: 'response-invalid' });
  });

  it('reports safe server problem codes and rejects malformed successful responses', async () => {
    const harness = createHarness();
    const path = await createEvidence();
    harness.fetch.mockResolvedValueOnce(
      Response.json(
        {
          code: 'mission-not-available',
          correlationId: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d470',
          secret: 'must-not-be-printed',
        },
        { status: 409 },
      ),
    );
    await expect(harness.workflow.submit('mission-1', path)).rejects.toThrow(
      'HTTP 409 mission-not-available',
    );
    harness.fetch.mockResolvedValueOnce(new Response('{'));
    await expect(
      harness.workflow.submit('mission-1', path),
    ).rejects.toMatchObject({ code: 'response-invalid' });
    harness.fetch.mockResolvedValueOnce(
      Response.json({ code: 'invalid\nmessage' }, { status: 500 }),
    );
    await expect(harness.workflow.start('mission-1')).rejects.toThrow(
      'invalid-error-response',
    );
  });

  it('rejects unknown envelope fields without treating local checks as approval', async () => {
    const harness = createHarness();
    const path = await createEvidence();
    await writeFile(
      path,
      JSON.stringify({
        schemaVersion: '1.0',
        missionId: 'mission-1',
        evidence: {},
        eventSessionId: 'other-event',
      }),
    );
    await expect(
      harness.workflow.validate('mission-1', path),
    ).rejects.toMatchObject({ code: 'evidence-invalid' });
    expect(harness.fetch).not.toHaveBeenCalled();
  });

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
