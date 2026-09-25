export const scoreDimensions = [
  'requiredOutcome',
  'evidenceAndGrounding',
  'reliability',
  'explainability',
  'efficiency',
] as const;

export type ScoreDimension = (typeof scoreDimensions)[number];
export type ScoreEntryType =
  | 'validation-award'
  | 'advanced-bonus'
  | 'hint-adjustment'
  | 'instructor-adjustment'
  | 'correction';

export interface ScoringPolicy {
  readonly version: string;
  readonly dimensionWeights: Readonly<Record<ScoreDimension, number>>;
  readonly excludeUnitStatuses?: readonly ('muted' | 'withdrawn')[];
  readonly level3HintPenaltyPoints: number;
}

export interface ValidationScoreInput {
  readonly advancedBonusPoints: number;
  readonly completedAt?: string;
  readonly dimensionScores: Readonly<Record<ScoreDimension, number>>;
  readonly eventSessionId: string;
  readonly level3Hints: number;
  readonly maximumPoints: number;
  readonly missionId: string;
  readonly outcome: 'passed' | 'partial' | 'retry' | 'blocked';
  readonly sourceId: string;
  readonly unitId: string;
}

export interface ScoreLedgerEntry {
  readonly scoreEntryId: string;
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId?: string;
  readonly entryType: ScoreEntryType;
  readonly dimension?: ScoreDimension;
  readonly points: number;
  readonly sourceId: string;
  readonly reasonCode: string;
  readonly createdAt: string;
}

export interface ScoreProjection {
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly basePoints: number;
  readonly bonusPoints: number;
  readonly adjustmentPoints: number;
  readonly totalPoints: number;
  readonly byDimension: Readonly<Record<ScoreDimension, number>>;
  readonly byMission: Readonly<Record<string, number>>;
}

export interface RankingCandidate {
  readonly projection: ScoreProjection;
  readonly unitId: string;
  readonly unitStatus:
    | 'registered'
    | 'ready'
    | 'active'
    | 'disconnected'
    | 'muted'
    | 'withdrawn'
    | 'completed';
  readonly level3Hints: number;
  readonly finalPassingValidationAt?: string;
}

export interface RankedUnit extends RankingCandidate {
  readonly rank: number;
}
