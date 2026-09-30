import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { buildLocalWorkshopApp } from '@mission-control/api';
import {
  decodeMissionSubmissionFeedback,
  decodePublicPresentationProjection,
  decodeSimulatorObservation,
} from '@mission-control/event-contracts';
import { expect, test } from '@playwright/test';
import { createServer } from 'vite';

import {
  groundRehearsalEvidence,
  readRehearsalEnvelopes,
  requiredObject,
  requiredString,
} from './support/workshop-fixtures.js';

interface RequestOptions {
  readonly body?: unknown;
  readonly token?: string | null;
  readonly status?: number;
  readonly key?: string;
}

test('fifty units complete all missions with isolated simulator receipts and a live public browser @scale', async ({
  page,
}) => {
  test.setTimeout(180_000);
  const instructorToken = randomBytes(32).toString('hex');
  const api = buildLocalWorkshopApp({ instructorToken });
  const address = await api.listen({ host: '127.0.0.1', port: 0 });
  const vite = await createServer({
    root: fileURLToPath(
      new URL('../../../apps/command-center', import.meta.url),
    ),
    server: {
      host: '127.0.0.1',
      port: 0,
      proxy: { '/api': { target: address } },
    },
    logLevel: 'error',
  });
  let phase = 'setup';
  const timings: { phase: string; milliseconds: number }[] = [];
  const observedIds = new Set<string>();
  let observedFailures = 0;
  const request = async (
    path: string,
    options: RequestOptions = {},
  ): Promise<unknown> => {
    const requestPhase = phase;
    const started = performance.now();
    const token = options.token === undefined ? instructorToken : options.token;
    const response = await fetch(`${address}/api/v1/${path}`, {
      method: options.body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token === null ? {} : { authorization: `Bearer ${token}` }),
        'idempotency-key': options.key ?? randomUUID(),
        ...(options.body === undefined
          ? {}
          : { 'content-type': 'application/json' }),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const result: unknown = await response.json();
    timings.push({
      phase: requestPhase,
      milliseconds: performance.now() - started,
    });
    if (options.status === undefined)
      expect(
        response.ok,
        `${requestPhase}: HTTP ${String(response.status)}`,
      ).toBe(true);
    else expect(response.status).toBe(options.status);
    return result;
  };
  try {
    await vite.listen();
    const dashboard = vite.resolvedUrls?.local[0];
    if (dashboard === undefined) throw new Error('Dashboard did not start.');
    const created = requiredObject(
      await request('event-sessions', {
        body: {
          campaignId: 'operation-lighthouse',
          defaultLocale: 'en',
          supportedLocales: ['en'],
        },
      }),
    );
    const eventId = requiredString(created.eventSession, 'eventSessionId');
    const eventCode = requiredString(created, 'eventCode');
    const command = (
      commandType: string,
      expectedVersion: number,
      missionId?: string,
    ) =>
      request(`event-sessions/${eventId}/commands`, {
        body: {
          schemaVersion: '1.0',
          commandId: randomUUID(),
          commandType,
          eventSessionId: eventId,
          expectedVersion,
          requestedAt: new Date().toISOString(),
          target: missionId === undefined ? {} : { missionId },
          payload: {},
        },
      });
    const projection = async (id = eventId) =>
      decodePublicPresentationProjection(
        await request(`public/event-session?eventSessionId=${id}`, {
          token: null,
        }),
      );
    await command('event-session.open-lobby', 1);
    await command('event-session.start', 2);
    phase = 'registration';
    const units = await Promise.all(
      Array.from({ length: 50 }, async (_, index) => {
        const displayName = `Synthetic private scale unit ${String(index + 1)}`;
        const joined = requiredObject(
          await request('registrations', {
            token: null,
            body: { eventCode, displayName, locale: 'en' },
          }),
        );
        return {
          unitId: requiredString(joined.unit, 'unitId'),
          token: requiredString(joined, 'unitToken'),
          reconnectSecret: requiredString(joined, 'reconnectSecret'),
          displayName,
          totalPoints: 0,
        };
      }),
    );
    expect(new Set(units.map(({ unitId }) => unitId)).size).toBe(50);
    await page.goto(`${dashboard}?view=presentation&eventSessionId=${eventId}`);
    await expect(page.locator('.presentation-recovery > strong')).toHaveText(
      '58%',
    );
    const envelopes = await readRehearsalEnvelopes();
    const expectedRecovery = [59, 63, 68, 72, 84];
    let completedMissions = 0;
    for (const template of envelopes) {
      const missionId = template.missionId;
      phase = missionId;
      await command('mission.open', 1, missionId);
      let missionVersion = 2;
      await Promise.all(
        units.map((unit) =>
          request(`missions/${missionId}/start`, {
            token: unit.token,
            key: 'scale-start',
            body: {},
          }),
        ),
      );
      if (missionId === 'connected-city') {
        await command('mission.pause', 2, missionId);
        await expect(page.locator('.presentation-mission')).toContainText(
          'Paused',
        );
        await Promise.all(
          units.map((unit) =>
            request(`missions/${missionId}/tools`, {
              token: unit.token,
              key: 'scale-paused-call',
              status: 409,
              body: { tool: 'weather', operation: 'forecast', arguments: {} },
            }),
          ),
        );
        await command('mission.resume', 3, missionId);
        missionVersion = 4;
      }
      const packages = await Promise.all(
        units.map(async (unit) => {
          let sequence = 0;
          return groundRehearsalEvidence(template, async (invocation) => {
            sequence += 1;
            const options = {
              token: unit.token,
              key: `scale-tool-${missionId}-${String(sequence)}`,
              body: invocation,
            };
            const [original, replay] = await Promise.all([
              request(`missions/${missionId}/tools`, options),
              request(`missions/${missionId}/tools`, options),
            ]);
            expect(replay).toEqual(original);
            const receipt = decodeSimulatorObservation(original);
            expect(receipt).toMatchObject({
              eventSessionId: eventId,
              unitId: unit.unitId,
              missionId,
              sequence,
              tool: invocation.tool,
              operation: invocation.operation,
              arguments: invocation.arguments,
            });
            expect(receipt.result.ok).toBe(sequence !== 1);
            if (!receipt.result.ok) {
              expect(receipt.result.error.retryable).toBe(true);
              observedFailures += 1;
            }
            expect(observedIds.has(receipt.evidenceId)).toBe(false);
            observedIds.add(receipt.evidenceId);
            return receipt;
          });
        }),
      );
      if (
        missionId === 'connected-city' ||
        missionId === 'restore-the-lighthouse'
      ) {
        const borrowed = packages[0];
        const receiver = units[1];
        if (borrowed === undefined || receiver === undefined)
          throw new Error('Missing isolation exercise units.');
        const attempt = await request(`missions/${missionId}/submissions`, {
          token: receiver.token,
          body: borrowed.envelope,
        });
        const result = decodeMissionSubmissionFeedback(
          await request(
            `submissions/${requiredString(attempt, 'submissionId')}`,
            { token: receiver.token },
          ),
        );
        expect(result.outcome).not.toBe('passed');
        expect(result.recovery?.status).toBe('not-applied');
        expect((await projection()).recovery?.contributionCount).toBe(
          completedMissions * 50,
        );
      }
      await Promise.all(
        units.map(async (unit, index) => {
          const prepared = packages[index];
          if (prepared === undefined)
            throw new Error('Missing prepared evidence.');
          const options = {
            token: unit.token,
            key: `scale-submit-${missionId}`,
            body: prepared.envelope,
          };
          const [first, replay] = await Promise.all([
            request(`missions/${missionId}/submissions`, options),
            request(`missions/${missionId}/submissions`, options),
          ]);
          expect(replay).toEqual(first);
          const result = decodeMissionSubmissionFeedback(
            await request(
              `submissions/${requiredString(first, 'submissionId')}`,
              { token: unit.token },
            ),
          );
          expect(result.outcome).toBe('passed');
          expect(result.recovery?.status).toBe('applied');
          expect(result.score.totalPoints).toBeGreaterThan(unit.totalPoints);
          unit.totalPoints = result.score.totalPoints;
          const repeated = await request(`missions/${missionId}/submissions`, {
            ...options,
            key: `scale-fresh-attempt-${missionId}`,
          });
          const unchanged = decodeMissionSubmissionFeedback(
            await request(
              `submissions/${requiredString(repeated, 'submissionId')}`,
              { token: unit.token },
            ),
          );
          expect(unchanged.score.totalPoints).toBe(unit.totalPoints);
          expect(unchanged.score.awardedPoints).toBe(0);
          expect(unchanged.recovery?.status).toBe('unchanged');
          if (missionId === 'restore-the-lighthouse') {
            const before = prepared.observations.find(
              ({ tool }) => tool === 'resources',
            );
            const after = decodeSimulatorObservation(
              await request(`missions/${missionId}/tools`, {
                token: unit.token,
                body: {
                  tool: 'resources',
                  operation: 'inventory',
                  arguments: {},
                },
              }),
            );
            expect(before?.result.ok).toBe(true);
            expect(after.result).toEqual(before?.result);
            expect(after.sequence).toBe(7);
            expect(after.unitId).toBe(unit.unitId);
            expect(observedIds.has(after.evidenceId)).toBe(false);
            observedIds.add(after.evidenceId);
          }
        }),
      );
      completedMissions += 1;
      const snapshot = await projection();
      expect(snapshot.registeredUnitCount).toBe(50);
      expect(snapshot.activeMission.progressPercent).toBe(100);
      expect(snapshot.rankings).toHaveLength(50);
      const scores = new Set(units.map(({ totalPoints }) => totalPoints));
      expect(scores.size).toBe(1);
      expect(snapshot.rankings.every(({ score }) => scores.has(score))).toBe(
        true,
      );
      expect(snapshot.collectiveRecoveryPercent).toBe(
        expectedRecovery[completedMissions - 1],
      );
      expect(snapshot.recovery).toMatchObject({
        eligibleUnitCount: 50,
        contributionCount: completedMissions * 50,
        finaleUnlocked: completedMissions === 5,
      });
      await expect(page.locator('.presentation-recovery > strong')).toHaveText(
        `${String(snapshot.collectiveRecoveryPercent)}%`,
        { timeout: 10_000 },
      );
      await expect(page.locator('.presentation-ranking li')).toHaveCount(50);
      const publicContent =
        JSON.stringify(snapshot) + (await page.locator('body').innerText());
      for (const unit of units) {
        for (const secret of [
          unit.unitId,
          unit.token,
          unit.reconnectSecret,
          unit.displayName,
        ])
          expect(publicContent).not.toContain(secret);
      }
      for (const evidenceId of observedIds)
        expect(publicContent).not.toContain(evidenceId);
      expect(publicContent).not.toContain(eventCode);
      await command('mission.close', missionVersion, missionId);
    }
    expect(observedIds.size).toBe(550);
    expect(observedFailures).toBe(100);
    phase = 'reconnection';
    await Promise.all(
      units.map(async (unit) => {
        const refreshed = requiredObject(
          await request('auth/refresh', {
            token: null,
            body: {
              eventCode,
              unitId: unit.unitId,
              reconnectSecret: unit.reconnectSecret,
            },
          }),
        );
        expect(requiredString(refreshed.unit, 'unitId')).toBe(unit.unitId);
        unit.token = requiredString(refreshed, 'unitToken');
      }),
    );
    const final = await projection();
    expect(final.collectiveRecoveryPercent).toBe(84);
    expect(final.recovery).toMatchObject({
      eligibleUnitCount: 50,
      contributionCount: 250,
      finaleUnlocked: true,
    });
    await expect(
      page.getByText('Finale threshold reached', { exact: false }),
    ).toBeVisible();
    phase = 'isolation';
    const isolated = requiredObject(
      await request('event-sessions', {
        body: {
          campaignId: 'operation-lighthouse',
          defaultLocale: 'en',
          supportedLocales: ['en'],
        },
      }),
    );
    const other = await projection(
      requiredString(isolated.eventSession, 'eventSessionId'),
    );
    expect(other.collectiveRecoveryPercent).toBe(58);
    expect(other.rankings).toEqual([]);
    expect(other.recovery).toMatchObject({
      eligibleUnitCount: 0,
      contributionCount: 0,
      finaleUnlocked: false,
    });
    const phases = [...new Set(timings.map(({ phase: name }) => name))].map(
      (name) => {
        const values = timings
          .filter((timing) => timing.phase === name)
          .map(({ milliseconds }) => milliseconds)
          .toSorted((left, right) => left - right);
        const p95 = values[Math.ceil(values.length * 0.95) - 1];
        if (p95 === undefined) throw new Error('Missing phase timings.');
        expect(p95, `${name} p95`).toBeLessThan(5_000);
        return {
          phase: name,
          measuredRequests: values.length,
          p95Ms: Math.round(p95),
        };
      },
    );
    console.log(
      JSON.stringify({
        scenario: 'local-50-units-five-missions',
        units: 50,
        corePasses: 250,
        simulatorObservations: observedIds.size,
        observedRetryableFailures: observedFailures,
        publicBrowsers: 1,
        phases,
        scope:
          'loopback HTTP with one public browser; not Azure or human authoring',
      }),
    );
  } finally {
    await vite.close();
    await api.close();
  }
});
