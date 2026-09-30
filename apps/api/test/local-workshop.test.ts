import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { afterEach, describe, expect, it } from 'vitest';

import {
  decodeMissionSubmissionFeedback,
  decodePublicPresentationProjection,
  decodeSimulatorObservation,
  decodeSimulatorCatalog,
  type SimulatorObservation,
} from '@mission-control/event-contracts';
import { isRecord } from '@mission-control/campaign-operation-lighthouse';

import { buildLocalWorkshopApp } from '../src/index.js';

const instructorToken = randomBytes(32).toString('hex');
const apps: ReturnType<typeof buildLocalWorkshopApp>[] = [];
const missionId = 'signal-in-the-storm';
const evidence = {
  schemaVersion: '1.0',
  missionId,
  evidence: {
    category: 'flooding',
    severity: 'high',
    location: 'Harbor Pier 4',
    affectedServices: ['water-pumping'],
    missingInformation: ['water depth'],
    severityExplanation: 'Water is entering occupied homes.',
  },
};
const headers = (token = instructorToken, key = randomUUID()) => ({
  authorization: `Bearer ${token}`,
  'idempotency-key': key,
});

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function harness() {
  const app = buildLocalWorkshopApp({ instructorToken });
  apps.push(app);
  const create = async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/event-sessions',
      headers: headers(),
      payload: {
        campaignId: 'operation-lighthouse',
        defaultLocale: 'en',
        supportedLocales: ['en', 'fr', 'pt-BR'],
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json<{
      eventCode: string;
      eventSession: { eventSessionId: string };
    }>();
  };
  const command = (
    eventSessionId: string,
    commandType: string,
    expectedVersion: number,
    target: Record<string, string> = {},
    payload: Record<string, string> = {},
  ) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/event-sessions/${eventSessionId}/commands`,
      headers: headers(),
      payload: {
        schemaVersion: '1.0',
        commandId: randomUUID(),
        commandType,
        eventSessionId,
        expectedVersion,
        requestedAt: new Date().toISOString(),
        target,
        payload,
        reason: 'Synthetic rehearsal',
      },
    });
  const setup = async () => {
    const created = await create();
    const id = created.eventSession.eventSessionId;
    expect((await command(id, 'event-session.open-lobby', 1)).statusCode).toBe(
      200,
    );
    expect((await command(id, 'event-session.start', 2)).statusCode).toBe(200);
    expect(
      (await command(id, 'mission.open', 1, { missionId })).statusCode,
    ).toBe(200);
    const joined = await app.inject({
      method: 'POST',
      url: '/api/v1/registrations',
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        eventCode: created.eventCode,
        displayName: 'Synthetic private unit name',
        locale: 'en',
      },
    });
    expect(joined.statusCode).toBe(201);
    const unit = joined.json<{
      unitToken: string;
      reconnectSecret: string;
      unit: { unitId: string };
    }>();
    return { ...created, ...unit, id };
  };
  const start = (unitToken: string, id = missionId) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/missions/${id}/start`,
      headers: headers(unitToken),
      payload: {},
    });
  const submit = (
    unitToken: string,
    payload: Record<string, unknown> = evidence,
    key = randomUUID(),
  ) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/missions/${missionId}/submissions`,
      headers: headers(unitToken, key),
      payload,
    });
  const feedback = async (unitToken: string, submissionId: string) => {
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/submissions/${submissionId}`,
      headers: headers(unitToken),
    });
    expect(response.statusCode).toBe(200);
    return decodeMissionSubmissionFeedback(response.json());
  };
  const projection = async (eventSessionId: string) => {
    const response = await app.inject({
      url: `/api/v1/public/event-session?eventSessionId=${eventSessionId}`,
    });
    expect(response.statusCode).toBe(200);
    return decodePublicPresentationProjection(response.json());
  };
  return { app, create, command, setup, start, submit, feedback, projection };
}

describe('local workshop HTTP composition', () => {
  it('rate limits authenticated units without blocking the instructor or health probes', async () => {
    const h = harness();
    const unit = await h.setup();
    for (let index = 0; index < 240; index += 1) {
      const response = await h.app.inject({
        url: '/api/v1/unit',
        headers: headers(unit.unitToken),
      });
      expect(response.statusCode).toBe(200);
    }
    const limited = await h.app.inject({
      url: '/api/v1/unit',
      headers: headers(unit.unitToken),
    });
    expect(limited.statusCode).toBe(429);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(limited.headers['content-type']).toContain(
      'application/problem+json',
    );
    expect(limited.json()).toMatchObject({ code: 'request-rate-limited' });
    expect(limited.body).not.toContain(unit.unitToken);
    expect(
      (await h.app.inject({ url: '/api/v1/health/live' })).statusCode,
    ).toBe(200);
    expect(
      (await h.command(unit.id, 'mission.pause', 2, { missionId })).statusCode,
    ).toBe(200);
  });

  it('limits unauthenticated entry before expensive event-code verification or body handling', async () => {
    const h = harness();
    for (let index = 0; index < 120; index += 1) {
      const response = await h.app.inject({
        method: 'POST',
        url: '/api/v1/registrations',
        payload: {},
      });
      expect(response.statusCode).toBe(422);
    }
    const limited = await h.app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {},
    });
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBeDefined();
    expect(
      (await h.app.inject({ url: '/api/v1/health/ready' })).statusCode,
    ).toBe(200);
  });
  it('records actual simulator calls once and rejects forged or foreign unit evidence', async () => {
    const h = harness();
    const first = await h.setup();
    const joined = await h.app.inject({
      method: 'POST',
      url: '/api/v1/registrations',
      headers: headers(),
      payload: {
        eventCode: first.eventCode,
        displayName: 'Second synthetic unit',
        locale: 'en',
      },
    });
    const second = joined.json<{ unitToken: string }>();
    const fixtures: unknown = JSON.parse(
      await readFile(
        new URL(
          '../../../campaigns/operation-lighthouse/test/fixtures/rehearsal-submissions.json',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    if (!Array.isArray(fixtures)) throw new Error('Missing mission fixtures.');
    for (const envelope of fixtures.slice(0, 2) as unknown[]) {
      if (!isRecord(envelope) || typeof envelope.missionId !== 'string')
        throw new Error('Invalid fixture.');
      const id = envelope.missionId;
      if (id !== missionId)
        expect(
          (await h.command(first.id, 'mission.open', 1, { missionId: id }))
            .statusCode,
        ).toBe(200);
      for (const token of [first.unitToken, second.unitToken]) {
        expect((await h.start(token, id)).statusCode).toBe(200);
        const response = await h.app.inject({
          method: 'POST',
          url: `/api/v1/missions/${id}/submissions`,
          headers: headers(token),
          payload: envelope,
        });
        const evaluated = await h.feedback(
          token,
          response.json<{ submissionId: string }>().submissionId,
        );
        expect(evaluated.outcome).toBe('passed');
      }
      expect(
        (await h.command(first.id, 'mission.close', 2, { missionId: id }))
          .statusCode,
      ).toBe(200);
    }
    const id = 'connected-city';
    const url = `/api/v1/missions/${id}/tools`;
    const forecast = { tool: 'weather', operation: 'forecast', arguments: {} };
    await h.command(first.id, 'mission.open', 1, { missionId: id });
    expect(
      (
        await h.app.inject({
          method: 'POST',
          url,
          headers: headers(first.unitToken),
          payload: forecast,
        })
      ).statusCode,
    ).toBe(409);
    await h.start(first.unitToken, id);
    await h.start(second.unitToken, id);
    const catalog = await h.app.inject({
      url,
      headers: headers(first.unitToken),
    });
    expect(catalog.statusCode).toBe(200);
    const decodedCatalog = decodeSimulatorCatalog(catalog.json());
    expect(decodedCatalog.missionId).toBe(id);
    expect(
      decodedCatalog.tools.find(
        ({ tool, operation }) => tool === 'weather' && operation === 'forecast',
      )?.argumentsSchema,
    ).toMatchObject({ type: 'object', additionalProperties: false });
    expect(
      (await h.app.inject({ method: 'POST', url, payload: forecast }))
        .statusCode,
    ).toBe(401);
    const invalidScope = await h.app.inject({
      method: 'POST',
      url,
      headers: headers(first.unitToken),
      payload: { ...forecast, unitId: 'foreign' },
    });
    expect(invalidScope.statusCode).toBe(422);
    expect(invalidScope.json()).toMatchObject({ code: 'validation-failed' });
    const key = randomUUID();
    const [failed, replay] = await Promise.all(
      [1, 2].map(() =>
        h.app.inject({
          method: 'POST',
          url,
          headers: headers(first.unitToken, key),
          payload: forecast,
        }),
      ),
    );
    if (failed === undefined || replay === undefined)
      throw new Error('Missing tool responses.');
    expect(failed.json()).toEqual(replay.json());
    const receipts: SimulatorObservation[] = [
      decodeSimulatorObservation(failed.json()),
    ];
    expect(receipts[0]?.result.ok).toBe(false);
    for (const payload of [
      forecast,
      { tool: 'shelter', operation: 'list', arguments: {} },
      {
        tool: 'transport',
        operation: 'journey',
        arguments: {
          originDistrictId: 'harbor',
          destinationDistrictId: 'north-hills',
          mode: 'emergency',
        },
      },
    ]) {
      const response = await h.app.inject({
        method: 'POST',
        url,
        headers: headers(first.unitToken),
        payload,
      });
      expect(response.statusCode).toBe(200);
      receipts.push(decodeSimulatorObservation(response.json()));
    }
    expect(receipts.map(({ sequence }) => sequence)).toEqual([1, 2, 3, 4]);
    const evidence = {
      toolTrace: receipts.map(({ tool, evidenceId, result }) => ({
        tool,
        evidenceId,
        status: result.ok ? 'success' : 'failed',
      })),
      recommendation: {
        shelterId: 'north-hills-school',
        routeIds: ['harbor-old-town', 'old-town-north-hills'],
        evidenceIds: receipts
          .filter(({ result }) => result.ok)
          .map(({ evidenceId }) => evidenceId),
      },
    };
    for (const [token, expected] of [
      [first.unitToken, 'passed'],
      [second.unitToken, 'partial'],
    ] as const) {
      const response = await h.app.inject({
        method: 'POST',
        url: `/api/v1/missions/${id}/submissions`,
        headers: headers(token),
        payload: { schemaVersion: '1.0', missionId: id, evidence },
      });
      const result = await h.feedback(
        token,
        response.json<{ submissionId: string }>().submissionId,
      );
      expect(result.outcome).toBe(expected);
      expect(result.recovery?.status).toBe(
        expected === 'passed' ? 'applied' : 'not-applied',
      );
    }
    await h.command(first.id, 'mission.pause', 2, { missionId: id });
    expect(
      (
        await h.app.inject({
          method: 'POST',
          url,
          headers: headers(first.unitToken),
          payload: forecast,
        })
      ).statusCode,
    ).toBe(409);
    const publicResult = await h.app.inject({
      url: `/api/v1/public/event-session?eventSessionId=${first.id}`,
    });
    expect(
      decodePublicPresentationProjection(publicResult.json()).recovery,
    ).toMatchObject({ eligibleUnitCount: 2, contributionCount: 5 });
    for (const receipt of receipts)
      expect(publicResult.body).not.toContain(receipt.evidenceId);
  });

  it('requires explicit local instructor authentication and loopback access', async () => {
    const { app } = harness();
    expect(
      (await app.inject({ url: '/api/v1/local', remoteAddress: '192.0.2.20' }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/api/v1/event-sessions',
          payload: {
            campaignId: 'operation-lighthouse',
            defaultLocale: 'en',
            supportedLocales: ['en'],
          },
        })
      ).statusCode,
    ).toBe(401);
    expect((await app.inject({ url: '/api/v1/unit' })).statusCode).toBe(401);
  });

  it('unwraps evidence, evaluates, scores and updates a canonical public projection', async () => {
    const h = harness();
    const unit = await h.setup();
    expect((await h.start(unit.unitToken)).statusCode).toBe(200);
    const response = await h.submit(unit.unitToken);
    expect(response.statusCode).toBe(201);
    const result = await h.feedback(
      unit.unitToken,
      response.json<{ submissionId: string }>().submissionId,
    );
    expect(result.outcome).toBe('passed');
    expect(result.score).toEqual({
      missionPoints: 882,
      totalPoints: 882,
      awardedPoints: 882,
    });
    expect(
      result.rules.find((rule) => rule.ruleId === 'duplicate-detection')
        ?.status,
    ).toBe('failed');
    const projectionResponse = await h.app.inject({
      url: `/api/v1/public/event-session?eventSessionId=${unit.id}`,
    });
    const projection = decodePublicPresentationProjection(
      projectionResponse.json(),
    );
    expect(projection.activeMission).toMatchObject({
      title: 'Signal in the Storm',
      progressPercent: 100,
    });
    expect(projection.rankings).toEqual([
      { rank: 1, moderatedUnitName: 'Unit 001', score: 882 },
    ]);
    expect(
      projection.districts.map((district) => district.displayName),
    ).toEqual([
      'Harbor',
      'Old Town',
      'North Hills',
      'East Bank',
      'Civic Center',
    ]);
    expect(result.recovery).toEqual({
      policyVersion: '1.0.0',
      status: 'applied',
      districtIds: ['harbor'],
    });
    expect(projection.recoverySource).toBe('validated-decisions');
    expect(projection.collectiveRecoveryPercent).toBe(59);
    expect(projection.recovery).toEqual({
      policyVersion: '1.0.0',
      baselinePercent: 58,
      eligibleUnitCount: 1,
      contributionCount: 1,
      finaleThreshold: 80,
      finaleUnlocked: false,
    });
    expect(projection.districts[0]).toMatchObject({
      baselinePercent: 32,
      recoveryPercent: 38,
      contributionCount: 1,
    });
    for (const privateValue of [
      unit.unitToken,
      unit.reconnectSecret,
      'Synthetic private unit name',
      'severityExplanation',
      unit.unit.unitId,
      result.submissionId,
    ]) {
      expect(projectionResponse.body).not.toContain(privateValue);
    }
  });

  it('replays concurrent duplicate submissions and rejects a changed body with the same key', async () => {
    const h = harness();
    const unit = await h.setup();
    await h.start(unit.unitToken);
    const key = randomUUID();
    const [first, duplicate] = await Promise.all([
      h.submit(unit.unitToken, evidence, key),
      h.submit(unit.unitToken, evidence, key),
    ]);
    expect(first.statusCode).toBe(201);
    expect(duplicate.json()).toEqual(first.json());
    const reordered = {
      evidence: evidence.evidence,
      missionId,
      schemaVersion: '1.0',
    };
    expect((await h.submit(unit.unitToken, reordered, key)).json()).toEqual(
      first.json(),
    );
    const changed = await h.submit(
      unit.unitToken,
      { ...evidence, evidence: {} },
      key,
    );
    expect(changed.statusCode).toBe(409);
    expect(changed.json()).toMatchObject({ code: 'idempotency-key-reused' });
    const newAttempt = await h.submit(unit.unitToken);
    const result = await h.feedback(
      unit.unitToken,
      newAttempt.json<{ submissionId: string }>().submissionId,
    );
    expect(result.score).toEqual({
      missionPoints: 882,
      totalPoints: 882,
      awardedPoints: 0,
    });
    expect(result.recovery?.status).toBe('unchanged');
    expect((await h.projection(unit.id)).recovery?.contributionCount).toBe(1);
  });

  it('awards only positive per-dimension improvements across partial and passing attempts', async () => {
    const h = harness();
    const unit = await h.setup();
    await h.start(unit.unitToken);
    const partial = await h.submit(unit.unitToken, {
      ...evidence,
      evidence: {},
    });
    const partialFeedback = await h.feedback(
      unit.unitToken,
      partial.json<{ submissionId: string }>().submissionId,
    );
    expect(partialFeedback.outcome).toBe('partial');
    expect(partialFeedback.score.totalPoints).toBeGreaterThan(0);
    expect(partialFeedback.recovery?.status).toBe('not-applied');
    expect(await h.projection(unit.id)).toMatchObject({
      recoverySource: 'scenario-baseline',
      collectiveRecoveryPercent: 58,
      recovery: { contributionCount: 0, finaleUnlocked: false },
    });
    const passed = await h.submit(unit.unitToken);
    const complete = await h.feedback(
      unit.unitToken,
      passed.json<{ submissionId: string }>().submissionId,
    );
    expect(complete.score.totalPoints).toBe(882);
    const recovered = await h.projection(unit.id);
    const worse = await h.submit(unit.unitToken, { ...evidence, evidence: {} });
    const worseResult = await h.feedback(
      unit.unitToken,
      worse.json<{ submissionId: string }>().submissionId,
    );
    expect(worseResult.score.totalPoints).toBe(882);
    expect(worseResult.score.awardedPoints).toBe(0);
    expect(worseResult.recovery?.status).toBe('not-applied');
    const unchanged = await h.projection(unit.id);
    expect(unchanged.districts).toEqual(recovered.districts);
    expect(unchanged.recovery).toEqual(recovered.recovery);
  });

  it('replaces district coverage without adding points or stacking a mission contribution', async () => {
    const h = harness();
    const unit = await h.setup();
    await h.start(unit.unitToken);
    await h.submit(unit.unitToken);
    const revised = await h.submit(unit.unitToken, {
      ...evidence,
      evidence: {
        ...evidence.evidence,
        affectedServices: ['port-azure-general'],
      },
    });
    const result = await h.feedback(
      unit.unitToken,
      revised.json<{ submissionId: string }>().submissionId,
    );
    expect(result.outcome).toBe('passed');
    expect(result.score.awardedPoints).toBe(0);
    expect(result.recovery).toMatchObject({
      status: 'applied',
      districtIds: ['north-hills'],
    });
    const projection = await h.projection(unit.id);
    expect(
      projection.districts.map((district) => district.recoveryPercent),
    ).toEqual([32, 51, 87, 48, 73]);
    expect(projection.recovery?.contributionCount).toBe(1);
  });

  it('reports approved incidents without canonical attribution instead of inventing effects', async () => {
    const h = harness();
    const unit = await h.setup();
    await h.start(unit.unitToken);
    const response = await h.submit(unit.unitToken, {
      ...evidence,
      evidence: {
        ...evidence.evidence,
        affectedServices: ['unknown-service'],
      },
    });
    const result = await h.feedback(
      unit.unitToken,
      response.json<{ submissionId: string }>().submissionId,
    );
    expect(result.outcome).toBe('passed');
    expect(result.recovery).toEqual({
      policyVersion: '1.0.0',
      status: 'unattributed',
      districtIds: [],
    });
    const claimed = await h.submit(unit.unitToken, {
      ...evidence,
      evidence: {
        ...evidence.evidence,
        recoveryPercent: 100,
        finaleUnlocked: true,
      },
    });
    const rejected = await h.feedback(
      unit.unitToken,
      claimed.json<{ submissionId: string }>().submissionId,
    );
    expect(rejected.outcome).toBe('partial');
    expect(rejected.recovery?.status).toBe('not-applied');
    expect(await h.projection(unit.id)).toMatchObject({
      recoverySource: 'scenario-baseline',
      collectiveRecoveryPercent: 58,
      recovery: { contributionCount: 0, finaleUnlocked: false },
    });
  });

  it('includes units without scores in collective recovery and preserves identity on reconnect', async () => {
    const h = harness();
    const first = await h.setup();
    await h.start(first.unitToken);
    await h.submit(first.unitToken);
    const joined = await h.app.inject({
      method: 'POST',
      url: '/api/v1/registrations',
      headers: headers(),
      payload: {
        eventCode: first.eventCode,
        displayName: 'Late synthetic unit',
        locale: 'en',
      },
    });
    expect(joined.statusCode).toBe(201);
    const second = joined.json<{ unitToken: string }>();
    expect((await h.projection(first.id)).districts[0]?.recoveryPercent).toBe(
      35,
    );
    expect((await h.projection(first.id)).recovery).toMatchObject({
      eligibleUnitCount: 2,
      contributionCount: 1,
    });
    await h.start(second.unitToken);
    await h.submit(second.unitToken);
    const before = await h.projection(first.id);
    expect(before.districts[0]?.recoveryPercent).toBe(38);
    expect(before.recovery?.contributionCount).toBe(2);
    const reconnect = await h.app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: headers(),
      payload: {
        eventCode: first.eventCode,
        unitId: first.unit.unitId,
        reconnectSecret: first.reconnectSecret,
      },
    });
    expect(reconnect.statusCode).toBe(200);
    expect((await h.projection(first.id)).recovery).toEqual(before.recovery);
  });

  it('enforces envelope binding, unknown-property rejection and payload limits', async () => {
    const h = harness();
    const unit = await h.setup();
    await h.start(unit.unitToken);
    for (const payload of [
      { ...evidence, unitId: 'other-unit' },
      { ...evidence, eventSessionId: 'other-event' },
      { ...evidence, missionId: 'incident-intake' },
      { ...evidence, evidence: [] },
    ])
      expect((await h.submit(unit.unitToken, payload)).statusCode).toBe(422);
    expect(
      (
        await h.submit(unit.unitToken, {
          ...evidence,
          evidence: { text: 'x'.repeat(1_048_576) },
        })
      ).statusCode,
    ).toBe(413);
  });

  it('does not share submissions, missions or public results between events', async () => {
    const h = harness();
    const a = await h.setup();
    const b = await h.setup();
    await h.start(a.unitToken);
    const result = await h.submit(a.unitToken);
    const submissionId = result.json<{ submissionId: string }>().submissionId;
    expect(
      (
        await h.app.inject({
          url: `/api/v1/submissions/${submissionId}`,
          headers: headers(b.unitToken),
        })
      ).statusCode,
    ).toBe(404);
    const other = await h.app.inject({
      url: `/api/v1/public/event-session?eventSessionId=${b.id}`,
    });
    expect(decodePublicPresentationProjection(other.json()).rankings).toEqual(
      [],
    );
    expect(decodePublicPresentationProjection(other.json())).toMatchObject({
      recoverySource: 'scenario-baseline',
      collectiveRecoveryPercent: 58,
      recovery: { contributionCount: 0, eligibleUnitCount: 1 },
    });
    expect(
      (
        await h.app.inject({
          url: `/api/v1/missions?eventSessionId=${a.id}`,
          headers: headers(b.unitToken),
        })
      ).statusCode,
    ).toBe(422);
  });

  it('preserves progression, pause/resume, stale-version and event-closure rules', async () => {
    const h = harness();
    const unit = await h.setup();
    expect((await h.submit(unit.unitToken)).statusCode).toBe(409);
    expect(
      (
        await h.command(unit.id, 'mission.open', 1, {
          missionId: 'ground-truth',
        })
      ).statusCode,
    ).toBe(200);
    expect((await h.start(unit.unitToken, 'ground-truth')).statusCode).toBe(
      409,
    );
    await h.start(unit.unitToken);
    expect(
      (await h.command(unit.id, 'mission.pause', 2, { missionId })).statusCode,
    ).toBe(200);
    expect((await h.submit(unit.unitToken)).statusCode).toBe(409);
    expect(
      (await h.command(unit.id, 'mission.resume', 2, { missionId })).statusCode,
    ).toBe(409);
    expect(
      (await h.command(unit.id, 'mission.resume', 3, { missionId })).statusCode,
    ).toBe(200);
    expect((await h.submit(unit.unitToken)).statusCode).toBe(201);
    expect((await h.start(unit.unitToken, 'ground-truth')).statusCode).toBe(
      200,
    );
    expect(
      (await h.command(unit.id, 'event-session.close', 3)).statusCode,
    ).toBe(422);
    expect(
      (
        await h.command(
          unit.id,
          'event-session.close',
          3,
          {},
          {
            confirmationPhrase: 'CLOSE LOCAL EVENT',
          },
        )
      ).statusCode,
    ).toBe(200);
    expect((await h.submit(unit.unitToken)).statusCode).toBe(409);
    const audit = await h.app.inject({
      url: `/api/v1/event-sessions/${unit.id}/audit`,
      headers: headers(),
    });
    expect(
      audit
        .json<{ entries: { status: string }[] }>()
        .entries.some((entry) => entry.status === 'rejected'),
    ).toBe(true);
  });

  it('reconnects the same unit and delivers real localized hints', async () => {
    const h = harness();
    const unit = await h.setup();
    await h.start(unit.unitToken);
    const hint = await h.app.inject({
      method: 'POST',
      url: `/api/v1/missions/${missionId}/hints`,
      headers: headers(unit.unitToken),
      payload: {},
    });
    expect(hint.statusCode).toBe(200);
    expect(hint.json()).toMatchObject({
      level: 1,
      content: 'Start by listing the exact required output fields.',
    });
    const response = await h.app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: { 'idempotency-key': randomUUID() },
      payload: {
        eventCode: unit.eventCode,
        unitId: unit.unit.unitId,
        reconnectSecret: unit.reconnectSecret,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ unit: { unitId: string } }>().unit.unitId).toBe(
      unit.unit.unitId,
    );
    expect(response.body).not.toContain('reconnectVerifier');
    expect(response.body).not.toContain('eventCodeVerifier');
    expect(
      (
        await h.app.inject({
          method: 'POST',
          url: '/api/v1/auth/refresh',
          headers: { 'idempotency-key': randomUUID() },
          payload: {
            eventCode: unit.eventCode,
            unitId: unit.unit.unitId,
            reconnectSecret: 'wrong',
          },
        })
      ).statusCode,
    ).toBe(403);
  });
});
