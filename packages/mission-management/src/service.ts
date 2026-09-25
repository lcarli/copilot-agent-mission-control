import { MissionManagementError } from './errors.js';
import type { MissionRepository } from './repository.js';
import type {
  InitializeMissionsInput,
  MissionLifecycle,
  MissionLifecycleStatus,
  UnitMissionProgress,
} from './types.js';

export interface MissionLifecycleServiceOptions {
  readonly repository: MissionRepository;
  readonly now?: () => Date;
}

export class MissionLifecycleService {
  readonly #repository: MissionRepository;
  readonly #now: () => Date;

  public constructor(options: MissionLifecycleServiceOptions) {
    this.#repository = options.repository;
    this.#now = options.now ?? (() => new Date());
  }

  public async initializeMissions(
    input: InitializeMissionsInput,
  ): Promise<readonly MissionLifecycle[]> {
    const now = this.#now().toISOString();
    const missions = [...input.missions].map(
      (definition): MissionLifecycle => ({
        eventSessionId: input.eventSessionId,
        missionId: definition.id,
        missionVersion: definition.version,
        prerequisiteMissions: [...definition.prerequisiteMissions],
        status: 'locked',
        updatedAt: now,
        version: 1,
      }),
    );
    await Promise.all(
      missions.map(async (mission) => this.#repository.createMission(mission)),
    );
    return missions;
  }

  public openMission(
    eventSessionId: string,
    missionId: string,
    expectedVersion: number,
  ): Promise<MissionLifecycle> {
    return this.#transitionMission(
      eventSessionId,
      missionId,
      expectedVersion,
      ['locked'],
      'open',
    );
  }

  public pauseMission(
    eventSessionId: string,
    missionId: string,
    expectedVersion: number,
  ): Promise<MissionLifecycle> {
    return this.#transitionMission(
      eventSessionId,
      missionId,
      expectedVersion,
      ['open'],
      'paused',
    );
  }

  public resumeMission(
    eventSessionId: string,
    missionId: string,
    expectedVersion: number,
  ): Promise<MissionLifecycle> {
    return this.#transitionMission(
      eventSessionId,
      missionId,
      expectedVersion,
      ['paused'],
      'open',
    );
  }

  public closeMission(
    eventSessionId: string,
    missionId: string,
    expectedVersion: number,
  ): Promise<MissionLifecycle> {
    return this.#transitionMission(
      eventSessionId,
      missionId,
      expectedVersion,
      ['locked', 'open', 'paused'],
      'closed',
    );
  }

  public async startMission(
    eventSessionId: string,
    unitId: string,
    missionId: string,
  ): Promise<UnitMissionProgress> {
    const mission = await this.#requiredMission(eventSessionId, missionId);
    if (mission.status !== 'open') {
      throw new MissionManagementError('mission-not-available');
    }

    const existing = await this.#repository.getUnitProgress(
      eventSessionId,
      unitId,
      missionId,
    );
    if (existing?.status === 'completed') {
      throw new MissionManagementError('mission-already-completed');
    }
    if (existing) {
      throw new MissionManagementError('mission-already-started');
    }

    const progress = await this.#repository.listUnitProgress(
      eventSessionId,
      unitId,
    );
    const completed = new Set(
      progress
        .filter(({ status }) => status === 'completed')
        .map(({ missionId: id }) => id),
    );
    if (
      mission.prerequisiteMissions.some(
        (prerequisite) => !completed.has(prerequisite),
      )
    ) {
      throw new MissionManagementError('mission-prerequisite-incomplete');
    }

    const now = this.#now().toISOString();
    const started: UnitMissionProgress = {
      eventSessionId,
      missionId,
      startedAt: now,
      status: 'active',
      unitId,
      updatedAt: now,
      version: 1,
    };
    await this.#repository.createUnitProgress(started);
    return started;
  }

  public async completeMission(
    eventSessionId: string,
    unitId: string,
    missionId: string,
    expectedVersion: number,
  ): Promise<UnitMissionProgress> {
    const progress = await this.#repository.getUnitProgress(
      eventSessionId,
      unitId,
      missionId,
    );
    if (!progress) {
      throw new MissionManagementError('unit-mission-not-found');
    }
    if (progress.version !== expectedVersion) {
      throw new MissionManagementError('mission-version-conflict');
    }
    if (progress.status === 'completed') {
      throw new MissionManagementError('mission-already-completed');
    }

    const now = this.#now().toISOString();
    const completed: UnitMissionProgress = {
      ...progress,
      completedAt: now,
      status: 'completed',
      updatedAt: now,
      version: progress.version + 1,
    };
    await this.#repository.updateUnitProgress(completed, expectedVersion);
    return completed;
  }

  async #requiredMission(
    eventSessionId: string,
    missionId: string,
  ): Promise<MissionLifecycle> {
    const mission = await this.#repository.getMission(
      eventSessionId,
      missionId,
    );
    if (!mission) {
      throw new MissionManagementError('mission-not-found');
    }
    return mission;
  }

  async #transitionMission(
    eventSessionId: string,
    missionId: string,
    expectedVersion: number,
    allowedStatuses: readonly MissionLifecycleStatus[],
    status: MissionLifecycleStatus,
  ): Promise<MissionLifecycle> {
    const mission = await this.#requiredMission(eventSessionId, missionId);
    if (mission.version !== expectedVersion) {
      throw new MissionManagementError('mission-version-conflict');
    }
    if (!allowedStatuses.includes(mission.status)) {
      throw new MissionManagementError('mission-state-invalid');
    }

    const now = this.#now().toISOString();
    const updated: MissionLifecycle = {
      ...mission,
      ...(status === 'open' && mission.status === 'locked'
        ? { openedAt: now }
        : {}),
      ...(status === 'paused' ? { pausedAt: now } : {}),
      ...(status === 'closed' ? { closedAt: now } : {}),
      status,
      updatedAt: now,
      version: mission.version + 1,
    };
    await this.#repository.updateMission(updated, expectedVersion);
    return updated;
  }
}
