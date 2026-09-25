import type { DomainEvent } from '@mission-control/event-contracts';

import { EventIngestionError } from './errors.js';
import type { EventStore, StoredEvent } from './types.js';

interface EventRecord {
  readonly event: DomainEvent;
  readonly requestHash: string;
  published: boolean;
}

interface IdempotencyRecord {
  readonly eventId: string;
  readonly requestHash: string;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryEventStore implements EventStore {
  readonly #events = new Map<string, EventRecord>();
  readonly #aggregateVersions = new Map<string, string>();
  readonly #idempotency = new Map<string, IdempotencyRecord>();

  public store(
    event: DomainEvent,
    idempotencyScope: string,
    requestHash: string,
  ): Promise<StoredEvent> {
    const idempotency = this.#idempotency.get(idempotencyScope);
    if (idempotency) {
      if (idempotency.requestHash !== requestHash) {
        throw new EventIngestionError('idempotency-key-reused');
      }
      const existing = this.#events.get(idempotency.eventId);
      if (!existing) {
        throw new Error('Idempotency record references a missing event.');
      }
      return Promise.resolve({
        event: clone(existing.event),
        published: existing.published,
        replayed: true,
      });
    }

    if (this.#events.has(event.eventId)) {
      throw new EventIngestionError('duplicate-event-id');
    }

    const aggregateVersion = [
      event.eventSessionId,
      event.aggregate.type,
      event.aggregate.id,
      String(event.aggregate.version),
    ].join('\u0000');
    if (this.#aggregateVersions.has(aggregateVersion)) {
      throw new EventIngestionError('aggregate-version-conflict');
    }

    this.#events.set(event.eventId, {
      event: clone(event),
      published: false,
      requestHash,
    });
    this.#aggregateVersions.set(aggregateVersion, event.eventId);
    this.#idempotency.set(idempotencyScope, {
      eventId: event.eventId,
      requestHash,
    });
    return Promise.resolve({
      event: clone(event),
      published: false,
      replayed: false,
    });
  }

  public markPublished(eventId: string): Promise<void> {
    const record = this.#events.get(eventId);
    if (!record) {
      throw new Error(`Cannot mark unknown event '${eventId}' as published.`);
    }
    record.published = true;
    return Promise.resolve();
  }

  public list(eventSessionId: string): Promise<readonly DomainEvent[]> {
    return Promise.resolve(
      [...this.#events.values()]
        .map(({ event }) => event)
        .filter((event) => event.eventSessionId === eventSessionId)
        .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt))
        .map(clone),
    );
  }
}
