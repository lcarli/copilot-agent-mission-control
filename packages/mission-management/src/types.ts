import type { MissionDefinition } from '@mission-control/campaign-contracts';

export type MissionLifecycleStatus = 'locked' | 'open' | 'paused' | 'closed';
export type UnitMissionStatus = 'active' | 'completed';

export interface MissionLifecycle {
  readonly eventSessionId: string;
  readonly missionId: string;
  readonly missionVersion: string;
  readonly prerequisiteMissions: readonly string[];
  readonly status: MissionLifecycleStatus;
  readonly openedAt?: string;
  readonly pausedAt?: string;
  readonly closedAt?: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface UnitMissionProgress {
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId: string;
  readonly status: UnitMissionStatus;
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly updatedAt: string;
  readonly version: number;
}

export interface InitializeMissionsInput {
  readonly eventSessionId: string;
  readonly missions: Iterable<MissionDefinition>;
}
