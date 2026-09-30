import {
  EventManagementError,
  type EventSession,
  type EventUnitRepository,
  type Unit,
} from '@mission-control/event-management';
import {
  InMemoryHintUsageRepository,
  type HintPolicy,
  type HintUsageRepository,
  type RequestHintInput,
} from '@mission-control/hint-system';
import {
  MissionManagementError,
  type MissionLifecycle,
  type MissionRepository,
  type UnitMissionProgress,
} from '@mission-control/mission-management';
import type {
  ScoreLedgerEntry,
  ScoreLedgerRepository,
} from '@mission-control/scoring';
import type {
  ValidationResult,
  ValidationResultRepository,
} from '@mission-control/validation-worker';

import type { DurableWorkshopStore } from './store.js';
import { stateProblem } from './values.js';

export class DurableEventRepository implements EventUnitRepository {
  constructor(private readonly store: DurableWorkshopStore) {}

  async createEventSession(event: EventSession) {
    if ((await this.getEventSession(event.eventSessionId)) !== undefined)
      throw new EventManagementError('event-version-conflict');
    this.store.put('event', [], event, event.eventSessionId);
  }

  getEventSession(eventSessionId: string) {
    return this.store.get('event', [], eventSessionId);
  }

  listEventSessions() {
    return this.store.query('event');
  }

  findEventSessionsByCodeLookup(lookup: string) {
    return this.store.query('event', undefined, [
      { field: 'eventCodeLookup', value: lookup },
    ]);
  }

  async updateEventSession(event: EventSession, expectedVersion: number) {
    const current = await this.getEventSession(event.eventSessionId);
    if (current === undefined)
      throw new EventManagementError('event-not-found');
    if (current.version !== expectedVersion)
      throw new EventManagementError('event-version-conflict');
    this.store.put('event', [], event, event.eventSessionId);
  }

  async createUnit(unit: Unit) {
    if ((await this.getEventSession(unit.eventSessionId)) === undefined)
      throw new EventManagementError('event-not-found');
    const units = await this.listUnits(unit.eventSessionId);
    if (
      units.some(
        (existing) =>
          existing.normalizedDisplayName === unit.normalizedDisplayName &&
          existing.status !== 'withdrawn',
      )
    )
      throw new EventManagementError('display-name-unavailable');
    if ((await this.getUnit(unit.eventSessionId, unit.unitId)) !== undefined)
      throw new EventManagementError('event-version-conflict');
    this.store.put('unit', [unit.unitId], unit, unit.eventSessionId);
  }

  getUnit(eventSessionId: string, unitId: string) {
    return this.store.get('unit', [unitId], eventSessionId);
  }

  async updateUnit(unit: Unit, expectedVersion: number) {
    const current = await this.getUnit(unit.eventSessionId, unit.unitId);
    if (current === undefined) throw new EventManagementError('unit-not-found');
    if (current.version !== expectedVersion)
      throw new EventManagementError('event-version-conflict');
    this.store.put('unit', [unit.unitId], unit, unit.eventSessionId);
  }

  async listUnits(eventSessionId: string) {
    if ((await this.getEventSession(eventSessionId)) === undefined)
      throw new EventManagementError('event-not-found');
    return (await this.store.query('unit', eventSessionId)).toSorted(
      (left, right) =>
        left.createdAt.localeCompare(right.createdAt) ||
        left.unitId.localeCompare(right.unitId),
    );
  }
}

export class DurableMissionRepository implements MissionRepository {
  constructor(private readonly store: DurableWorkshopStore) {}

  async createMission(mission: MissionLifecycle) {
    if (
      (await this.getMission(mission.eventSessionId, mission.missionId)) !==
      undefined
    )
      throw new MissionManagementError('mission-version-conflict');
    this.store.put(
      'mission',
      [mission.missionId],
      mission,
      mission.eventSessionId,
    );
  }

  getMission(eventSessionId: string, missionId: string) {
    return this.store.get('mission', [missionId], eventSessionId);
  }

  async listMissions(eventSessionId: string) {
    return (await this.store.query('mission', eventSessionId)).toSorted(
      (left, right) =>
        left.prerequisiteMissions.length - right.prerequisiteMissions.length,
    );
  }

  async updateMission(mission: MissionLifecycle, expectedVersion: number) {
    const current = await this.getMission(
      mission.eventSessionId,
      mission.missionId,
    );
    if (current === undefined)
      throw new MissionManagementError('mission-not-found');
    if (current.version !== expectedVersion)
      throw new MissionManagementError('mission-version-conflict');
    this.store.put(
      'mission',
      [mission.missionId],
      mission,
      mission.eventSessionId,
    );
  }

  async createUnitProgress(progress: UnitMissionProgress) {
    if (
      (await this.getUnitProgress(
        progress.eventSessionId,
        progress.unitId,
        progress.missionId,
      )) !== undefined
    )
      throw new MissionManagementError('mission-version-conflict');
    this.store.put(
      'progress',
      [progress.unitId, progress.missionId],
      progress,
      progress.eventSessionId,
    );
  }

  getUnitProgress(eventSessionId: string, unitId: string, missionId: string) {
    return this.store.get('progress', [unitId, missionId], eventSessionId);
  }

  async listUnitProgress(eventSessionId: string, unitId: string) {
    return (await this.store.query('progress', eventSessionId)).filter(
      (progress) => progress.unitId === unitId,
    );
  }

  async updateUnitProgress(
    progress: UnitMissionProgress,
    expectedVersion: number,
  ) {
    const current = await this.getUnitProgress(
      progress.eventSessionId,
      progress.unitId,
      progress.missionId,
    );
    if (current === undefined)
      throw new MissionManagementError('unit-mission-not-found');
    if (current.version !== expectedVersion)
      throw new MissionManagementError('mission-version-conflict');
    this.store.put(
      'progress',
      [progress.unitId, progress.missionId],
      progress,
      progress.eventSessionId,
    );
  }
}

export class DurableScoreRepository implements ScoreLedgerRepository {
  constructor(private readonly store: DurableWorkshopStore) {}

  async appendOnce(
    deduplicationKey: string,
    entries: readonly ScoreLedgerEntry[],
  ) {
    if ((await this.store.get('award', [deduplicationKey])) !== undefined)
      return false;
    if (
      entries.some((entry) => entry.eventSessionId !== this.store.partition())
    )
      throw stateProblem('state-scope-invalid', 500);
    this.store.put('award', [deduplicationKey], { deduplicationKey, entries });
    return true;
  }

  async list(eventSessionId: string, unitId?: string) {
    return (await this.store.query('award', eventSessionId))
      .flatMap(({ entries }) => entries)
      .filter((entry) => unitId === undefined || entry.unitId === unitId);
  }
}

export class DurableValidationRepository implements ValidationResultRepository {
  constructor(private readonly store: DurableWorkshopStore) {}

  get(validationRequestId: string) {
    return this.store.get('validation', [validationRequestId]);
  }

  async saveOnce(result: ValidationResult) {
    const existing = await this.get(result.validationRequestId);
    if (existing !== undefined) return existing;
    this.store.put('validation', [result.validationRequestId], result);
    return result;
  }
}

export class DurableHintRepository implements HintUsageRepository {
  constructor(private readonly store: DurableWorkshopStore) {}

  async getReplay(input: RequestHintInput) {
    return (
      await this.list(input.eventSessionId, input.unitId, input.missionId)
    ).find((usage) => usage.idempotencyKey === input.idempotencyKey);
  }

  async deliverNext(
    input: RequestHintInput,
    policy: HintPolicy,
    deliveredAt: string,
  ) {
    const usages = await this.list(
      input.eventSessionId,
      input.unitId,
      input.missionId,
    );
    const repository = new InMemoryHintUsageRepository(usages);
    const usage = await repository.deliverNext(input, policy, deliveredAt);
    this.store.put('hint', [usage.hintUsageId], usage, usage.eventSessionId);
    return usage;
  }

  async list(eventSessionId: string, unitId: string, missionId?: string) {
    return (await this.store.query('hint', eventSessionId))
      .filter(
        (usage) =>
          usage.unitId === unitId &&
          (missionId === undefined || usage.missionId === missionId),
      )
      .toSorted((left, right) => left.level - right.level);
  }
}
