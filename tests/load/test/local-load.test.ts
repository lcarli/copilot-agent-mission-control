import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { buildLocalWorkshopApp } from '@mission-control/api';
import {
  decodeMissionSubmissionFeedback,
  decodePublicPresentationProjection,
} from '@mission-control/event-contracts';
import { expect, it } from 'vitest';

const requiredString = (value: unknown, key: string): string => {
  if (typeof value !== 'object' || value === null)
    throw new Error(`Missing ${key}`);
  const field: unknown = Reflect.get(value, key);
  if (typeof field !== 'string') throw new Error(`Missing ${key}`);
  return field;
};

it('handles 50 local registrations, concurrent submissions, reconnects and instructor pause/resume', async () => {
  const instructorToken = randomBytes(32).toString('hex');
  const app = buildLocalWorkshopApp({ instructorToken });
  const address = await app.listen({ host: '127.0.0.1', port: 0 });
  const durations: number[] = [];
  const request = async (
    path: string,
    body?: unknown,
    token = instructorToken,
    expectedStatus?: number,
    key = randomUUID(),
  ): Promise<unknown> => {
    const start = performance.now();
    const response = await fetch(`${address}/api/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'idempotency-key': key,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(10_000),
    });
    const value: unknown = await response.json();
    durations.push(performance.now() - start);
    if (expectedStatus !== undefined)
      expect(response.status).toBe(expectedStatus);
    else expect(response.ok, `${path}: ${String(response.status)}`).toBe(true);
    return value;
  };
  try {
    const created = await request('event-sessions', {
      campaignId: 'operation-lighthouse',
      defaultLocale: 'en',
      supportedLocales: ['en'],
    });
    if (
      typeof created !== 'object' ||
      created === null ||
      !('eventSession' in created)
    )
      throw new Error('Missing event.');
    const eventSessionId = requiredString(
      created.eventSession,
      'eventSessionId',
    );
    const eventCode = requiredString(created, 'eventCode');
    const missionId = 'signal-in-the-storm';
    const command = (commandType: string, version: number, mission = false) =>
      request(`event-sessions/${eventSessionId}/commands`, {
        schemaVersion: '1.0',
        commandId: randomUUID(),
        commandType,
        eventSessionId,
        expectedVersion: version,
        requestedAt: new Date().toISOString(),
        target: mission ? { missionId } : {},
        payload: {},
      });
    await command('event-session.open-lobby', 1);
    await command('event-session.start', 2);
    await command('mission.open', 1, true);
    const joined = await Promise.all(
      Array.from({ length: 50 }, async (_, index) => {
        const value = await request('registrations', {
          eventCode,
          displayName: `Synthetic load unit ${String(index + 1)}`,
          locale: 'en',
        });
        if (typeof value !== 'object' || value === null || !('unit' in value))
          throw new Error('Missing unit.');
        return {
          unitToken: requiredString(value, 'unitToken'),
          reconnectSecret: requiredString(value, 'reconnectSecret'),
          unitId: requiredString(value.unit, 'unitId'),
        };
      }),
    );
    await Promise.all(
      joined.map((unit) =>
        request(`missions/${missionId}/start`, {}, unit.unitToken),
      ),
    );
    const envelope: unknown = JSON.parse(
      await readFile(
        new URL(
          '../../../campaigns/operation-lighthouse/starters/mission-1/examples/evidence.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const results = await Promise.all(
      joined.map(async (unit) => {
        const submitted = await request(
          `missions/${missionId}/submissions`,
          envelope,
          unit.unitToken,
        );
        const result = decodeMissionSubmissionFeedback(
          await request(
            `submissions/${requiredString(submitted, 'submissionId')}`,
            undefined,
            unit.unitToken,
          ),
        );
        expect(result.outcome).toBe('passed');
        expect(result.score.totalPoints).toBe(882);
        expect(result.recovery?.status).toBe('applied');
        return result;
      }),
    );
    expect(new Set(results.map((result) => result.submissionId)).size).toBe(50);
    await command('mission.pause', 2, true);
    await Promise.all(
      joined.map((unit) =>
        request(
          `missions/${missionId}/submissions`,
          envelope,
          unit.unitToken,
          409,
        ),
      ),
    );
    const reconnected = await Promise.all(
      joined.map((unit) =>
        request('auth/refresh', {
          eventCode,
          unitId: unit.unitId,
          reconnectSecret: unit.reconnectSecret,
        }),
      ),
    );
    await command('mission.resume', 3, true);
    await Promise.all(
      reconnected.map(async (unit) => {
        const token = requiredString(unit, 'unitToken');
        const key = randomUUID();
        const [first, duplicate] = await Promise.all([
          request(
            `missions/${missionId}/submissions`,
            envelope,
            token,
            201,
            key,
          ),
          request(
            `missions/${missionId}/submissions`,
            envelope,
            token,
            201,
            key,
          ),
        ]);
        expect(duplicate).toEqual(first);
        const result = decodeMissionSubmissionFeedback(
          await request(
            `submissions/${requiredString(first, 'submissionId')}`,
            undefined,
            token,
          ),
        );
        expect(result.score.awardedPoints).toBe(0);
        expect(result.recovery?.status).toBe('unchanged');
      }),
    );
    const projection = decodePublicPresentationProjection(
      await request(`public/event-session?eventSessionId=${eventSessionId}`),
    );
    expect(projection.connectedUnitCount).toBe(50);
    expect(projection.activeMission.progressPercent).toBe(100);
    expect(projection.rankings).toHaveLength(50);
    expect(projection.rankings.every(({ score }) => score === 882)).toBe(true);
    expect(projection.recoverySource).toBe('validated-decisions');
    expect(projection.collectiveRecoveryPercent).toBe(59);
    expect(projection.recovery).toMatchObject({
      policyVersion: '1.0.0',
      eligibleUnitCount: 50,
      contributionCount: 50,
      finaleUnlocked: false,
    });
    expect(projection.districts[0]).toMatchObject({
      districtId: 'harbor',
      recoveryPercent: 38,
      contributionCount: 50,
    });
    const sorted = durations.toSorted((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    if (p95 === undefined)
      throw new Error('No request timings were collected.');
    expect(p95).toBeLessThan(5_000);
    console.log(
      JSON.stringify({
        scenario: 'local-50-units',
        requests: durations.length,
        p95Ms: Math.round(p95),
        scope:
          'loopback HTTP; excludes Azure, SignalR, simulator provenance and classroom clients',
      }),
    );
  } finally {
    await app.close();
  }
}, 60_000);
