import type { DomainEvent } from '@mission-control/event-contracts';

import type { EventPublisher } from './types.js';

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryEventPublisher implements EventPublisher {
  readonly #events: DomainEvent[] = [];

  public publish(event: DomainEvent): Promise<void> {
    this.#events.push(clone(event));
    return Promise.resolve();
  }

  public publishedEvents(): readonly DomainEvent[] {
    return this.#events.map(clone);
  }
}
