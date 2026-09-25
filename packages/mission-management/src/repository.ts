import { MissionManagementError } from './errors.js';
import type { MissionLifecycle, UnitMissionProgress } from './types.js';

export interface MissionRepository {
  createMission(mission: MissionLifecycle): Promise<void>;
  getMission(
    eventSessionId: string,
    missionId: string,
  ): Promise<MissionLifecycle | undefined>;
  listMissions(eventSessionId: string): Promise<readonly MissionLifecycle[]>;
  updateMission(
    mission: MissionLifecycle,
    expectedVersion: number,
  ): Promise<void>;
  createUnitProgress(progress: UnitMissionProgress): Promise<void>;
  getUnitProgress(
    eventSessionId: string,
    unitId: string,
    missionId: string,
  ): Promise<UnitMissionProgress | undefined>;
  listUnitProgress(
    eventSessionId: string,
    unitId: string,
  ): Promise<readonly UnitMissionProgress[]>;
  updateUnitProgress(
    progress: UnitMissionProgress,
    expectedVersion: number,
  ): Promise<void>;
}

const clone = <T>(value: T): T => structuredClone(value);
const missionKey = (eventSessionId: string, missionId: string): string =>
  `${eventSessionId}\u0000${missionId}`;
const unitMissionKey = (
  eventSessionId: string,
  unitId: string,
  missionId: string,
): string => `${eventSessionId}\u0000${unitId}\u0000${missionId}`;

export class InMemoryMissionRepository implements MissionRepository {
  readonly #missions = new Map<string, MissionLifecycle>();
  readonly #progress = new Map<string, UnitMissionProgress>();

  public createMission(mission: MissionLifecycle): Promise<void> {
    const key = missionKey(mission.eventSessionId, mission.missionId);
    if (this.#missions.has(key)) {
      throw new MissionManagementError('mission-version-conflict');
    }
    this.#missions.set(key, clone(mission));
    return Promise.resolve();
  }

  public getMission(
    eventSessionId: string,
    missionId: string,
  ): Promise<MissionLifecycle | undefined> {
    const mission = this.#missions.get(missionKey(eventSessionId, missionId));
    return Promise.resolve(mission ? clone(mission) : undefined);
  }

  public listMissions(
    eventSessionId: string,
  ): Promise<readonly MissionLifecycle[]> {
    return Promise.resolve(
      [...this.#missions.values()]
        .filter((mission) => mission.eventSessionId === eventSessionId)
        .map(clone),
    );
  }

  public updateMission(
    mission: MissionLifecycle,
    expectedVersion: number,
  ): Promise<void> {
    const key = missionKey(mission.eventSessionId, mission.missionId);
    const current = this.#missions.get(key);
    if (!current) {
      throw new MissionManagementError('mission-not-found');
    }
    if (current.version !== expectedVersion) {
      throw new MissionManagementError('mission-version-conflict');
    }
    this.#missions.set(key, clone(mission));
    return Promise.resolve();
  }

  public createUnitProgress(progress: UnitMissionProgress): Promise<void> {
    const key = unitMissionKey(
      progress.eventSessionId,
      progress.unitId,
      progress.missionId,
    );
    if (this.#progress.has(key)) {
      throw new MissionManagementError('mission-version-conflict');
    }
    this.#progress.set(key, clone(progress));
    return Promise.resolve();
  }

  public getUnitProgress(
    eventSessionId: string,
    unitId: string,
    missionId: string,
  ): Promise<UnitMissionProgress | undefined> {
    const progress = this.#progress.get(
      unitMissionKey(eventSessionId, unitId, missionId),
    );
    return Promise.resolve(progress ? clone(progress) : undefined);
  }

  public listUnitProgress(
    eventSessionId: string,
    unitId: string,
  ): Promise<readonly UnitMissionProgress[]> {
    return Promise.resolve(
      [...this.#progress.values()]
        .filter(
          (progress) =>
            progress.eventSessionId === eventSessionId &&
            progress.unitId === unitId,
        )
        .map(clone),
    );
  }

  public updateUnitProgress(
    progress: UnitMissionProgress,
    expectedVersion: number,
  ): Promise<void> {
    const key = unitMissionKey(
      progress.eventSessionId,
      progress.unitId,
      progress.missionId,
    );
    const current = this.#progress.get(key);
    if (!current) {
      throw new MissionManagementError('unit-mission-not-found');
    }
    if (current.version !== expectedVersion) {
      throw new MissionManagementError('mission-version-conflict');
    }
    this.#progress.set(key, clone(progress));
    return Promise.resolve();
  }
}
