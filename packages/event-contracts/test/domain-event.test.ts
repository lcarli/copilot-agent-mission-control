import { describe, expect, it } from 'vitest';

import {
  EVENT_SCHEMA_VERSION,
  EventContractValidationError,
  assertDomainEvent,
  domainEventSchemas,
  domainEventTypes,
  isDomainEventType,
  validateDomainEvent,
} from '../src/index.js';

const uuid = {
  aggregate: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d411',
  actor: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d401',
  correlation: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d431',
  event: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d430',
  eventSession: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d400',
  missionRun: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d412',
  submission: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d410',
  unit: '018f6f4e-7e8f-7b6d-9b3b-9f690c46d402',
} as const;

const validSubmissionEvent = {
  schemaVersion: EVENT_SCHEMA_VERSION,
  eventId: uuid.event,
  eventType: 'mission.submitted',
  occurredAt: '2026-09-25T14:00:00Z',
  recordedAt: '2026-09-25T14:00:01Z',
  eventSessionId: uuid.eventSession,
  unitId: uuid.unit,
  missionId: 'ground-truth',
  actor: {
    actorType: 'unit',
    actorId: uuid.actor,
    role: 'participant',
  },
  correlationId: uuid.correlation,
  idempotencyKey: 'submission:unit:ground-truth:2',
  aggregate: {
    type: 'mission-run',
    id: uuid.aggregate,
    version: 7,
  },
  visibility: 'unit',
  payload: {
    submissionId: uuid.submission,
    missionRunId: uuid.missionRun,
    missionVersion: '1.0.0',
    attempt: 2,
    submittedAt: '2026-09-25T14:00:00Z',
  },
} as const;

describe('domain event catalog', () => {
  it('contains one schema for every declared event type', () => {
    expect(domainEventTypes).toHaveLength(30);
    expect(new Set(domainEventTypes).size).toBe(domainEventTypes.length);
    expect(Object.keys(domainEventSchemas)).toEqual(domainEventTypes);
  });

  it('provides a type guard for registered event types', () => {
    expect(isDomainEventType('mission.submitted')).toBe(true);
    expect(isDomainEventType('mission.unknown')).toBe(false);
  });
});

describe('domain event validation', () => {
  it('accepts a valid versioned event and preserves its type', () => {
    const result = validateDomainEvent(validSubmissionEvent);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.eventType).toBe('mission.submitted');
      if (result.value.eventType !== 'mission.submitted') {
        throw new Error('Expected a mission.submitted event.');
      }
      expect(result.value.payload.submissionId).toBe(uuid.submission);
    }
  });

  it('rejects an unsupported schema version before payload validation', () => {
    const result = validateDomainEvent({
      ...validSubmissionEvent,
      schemaVersion: '2.0',
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'unsupported-schema-version',
        issues: [{ path: '/schemaVersion' }],
      },
    });
  });

  it('rejects unknown event types', () => {
    const result = validateDomainEvent({
      ...validSubmissionEvent,
      eventType: 'mission.unknown',
    });

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'unsupported-event-type',
        issues: [{ path: '/eventType' }],
      },
    });
  });

  it('rejects invalid UUID versions, payloads, and unknown properties', () => {
    const result = validateDomainEvent({
      ...validSubmissionEvent,
      eventId: '018f6f4e-7e8f-4b6d-9b3b-9f690c46d430',
      unexpected: true,
      payload: {
        ...validSubmissionEvent.payload,
        attempt: 0,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('invalid-event');
      expect(result.error.issues.map((issue) => issue.path)).toEqual(
        expect.arrayContaining(['/eventId', '/payload/attempt', '/unexpected']),
      );
    }
  });

  it('requires unit and mission scope for participant mission events', () => {
    const withoutMission: Record<string, unknown> = {
      ...validSubmissionEvent,
    };
    delete withoutMission.missionId;
    const result = validateDomainEvent(withoutMission);

    expect(result).toMatchObject({
      success: false,
      error: {
        code: 'invalid-event',
      },
    });
  });

  it('throws a stable contract error from the assertion helper', () => {
    expect(() => assertDomainEvent(null)).toThrow(EventContractValidationError);

    try {
      assertDomainEvent(null);
    } catch (error) {
      expect(error).toBeInstanceOf(EventContractValidationError);
      expect((error as EventContractValidationError).code).toBe(
        'invalid-envelope',
      );
    }
  });
});
