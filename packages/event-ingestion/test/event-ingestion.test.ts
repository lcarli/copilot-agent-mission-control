import { describe, expect, it } from 'vitest';

import {
  EventIngestionService,
  InMemoryEventPublisher,
  InMemoryEventStore,
  type EventPublisher,
  type ParticipantEventContext,
} from '../src/index.js';

const ids = {
  aggregate: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d411',
  correlation: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d431',
  event: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d410',
  eventSession: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d400',
  submission: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d412',
  unit: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d401',
} as const;

const participantEvent = (overrides: Record<string, unknown> = {}) => ({
  actor: {
    actorId: ids.unit,
    actorType: 'unit',
    role: 'participant',
  },
  aggregate: {
    id: ids.aggregate,
    type: 'mission-run',
    version: 1,
  },
  correlationId: ids.correlation,
  eventId: ids.event,
  eventSessionId: ids.eventSession,
  eventType: 'mission.submitted',
  idempotencyKey: 'submit-connected-city-1',
  missionId: 'connected-city',
  occurredAt: '2026-09-25T12:00:00Z',
  payload: {
    attempt: 1,
    missionRunId: ids.aggregate,
    missionVersion: '1.0.0',
    submissionId: ids.submission,
    submittedAt: '2026-09-25T12:00:00Z',
  },
  recordedAt: '2026-09-25T12:00:01Z',
  schemaVersion: '1.0',
  unitId: ids.unit,
  visibility: 'unit',
  ...overrides,
});

const context: ParticipantEventContext = {
  eventSessionId: ids.eventSession,
  eventSessionStatus: 'active',
  operation: 'POST /api/v1/missions/connected-city/submissions',
  unitId: ids.unit,
  unitStatus: 'active',
};

const createService = (
  publisher: EventPublisher = new InMemoryEventPublisher(),
) => {
  const store = new InMemoryEventStore();
  const service = new EventIngestionService({ publisher, store });
  return { publisher, service, store };
};

describe('participant event ingestion', () => {
  it('validates, stores, and publishes an authorized event', async () => {
    const { publisher, service, store } = createService();
    const result = await service.ingest(participantEvent(), context);

    expect(result.replayed).toBe(false);
    await expect(store.list(ids.eventSession)).resolves.toHaveLength(1);
    expect(
      (publisher as InMemoryEventPublisher).publishedEvents(),
    ).toHaveLength(1);
  });

  it('rejects invalid contracts before storage', async () => {
    const { service, store } = createService();

    await expect(
      service.ingest(participantEvent({ schemaVersion: '2.0' }), context),
    ).rejects.toMatchObject({
      code: 'event-invalid',
    });
    await expect(store.list(ids.eventSession)).resolves.toHaveLength(0);
  });

  it('rejects cross-unit and client-forged aggregate scope', async () => {
    const { service } = createService();

    await expect(
      service.ingest(
        participantEvent({
          unitId: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d499',
        }),
        context,
      ),
    ).rejects.toMatchObject({ code: 'event-scope-denied' });
    await expect(
      service.ingest(
        participantEvent({
          aggregate: {
            id: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d499',
            type: 'mission-run',
            version: 1,
          },
        }),
        context,
      ),
    ).rejects.toMatchObject({ code: 'event-scope-denied' });
  });

  it('blocks inactive events and muted units', async () => {
    const { service } = createService();

    await expect(
      service.ingest(participantEvent(), {
        ...context,
        eventSessionStatus: 'paused',
      }),
    ).rejects.toMatchObject({ code: 'event-session-not-active' });
    await expect(
      service.ingest(participantEvent(), {
        ...context,
        unitStatus: 'muted',
      }),
    ).rejects.toMatchObject({ code: 'unit-muted' });
  });

  it('replays equivalent idempotent requests without republishing', async () => {
    const { publisher, service } = createService();

    const first = await service.ingest(participantEvent(), context);
    const replay = await service.ingest(participantEvent(), context);

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(
      (publisher as InMemoryEventPublisher).publishedEvents(),
    ).toHaveLength(1);
  });

  it('rejects idempotency key reuse with a different event body', async () => {
    const { service } = createService();
    await service.ingest(participantEvent(), context);

    await expect(
      service.ingest(
        participantEvent({
          eventId: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d413',
          payload: {
            ...participantEvent().payload,
            attempt: 2,
          },
        }),
        context,
      ),
    ).rejects.toMatchObject({ code: 'idempotency-key-reused' });
  });

  it('rejects duplicate aggregate versions under different idempotency keys', async () => {
    const { service } = createService();
    await service.ingest(participantEvent(), context);

    await expect(
      service.ingest(
        participantEvent({
          eventId: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d413',
          idempotencyKey: 'another-key',
        }),
        context,
      ),
    ).rejects.toMatchObject({ code: 'aggregate-version-conflict' });
  });

  it('retries a pending publication on an equivalent replay', async () => {
    let attempts = 0;
    const published: unknown[] = [];
    const publisher: EventPublisher = {
      publish: (event) => {
        attempts += 1;
        if (attempts === 1) {
          return Promise.reject(new Error('SignalR unavailable'));
        }
        published.push(event);
        return Promise.resolve();
      },
    };
    const { service } = createService(publisher);

    await expect(
      service.ingest(participantEvent(), context),
    ).rejects.toMatchObject({
      code: 'event-publication-failed',
    });
    await expect(
      service.ingest(participantEvent(), context),
    ).resolves.toMatchObject({
      replayed: true,
    });
    expect(published).toHaveLength(1);
  });
});
