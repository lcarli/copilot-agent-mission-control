export type HintLevel = 1 | 2 | 3;

export interface HintDefinition {
  readonly level: HintLevel;
  readonly contentKey: string;
}

export interface HintPolicy {
  readonly missionId: string;
  readonly missionVersion: string;
  readonly hints: readonly HintDefinition[];
  readonly bonusAdjustments: Readonly<
    Record<'level1' | 'level2' | 'level3', number>
  >;
}

export interface HintAccessContext {
  readonly eventSessionId: string;
  readonly eventStatus: 'open' | 'paused' | 'closed';
  readonly unitId: string;
  readonly unitStatus:
    | 'registered'
    | 'ready'
    | 'active'
    | 'disconnected'
    | 'muted'
    | 'withdrawn'
    | 'completed';
  readonly missionId: string;
  readonly missionVersion: string;
  readonly missionRunStatus:
    'locked' | 'available' | 'active' | 'submitted' | 'blocked' | 'completed';
}

export interface RequestHintInput {
  readonly eventSessionId: string;
  readonly idempotencyKey: string;
  readonly missionId: string;
  readonly unitId: string;
}

export interface HintUsage {
  readonly hintUsageId: string;
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId: string;
  readonly missionVersion: string;
  readonly level: HintLevel;
  readonly contentKey: string;
  readonly bonusAdjustmentPoints: number;
  readonly idempotencyKey: string;
  readonly requestedAt: string;
  readonly deliveredAt: string;
}

export interface HintContextResolver {
  resolve(input: RequestHintInput): Promise<HintAccessContext>;
}

export interface HintPolicyResolver {
  resolve(missionId: string, missionVersion: string): Promise<HintPolicy>;
}
