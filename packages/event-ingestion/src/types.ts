import type {
  DomainEvent,
  DomainEventType,
} from '@mission-control/event-contracts';

export type ParticipantEventType = Extract<
  DomainEventType,
  'mission.submitted'
>;

export interface ParticipantEventContext {
  readonly eventSessionId: string;
  readonly eventSessionStatus:
    'draft' | 'lobby' | 'active' | 'paused' | 'closed' | 'archived';
  readonly operation: string;
  readonly unitId: string;
  readonly unitStatus:
    | 'registered'
    | 'ready'
    | 'active'
    | 'disconnected'
    | 'muted'
    | 'withdrawn'
    | 'completed';
}

export interface IngestedEvent {
  readonly event: DomainEvent;
  readonly replayed: boolean;
}

export interface StoredEvent {
  readonly event: DomainEvent;
  readonly published: boolean;
  readonly replayed: boolean;
}

export interface EventStore {
  store(
    event: DomainEvent,
    idempotencyScope: string,
    requestHash: string,
  ): Promise<StoredEvent>;
  markPublished(eventId: string): Promise<void>;
  list(eventSessionId: string): Promise<readonly DomainEvent[]>;
}

export interface EventPublisher {
  publish(event: DomainEvent): Promise<void>;
}
