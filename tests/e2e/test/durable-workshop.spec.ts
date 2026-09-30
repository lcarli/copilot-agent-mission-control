import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  ApiProblem,
  buildHostedWorkshopApp,
  createDurableWorkshopData,
  loadConfig,
  type WorkshopRuntime,
} from '@mission-control/api';
import {
  decodeMissionSubmissionFeedback,
  decodePublicPresentationProjection,
  decodeSimulatorObservation,
} from '@mission-control/event-contracts';
import { test, expect } from '@playwright/test';

import { FileDocumentBackend } from './support/file-document-backend.js';
import {
  groundRehearsalEvidence,
  readRehearsalEnvelopes,
  requiredString,
} from './support/workshop-fixtures.js';

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'lighthouse-durable-'));
  const path = join(directory, 'state.json');
  const secret = randomBytes(32);
  const instructorToken = randomBytes(32).toString('hex');
  const apps: ReturnType<typeof buildHostedWorkshopApp>[] = [];
  const headers = (token = instructorToken, key: string = randomUUID()) => ({
    authorization: `Bearer ${token}`,
    'idempotency-key': key,
  });
  const open = () => {
    const backend = new FileDocumentBackend(path);
    const data = createDurableWorkshopData(backend, secret);
    const runtime: WorkshopRuntime = {
      ...data,
      profile: {
        mode: 'hosted',
        persistence: 'cosmos',
        transport: 'signalr',
        source: 'hosted-event',
        closeConfirmationPhrase: 'CLOSE EVENT',
      },
      readinessProbes: [
        { name: 'file-transaction-double', check: () => backend.check() },
      ],
      eventProbes: [
        { name: 'file-transaction-double', check: () => backend.check() },
      ],
      authorizeInstructor(authorization) {
        if (authorization !== `Bearer ${instructorToken}`)
          throw new ApiProblem({
            code: 'instructor-authentication-required',
            status: 401,
            messageKey: 'test.identity.required',
            title: 'Instructor required',
          });
        return Promise.resolve({
          actorType: 'instructor',
          actorId: 'synthetic-owner',
          role: 'event-admin',
          tenantId: 'synthetic-tenant',
        });
      },
      close: () => {
        backend.close();
        return Promise.resolve();
      },
    };
    const app = buildHostedWorkshopApp({ config: loadConfig(), runtime });
    apps.push(app);
    const command = async (
      eventSessionId: string,
      commandType: string,
      expectedVersion: number,
      missionId?: string,
    ) => {
      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/event-sessions/${eventSessionId}/commands`,
        headers: headers(),
        payload: {
          schemaVersion: '1.0',
          commandId: randomUUID(),
          eventSessionId,
          commandType,
          expectedVersion,
          requestedAt: new Date().toISOString(),
          target: missionId === undefined ? {} : { missionId },
          payload: {},
        },
      });
      expect(response.statusCode, response.body).toBe(200);
    };
    const create = async (key = randomUUID()) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/event-sessions',
        headers: headers(instructorToken, key),
        payload: {
          campaignId: 'operation-lighthouse',
          defaultLocale: 'en',
          supportedLocales: ['en', 'fr', 'pt-BR'],
        },
      });
      return response;
    };
    return { app, backend, data, command, create };
  };
  return {
    open,
    headers,
    path,
    async close() {
      await Promise.all(apps.map((app) => app.close()));
      await rm(directory, { recursive: true });
    },
  };
}

test('durable five-mission state survives reconstruction, failed commits and lost acknowledgments', async () => {
  test.setTimeout(120_000);
  const f = await fixture();
  try {
    let h = f.open();
    const created = await h.create();
    expect(created.statusCode, created.body).toBe(201);
    const event = created.json<{
      eventCode: string;
      eventSession: { eventSessionId: string };
    }>();
    const id = event.eventSession.eventSessionId;
    await h.command(id, 'event-session.open-lobby', 1);
    await h.command(id, 'event-session.start', 2);
    const registrationKey = randomUUID();
    const registration = {
      eventCode: event.eventCode,
      displayName: 'Private durable unit',
      locale: 'en',
    };
    const joinResponse = await h.app.inject({
      method: 'POST',
      url: '/api/v1/registrations',
      headers: { 'idempotency-key': registrationKey },
      payload: registration,
    });
    expect(joinResponse.statusCode, joinResponse.body).toBe(201);
    const joined = joinResponse.json<{
      unitToken: string;
      reconnectSecret: string;
      unit: { unitId: string };
    }>();
    const envelopes = await readRehearsalEnvelopes();
    const expectedRecovery = [59, 63, 68, 72, 84];
    for (const [index, original] of envelopes.entries()) {
      await h.command(id, 'mission.open', 1, original.missionId);
      const started = await h.app.inject({
        method: 'POST',
        url: `/api/v1/missions/${original.missionId}/start`,
        headers: f.headers(joined.unitToken),
        payload: {},
      });
      expect(started.statusCode, started.body).toBe(200);
      if (index === 0) {
        const hintKey = randomUUID();
        const hintRequest = {
          method: 'POST' as const,
          url: `/api/v1/missions/${original.missionId}/hints`,
          headers: f.headers(joined.unitToken, hintKey),
          payload: {},
        };
        const hint = await h.app.inject(hintRequest);
        expect(hint.statusCode, hint.body).toBe(200);
        expect(hint.json()).toMatchObject({ level: 1 });
        await h.app.close();
        h = f.open();
        expect((await h.app.inject(hintRequest)).body).toBe(hint.body);
        expect(
          (
            await h.app.inject({
              ...hintRequest,
              headers: f.headers(joined.unitToken),
            })
          ).json(),
        ).toMatchObject({ level: 2 });
      }
      let firstForecast = true;
      const grounded = await groundRehearsalEvidence(
        original,
        async (invocation) => {
          const key = randomUUID();
          const request = {
            method: 'POST' as const,
            url: `/api/v1/missions/${original.missionId}/tools`,
            headers: f.headers(joined.unitToken, key),
            payload: invocation,
          };
          if (firstForecast) {
            firstForecast = false;
            h.backend.failAfterKind = 'observation';
            const uncertain = await h.app.inject(request);
            expect(uncertain.statusCode).toBe(503);
            await h.app.close();
            h = f.open();
          }
          const response = await h.app.inject(request);
          expect(response.statusCode, response.body).toBe(200);
          const receipt = decodeSimulatorObservation(response.json());
          expect((await h.app.inject(request)).body).toBe(response.body);
          return receipt;
        },
      );
      if (grounded.observations.length > 0) {
        expect(grounded.observations[0]?.result.ok).toBe(false);
        expect(grounded.observations[1]?.result.ok).toBe(true);
        expect(grounded.observations.map(({ sequence }) => sequence)).toEqual(
          grounded.observations.map((_item, sequence) => sequence + 1),
        );
      }
      const key = randomUUID();
      const request = {
        method: 'POST' as const,
        url: `/api/v1/missions/${original.missionId}/submissions`,
        headers: f.headers(joined.unitToken, key),
        payload: grounded.envelope,
      };
      const before = await h.backend.query('submission', id);
      h.backend.failBeforeKind = 'validation';
      expect((await h.app.inject(request)).statusCode).toBe(503);
      expect((await h.backend.query('submission', id)).length).toBe(
        before.length,
      );
      const accepted = await h.app.inject(request);
      expect(accepted.statusCode, accepted.body).toBe(201);
      const submissionId = requiredString(accepted.json(), 'submissionId');
      await h.app.close();
      h = f.open();
      const duplicate = await Promise.all([
        h.app.inject(request),
        h.app.inject(request),
      ]);
      expect(duplicate.map(({ body }) => body)).toEqual([
        accepted.body,
        accepted.body,
      ]);
      const feedback = await h.app.inject({
        url: `/api/v1/submissions/${submissionId}`,
        headers: f.headers(joined.unitToken),
      });
      expect(feedback.statusCode, feedback.body).toBe(200);
      expect(decodeMissionSubmissionFeedback(feedback.json()).outcome).toBe(
        'passed',
      );
      const publicResponse = await h.app.inject({
        url: `/api/v1/public/event-session?eventSessionId=${id}`,
      });
      expect(publicResponse.statusCode, publicResponse.body).toBe(200);
      const projection = decodePublicPresentationProjection(
        publicResponse.json(),
      );
      expect(projection.source).toBe('hosted-event');
      expect(projection.collectiveRecoveryPercent).toBe(
        expectedRecovery[index],
      );
      expect(projection.recovery?.contributionCount).toBe(index + 1);
      for (const privateValue of [
        joined.unitToken,
        joined.reconnectSecret,
        joined.unit.unitId,
        registration.displayName,
        event.eventCode,
      ])
        expect(publicResponse.body).not.toContain(privateValue);
    }
    const replayRegistration = await h.app.inject({
      method: 'POST',
      url: '/api/v1/registrations',
      headers: { 'idempotency-key': registrationKey },
      payload: registration,
    });
    expect(replayRegistration.body).toBe(joinResponse.body);
    const refreshed = await h.app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      headers: f.headers(),
      payload: {
        eventCode: event.eventCode.toLowerCase(),
        unitId: joined.unit.unitId,
        reconnectSecret: joined.reconnectSecret,
      },
    });
    expect(refreshed.statusCode, refreshed.body).toBe(200);
    expect(refreshed.json()).toMatchObject({ unit: joined.unit });
    expect((await h.backend.query('observation', id)).length).toBe(10);
    expect((await h.backend.query('validation', id)).length).toBe(5);
    expect((await h.backend.query('recovery', id)).length).toBe(5);
    const hints = async () =>
      h.app.inject({
        method: 'POST',
        url: `/api/v1/missions/${envelopes[0]?.missionId ?? ''}/hints`,
        headers: f.headers(joined.unitToken),
        payload: {},
      });
    expect((await hints()).json()).toMatchObject({
      code: 'hint-mission-not-active',
    });
    const stored = await readFile(f.path, 'utf8');
    expect(stored).not.toContain(joined.reconnectSecret);
    expect(stored).not.toContain(joined.unitToken);
    expect(stored).not.toContain(event.eventCode);
    const pending = await h.backend.query('publication', id);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.document.value).toMatchObject({ pending: true });
  } finally {
    await f.close();
  }
});

test('overlapping runtime instances create one event and preserve idempotency across conflicts', async () => {
  const f = await fixture();
  try {
    const first = f.open();
    const second = f.open();
    const key = randomUUID();
    const responses = await Promise.all([
      first.create(key),
      second.create(key),
    ]);
    expect(
      responses.every(({ statusCode }) => [201, 503].includes(statusCode)),
      JSON.stringify(
        responses
          .filter(({ statusCode }) => statusCode !== 201)
          .map((response) => ({
            status: response.statusCode,
            problem: response.json<unknown>(),
          })),
      ),
    ).toBe(true);
    const replay = await second.create(key);
    expect(replay.statusCode, replay.body).toBe(201);
    expect((await first.backend.query('event')).length).toBe(1);
    for (const response of responses)
      if (response.statusCode === 201) expect(response.body).toBe(replay.body);
    const altered = await second.app.inject({
      method: 'POST',
      url: '/api/v1/event-sessions',
      headers: f.headers(undefined, key),
      payload: {
        campaignId: 'operation-lighthouse',
        defaultLocale: 'fr',
        supportedLocales: ['fr'],
      },
    });
    expect(altered.statusCode).toBe(409);
    expect(altered.json()).toMatchObject({ code: 'idempotency-key-reused' });
  } finally {
    await f.close();
  }
});

test('a transaction failure discards prior writes, retains rejection audits, and rejects cross-event access', async () => {
  const f = await fixture();
  try {
    let h = f.open();
    const created = await h.create();
    const id = requiredString(
      created.json<{ eventSession: unknown }>().eventSession,
      'eventSessionId',
    );
    const event = await h.data.eventRepository.getEventSession(id);
    expect(event).toBeDefined();
    if (event === undefined) throw new Error('Missing fixture event.');
    const key = randomUUID();
    const operation = async () => {
      await h.data.eventRepository.updateEventSession(
        { ...event, status: 'active', version: 2 },
        1,
      );
      await h.data.state.appendAudit({
        eventSessionId: id,
        commandId: key,
        commandType: 'synthetic-rejection',
        actorId: 'synthetic-owner',
        correlationId: key,
        status: 'rejected',
        recordedAt: new Date().toISOString(),
      });

      throw new ApiProblem({
        code: 'synthetic-rejection',
        status: 409,
        title: 'Rejected',
        messageKey: 'test.rejected',
      });
    };
    await expect(
      h.data.requests.mutate(id, [id, 'rollback'], key, {}, operation),
    ).rejects.toMatchObject({ status: 409 });
    expect(await h.data.eventRepository.getEventSession(id)).toEqual(event);
    expect(await h.data.state.listAudit(id)).toHaveLength(1);
    await h.app.close();
    h = f.open();
    await expect(
      h.data.requests.mutate(id, [id, 'rollback'], key, {}, operation),
    ).rejects.toMatchObject({ status: 409, code: 'synthetic-rejection' });
    expect(await h.data.state.listAudit(id)).toHaveLength(1);
    await expect(
      h.data.requests.mutate(id, [id, 'scope'], randomUUID(), {}, () =>
        h.data.eventRepository.getEventSession(randomUUID()),
      ),
    ).rejects.toMatchObject({ code: 'state-scope-invalid' });
    await expect(
      h.data.eventRepository.updateEventSession({ ...event, version: 2 }, 1),
    ).rejects.toMatchObject({ code: 'state-transaction-required' });
  } finally {
    await f.close();
  }
});

test('overlapping mutations cannot lose updates and read snapshots retry a changed revision', async () => {
  const f = await fixture();
  try {
    const first = f.open();
    const second = f.open();
    const created = await first.create();
    const id = requiredString(
      created.json<{ eventSession: unknown }>().eventSession,
      'eventSessionId',
    );
    let waiting = 0;
    const { promise: ready, resolve: release } =
      Promise.withResolvers<undefined>();
    const barrier = async () => {
      waiting += 1;
      if (waiting === 2) release(undefined);
      await ready;
    };
    first.backend.beforeBatch = barrier;
    second.backend.beforeBatch = barrier;
    const operations = [first, second].map((h, index) => {
      const key = randomUUID();
      const mutate = () =>
        h.data.requests.mutate(
          id,
          [id, 'overlap', String(index)],
          key,
          {},
          async () => {
            const event = await h.data.eventRepository.getEventSession(id);
            if (event === undefined) throw new Error('Missing event.');
            await h.data.eventRepository.updateEventSession(
              { ...event, version: event.version + 1 },
              event.version,
            );
            return { version: event.version + 1 };
          },
        );
      return { mutate };
    });
    const results = await Promise.allSettled(
      operations.map(({ mutate }) => mutate()),
    );
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    const failed = results.findIndex(({ status }) => status === 'rejected');
    expect(results[failed]).toMatchObject({
      status: 'rejected',
      reason: { code: 'state-transaction-conflict', status: 503 },
    });
    first.backend.beforeBatch = undefined;
    second.backend.beforeBatch = undefined;
    const retry = operations[failed];
    if (retry === undefined)
      throw new Error('Expected one conflicted operation.');
    expect(await retry.mutate()).toEqual({ version: 3 });
    let reads = 0;
    const snapshot = await first.data.requests.serialize(id, async () => {
      reads += 1;
      const before = await first.data.eventRepository.getEventSession(id);
      if (reads === 1) {
        await second.data.requests.mutate(
          id,
          [id, 'during-read'],
          randomUUID(),
          {},
          async () => {
            const event = await second.data.eventRepository.getEventSession(id);
            if (event === undefined) throw new Error('Missing event.');
            await second.data.eventRepository.updateEventSession(
              { ...event, version: event.version + 1 },
              event.version,
            );
            return { version: event.version + 1 };
          },
        );
      }
      const after = await first.data.eventRepository.getEventSession(id);
      return { before: before?.version, after: after?.version };
    });
    expect(reads).toBe(2);
    expect(snapshot).toEqual({ before: 4, after: 4 });
  } finally {
    await f.close();
  }
});

test('rejected creation is replayable but does not enqueue a nonexistent public event', async () => {
  const f = await fixture();
  try {
    let h = f.open();
    const request = {
      method: 'POST' as const,
      url: '/api/v1/event-sessions',
      headers: f.headers(),
      payload: {
        campaignId: 'operation-lighthouse',
        defaultLocale: 'fr',
        supportedLocales: ['en'],
      },
    };
    expect((await h.app.inject(request)).json()).toMatchObject({
      code: 'locale-not-supported',
      status: 409,
    });
    await h.app.close();
    h = f.open();
    expect((await h.app.inject(request)).json()).toMatchObject({
      code: 'locale-not-supported',
      status: 409,
    });
    expect(await h.backend.query('event')).toHaveLength(0);
    expect(await h.backend.query('publication')).toHaveLength(0);
    expect(await h.backend.query('replay')).toHaveLength(1);
  } finally {
    await f.close();
  }
});
