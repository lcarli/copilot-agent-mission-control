import { v7 as uuidV7 } from 'uuid';

import { ScoringError } from './errors.js';
import type { ScoreLedgerRepository } from './repository.js';
import {
  scoreDimensions,
  type RankedUnit,
  type RankingCandidate,
  type ScoreDimension,
  type ScoreLedgerEntry,
  type ScoreProjection,
  type ScoringPolicy,
  type ValidationScoreInput,
} from './types.js';

export interface ScoringEngineOptions {
  readonly now?: () => Date;
  readonly policy: ScoringPolicy;
  readonly repository: ScoreLedgerRepository;
}

const baseDimensions: readonly ScoreDimension[] = [
  'requiredOutcome',
  'evidenceAndGrounding',
  'reliability',
  'explainability',
];

const emptyDimensions = (): Record<ScoreDimension, number> => ({
  efficiency: 0,
  evidenceAndGrounding: 0,
  explainability: 0,
  reliability: 0,
  requiredOutcome: 0,
});

export class ScoringEngine {
  readonly #now: () => Date;
  readonly #policy: ScoringPolicy;
  readonly #repository: ScoreLedgerRepository;

  public constructor(options: ScoringEngineOptions) {
    this.#now = options.now ?? (() => new Date());
    this.#policy = options.policy;
    this.#repository = options.repository;
    this.#validatePolicy();
  }

  public async awardValidation(
    input: ValidationScoreInput,
  ): Promise<readonly ScoreLedgerEntry[]> {
    this.#validateInput(input);
    const deduplicationKey = `validation:${input.eventSessionId}:${input.sourceId}`;
    if (input.outcome === 'retry' || input.outcome === 'blocked') {
      await this.#repository.appendOnce(deduplicationKey, []);
      return [];
    }

    const createdAt = this.#now().toISOString();
    const entries: ScoreLedgerEntry[] = [];
    for (const dimension of baseDimensions) {
      const points = Math.floor(
        (input.maximumPoints * input.dimensionScores[dimension]) / 10_000,
      );
      if (points > 0) {
        entries.push(
          this.#entry(input, createdAt, 'validation-award', points, dimension),
        );
      }
    }

    const efficiencyPoints = Math.floor(
      (input.maximumPoints * input.dimensionScores.efficiency) / 10_000,
    );
    if (efficiencyPoints > 0) {
      entries.push(
        this.#entry(
          input,
          createdAt,
          'advanced-bonus',
          efficiencyPoints,
          'efficiency',
        ),
      );
    }
    if (input.advancedBonusPoints > 0) {
      entries.push(
        this.#entry(
          input,
          createdAt,
          'advanced-bonus',
          input.advancedBonusPoints,
        ),
      );
    }

    const availableBonus = efficiencyPoints + input.advancedBonusPoints;
    const hintPenalty = Math.min(
      availableBonus,
      input.level3Hints * this.#policy.level3HintPenaltyPoints,
    );
    if (hintPenalty > 0) {
      entries.push(
        this.#entry(input, createdAt, 'hint-adjustment', -hintPenalty),
      );
    }

    const appended = await this.#repository.appendOnce(
      deduplicationKey,
      entries,
    );
    return appended ? entries : [];
  }

  public async appendAdjustment(options: {
    readonly entryType: 'instructor-adjustment' | 'correction';
    readonly eventSessionId: string;
    readonly missionId?: string;
    readonly points: number;
    readonly reasonCode: string;
    readonly sourceId: string;
    readonly unitId: string;
  }): Promise<readonly ScoreLedgerEntry[]> {
    if (
      !Number.isInteger(options.points) ||
      options.points === 0 ||
      options.reasonCode.trim().length === 0
    ) {
      throw new ScoringError('score-adjustment-invalid');
    }
    const current = await this.project(options.eventSessionId, options.unitId);
    if (current.totalPoints + options.points < 0) {
      throw new ScoringError('score-would-be-negative');
    }

    const entry: ScoreLedgerEntry = {
      createdAt: this.#now().toISOString(),
      entryType: options.entryType,
      eventSessionId: options.eventSessionId,
      ...(options.missionId === undefined
        ? {}
        : { missionId: options.missionId }),
      points: options.points,
      reasonCode: options.reasonCode,
      scoreEntryId: uuidV7(),
      sourceId: options.sourceId,
      unitId: options.unitId,
    };
    const appended = await this.#repository.appendOnce(
      `${options.entryType}:${options.eventSessionId}:${options.sourceId}`,
      [entry],
    );
    return appended ? [entry] : [];
  }

  public async project(
    eventSessionId: string,
    unitId: string,
  ): Promise<ScoreProjection> {
    const entries = await this.#repository.list(eventSessionId, unitId);
    const byDimension = emptyDimensions();
    const byMission: Record<string, number> = {};
    let basePoints = 0;
    let bonusPoints = 0;
    let adjustmentPoints = 0;

    for (const entry of entries) {
      if (entry.entryType === 'validation-award') {
        basePoints += entry.points;
      } else if (entry.entryType === 'advanced-bonus') {
        bonusPoints += entry.points;
      } else {
        adjustmentPoints += entry.points;
      }
      if (entry.dimension !== undefined) {
        byDimension[entry.dimension] += entry.points;
      }
      if (entry.missionId !== undefined) {
        byMission[entry.missionId] =
          (byMission[entry.missionId] ?? 0) + entry.points;
      }
    }

    return {
      adjustmentPoints,
      basePoints,
      bonusPoints,
      byDimension,
      byMission,
      eventSessionId,
      totalPoints: basePoints + bonusPoints + adjustmentPoints,
      unitId,
    };
  }

  public rank(candidates: readonly RankingCandidate[]): readonly RankedUnit[] {
    const excluded = new Set(this.#policy.excludeUnitStatuses ?? []);
    return candidates
      .filter(
        ({ unitStatus }) => !excluded.has(unitStatus as 'muted' | 'withdrawn'),
      )
      .toSorted((left, right) => {
        const totalDifference =
          right.projection.totalPoints - left.projection.totalPoints;
        if (totalDifference !== 0) {
          return totalDifference;
        }
        const dimensions: readonly ScoreDimension[] = [
          'requiredOutcome',
          'evidenceAndGrounding',
          'reliability',
        ];
        for (const dimension of dimensions) {
          const difference =
            right.projection.byDimension[dimension] -
            left.projection.byDimension[dimension];
          if (difference !== 0) {
            return difference;
          }
        }
        if (left.level3Hints !== right.level3Hints) {
          return left.level3Hints - right.level3Hints;
        }
        const leftTime =
          left.finalPassingValidationAt ?? '9999-12-31T23:59:59Z';
        const rightTime =
          right.finalPassingValidationAt ?? '9999-12-31T23:59:59Z';
        const time = leftTime.localeCompare(rightTime);
        return time !== 0 ? time : left.unitId.localeCompare(right.unitId);
      })
      .map((candidate, index) => ({
        ...candidate,
        rank: index + 1,
      }));
  }

  #entry(
    input: ValidationScoreInput,
    createdAt: string,
    entryType: ScoreLedgerEntry['entryType'],
    points: number,
    dimension?: ScoreDimension,
  ): ScoreLedgerEntry {
    return {
      createdAt,
      ...(dimension === undefined ? {} : { dimension }),
      entryType,
      eventSessionId: input.eventSessionId,
      missionId: input.missionId,
      points,
      reasonCode:
        entryType === 'hint-adjustment'
          ? 'level-3-hint-used'
          : 'validation-result',
      scoreEntryId: uuidV7(),
      sourceId: input.sourceId,
      unitId: input.unitId,
    };
  }

  #validatePolicy(): void {
    const total = scoreDimensions.reduce(
      (sum, dimension) => sum + this.#policy.dimensionWeights[dimension],
      0,
    );
    if (
      total !== 10_000 ||
      scoreDimensions.some(
        (dimension) =>
          !Number.isInteger(this.#policy.dimensionWeights[dimension]) ||
          this.#policy.dimensionWeights[dimension] < 0,
      ) ||
      !Number.isInteger(this.#policy.level3HintPenaltyPoints) ||
      this.#policy.level3HintPenaltyPoints < 0
    ) {
      throw new ScoringError('scoring-policy-invalid');
    }
  }

  #validateInput(input: ValidationScoreInput): void {
    if (
      !Number.isInteger(input.maximumPoints) ||
      input.maximumPoints < 0 ||
      !Number.isInteger(input.advancedBonusPoints) ||
      input.advancedBonusPoints < 0 ||
      !Number.isInteger(input.level3Hints) ||
      input.level3Hints < 0 ||
      scoreDimensions.some((dimension) => {
        const score = input.dimensionScores[dimension];
        return (
          !Number.isInteger(score) ||
          score < 0 ||
          score > this.#policy.dimensionWeights[dimension]
        );
      })
    ) {
      throw new ScoringError('validation-score-invalid');
    }
  }
}
