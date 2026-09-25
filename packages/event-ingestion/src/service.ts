import { createHash } from 'node:crypto';

import {
  validateDomainEvent,
  type DomainEvent,
} from '@mission-control/event-contracts';

import { EventIngestionError } from './errors.js';
import type {
  EventPublisher,
  EventStore,
  IngestedEvent,
  ParticipantEventContext,
  ParticipantEventType,
} from './types.js';

export interface EventIngestionServiceOptions {
  readonly allowedEventTypes?: readonly ParticipantEventType[];
  readonly publisher: EventPublisher;
  readonly store: EventStore;
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalize(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashEvent(event: DomainEvent): string {
  return createHash('sha256').update(canonicalize(event)).digest('hex');
}

function idempotencyScope(
  context: ParticipantEventContext,
  event: DomainEvent,
): string {
  return [
    context.eventSessionId,
    context.unitId,
    context.operation,
    event.idempotencyKey,
  ].join('\u0000');
}

export class EventIngestionService {
  readonly #allowedEventTypes: ReadonlySet<ParticipantEventType>;
  readonly #publisher: EventPublisher;
  readonly #store: EventStore;

  public constructor(options: EventIngestionServiceOptions) {
    this.#allowedEventTypes = new Set(
      options.allowedEventTypes ?? ['mission.submitted'],
    );
    this.#publisher = options.publisher;
    this.#store = options.store;
  }

  public async ingest(
    input: unknown,
    context: ParticipantEventContext,
  ): Promise<IngestedEvent> {
    const validation = validateDomainEvent(input);
    if (!validation.success) {
      throw new EventIngestionError('event-invalid', {
        issues: validation.error.issues,
      });
    }

    const event = validation.value;
    this.#authorize(event, context);
    const stored = await this.#store.store(
      event,
      idempotencyScope(context, event),
      hashEvent(event),
    );

    if (!stored.published) {
      try {
        await this.#publisher.publish(stored.event);
        await this.#store.markPublished(stored.event.eventId);
      } catch (error) {
        throw new EventIngestionError('event-publication-failed', {
          cause: error,
        });
      }
    }

    return {
      event: stored.event,
      replayed: stored.replayed,
    };
  }

  #authorize(event: DomainEvent, context: ParticipantEventContext): void {
    if (!this.#allowedEventTypes.has(event.eventType as ParticipantEventType)) {
      throw new EventIngestionError('event-type-not-allowed');
    }
    if (context.eventSessionStatus !== 'active') {
      throw new EventIngestionError('event-session-not-active');
    }
    if (context.unitStatus === 'muted') {
      throw new EventIngestionError('unit-muted');
    }
    if (
      context.unitStatus === 'withdrawn' ||
      context.unitStatus === 'completed' ||
      context.unitStatus === 'registered'
    ) {
      throw new EventIngestionError('unit-not-active');
    }
    if (
      event.eventSessionId !== context.eventSessionId ||
      event.actor.actorType !== 'unit' ||
      event.actor.actorId !== context.unitId ||
      !('unitId' in event) ||
      event.unitId !== context.unitId ||
      event.visibility !== 'unit'
    ) {
      throw new EventIngestionError('event-scope-denied');
    }
    if (
      event.eventType === 'mission.submitted' &&
      (event.aggregate.type !== 'mission-run' ||
        event.aggregate.id !== event.payload.missionRunId)
    ) {
      throw new EventIngestionError('event-scope-denied');
    }
  }
}
