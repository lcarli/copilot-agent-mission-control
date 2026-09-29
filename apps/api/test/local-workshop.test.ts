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
  return { app, create, command, setup, start, submit, feedback };
}

describe('local workshop HTTP composition', () => {
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
    expect(projection.recoverySource).toBe('scenario-baseline');
    for (const privateValue of [
      unit.unitToken,
      unit.reconnectSecret,
      'Synthetic private unit name',
      'severityExplanation',
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
  });

  it('awards only positive per-dimension improvements across partial and passing attempts', async () => {
    const h = harness();
    const unit = await h.setup();
    await h.start(unit.unitToken);
    const partial = await h.submit(unit.unitToken, {
      ...evidence,
      evidence: {},
    });
    expect(
      (
        await h.feedback(
          unit.unitToken,
          partial.json<{ submissionId: string }>().submissionId,
        )
      ).outcome,
    ).toBe('partial');
    const passed = await h.submit(unit.unitToken);
    const complete = await h.feedback(
      unit.unitToken,
      passed.json<{ submissionId: string }>().submissionId,
    );
    expect(complete.score.totalPoints).toBe(882);
    const worse = await h.submit(unit.unitToken, { ...evidence, evidence: {} });
    const worseResult = await h.feedback(
      unit.unitToken,
      worse.json<{ submissionId: string }>().submissionId,
    );
    expect(worseResult.score.totalPoints).toBe(882);
    expect(worseResult.score.awardedPoints).toBe(0);
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
