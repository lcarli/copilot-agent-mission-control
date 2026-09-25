import { EventManagementError } from './errors.js';
import type { EventSession, Unit } from './types.js';

export interface EventUnitRepository {
  createEventSession(eventSession: EventSession): Promise<void>;
  getEventSession(eventSessionId: string): Promise<EventSession | undefined>;
  listEventSessions(): Promise<readonly EventSession[]>;
  updateEventSession(
    eventSession: EventSession,
    expectedVersion: number,
  ): Promise<void>;
  createUnit(unit: Unit): Promise<void>;
  getUnit(eventSessionId: string, unitId: string): Promise<Unit | undefined>;
  updateUnit(unit: Unit, expectedVersion: number): Promise<void>;
  listUnits(eventSessionId: string): Promise<readonly Unit[]>;
}

const clone = <T>(value: T): T => structuredClone(value);

export class InMemoryEventUnitRepository implements EventUnitRepository {
  readonly #events = new Map<string, EventSession>();
  readonly #units = new Map<string, Map<string, Unit>>();

  public createEventSession(eventSession: EventSession): Promise<void> {
    if (this.#events.has(eventSession.eventSessionId)) {
      throw new EventManagementError('event-version-conflict');
    }
    this.#events.set(eventSession.eventSessionId, clone(eventSession));
    this.#units.set(eventSession.eventSessionId, new Map());
    return Promise.resolve();
  }

  public getEventSession(
    eventSessionId: string,
  ): Promise<EventSession | undefined> {
    const eventSession = this.#events.get(eventSessionId);
    return Promise.resolve(eventSession ? clone(eventSession) : undefined);
  }

  public listEventSessions(): Promise<readonly EventSession[]> {
    return Promise.resolve([...this.#events.values()].map(clone));
  }

  public updateEventSession(
    eventSession: EventSession,
    expectedVersion: number,
  ): Promise<void> {
    const current = this.#events.get(eventSession.eventSessionId);
    if (!current) {
      throw new EventManagementError('event-not-found');
    }
    if (current.version !== expectedVersion) {
      throw new EventManagementError('event-version-conflict');
    }
    this.#events.set(eventSession.eventSessionId, clone(eventSession));
    return Promise.resolve();
  }

  public createUnit(unit: Unit): Promise<void> {
    const units = this.#units.get(unit.eventSessionId);
    if (!units) {
      throw new EventManagementError('event-not-found');
    }
    if (
      [...units.values()].some(
        (existing) =>
          existing.normalizedDisplayName === unit.normalizedDisplayName &&
          existing.status !== 'withdrawn',
      )
    ) {
      throw new EventManagementError('display-name-unavailable');
    }
    units.set(unit.unitId, clone(unit));
    return Promise.resolve();
  }

  public getUnit(
    eventSessionId: string,
    unitId: string,
  ): Promise<Unit | undefined> {
    const unit = this.#units.get(eventSessionId)?.get(unitId);
    return Promise.resolve(unit ? clone(unit) : undefined);
  }

  public updateUnit(unit: Unit, expectedVersion: number): Promise<void> {
    const units = this.#units.get(unit.eventSessionId);
    if (!units) {
      throw new EventManagementError('event-not-found');
    }
    const current = units.get(unit.unitId);
    if (!current) {
      throw new EventManagementError('unit-not-found');
    }
    if (current.version !== expectedVersion) {
      throw new EventManagementError('event-version-conflict');
    }
    units.set(unit.unitId, clone(unit));
    return Promise.resolve();
  }

  public listUnits(eventSessionId: string): Promise<readonly Unit[]> {
    const units = this.#units.get(eventSessionId);
    if (!units) {
      throw new EventManagementError('event-not-found');
    }
    return Promise.resolve([...units.values()].map(clone));
  }
}
