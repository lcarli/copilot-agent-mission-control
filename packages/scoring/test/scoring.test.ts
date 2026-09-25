import { describe, expect, it } from 'vitest';

import {
  InMemoryScoreLedgerRepository,
  ScoringEngine,
  ScoringError,
  type ScoringPolicy,
  type ValidationScoreInput,
} from '../src/index.js';

const policy: ScoringPolicy = {
  dimensionWeights: {
    efficiency: 1000,
    evidenceAndGrounding: 2000,
    explainability: 1500,
    reliability: 1500,
    requiredOutcome: 4000,
  },
  excludeUnitStatuses: ['withdrawn'],
  level3HintPenaltyPoints: 25,
  version: '1.0.0',
};

const input = (
  overrides: Partial<ValidationScoreInput> = {},
): ValidationScoreInput => ({
  advancedBonusPoints: 50,
  completedAt: '2026-09-25T12:10:00Z',
  dimensionScores: {
    efficiency: 1000,
    evidenceAndGrounding: 1500,
    explainability: 1000,
    reliability: 1200,
    requiredOutcome: 4000,
  },
  eventSessionId: 'event-1',
  level3Hints: 1,
  maximumPoints: 1000,
  missionId: 'connected-city',
  outcome: 'passed',
  sourceId: 'validation-1',
  unitId: 'unit-1',
  ...overrides,
});

const createEngine = (customPolicy = policy) => {
  const repository = new InMemoryScoreLedgerRepository();
  const engine = new ScoringEngine({
    now: () => new Date('2026-09-25T12:10:01Z'),
    policy: customPolicy,
    repository,
  });
  return { engine, repository };
};

describe('scoring engine', () => {
  it('calculates base, evidence, reliability, and advanced points', async () => {
    const { engine } = createEngine();
    const entries = await engine.awardValidation(input());
    const projection = await engine.project('event-1', 'unit-1');

    expect(entries).toHaveLength(7);
    expect(projection).toMatchObject({
      adjustmentPoints: -25,
      basePoints: 770,
      bonusPoints: 150,
      totalPoints: 895,
    });
    expect(projection.byDimension).toMatchObject({
      evidenceAndGrounding: 150,
      reliability: 120,
      requiredOutcome: 400,
    });
  });

  it('never lets hints reduce core completion points', async () => {
    const { engine } = createEngine();
    await engine.awardValidation(
      input({
        advancedBonusPoints: 0,
        dimensionScores: {
          ...input().dimensionScores,
          efficiency: 0,
        },
        level3Hints: 99,
      }),
    );

    const projection = await engine.project('event-1', 'unit-1');
    expect(projection.adjustmentPoints).toBe(0);
    expect(projection.basePoints).toBe(770);
  });

  it('awards retry and blocked outcomes no points or penalties', async () => {
    const { engine } = createEngine();
    await expect(
      engine.awardValidation(input({ outcome: 'retry' })),
    ).resolves.toEqual([]);
    await expect(
      engine.awardValidation(
        input({ outcome: 'blocked', sourceId: 'validation-2' }),
      ),
    ).resolves.toEqual([]);
    await expect(engine.project('event-1', 'unit-1')).resolves.toMatchObject({
      totalPoints: 0,
    });
  });

  it('awards each validation source only once', async () => {
    const { engine } = createEngine();
    const first = await engine.awardValidation(input());
    const replay = await engine.awardValidation(input());

    expect(first.length).toBeGreaterThan(0);
    expect(replay).toEqual([]);
  });

  it('appends audited adjustments and prevents negative totals', async () => {
    const { engine } = createEngine();
    await engine.awardValidation(input());
    await engine.appendAdjustment({
      entryType: 'correction',
      eventSessionId: 'event-1',
      missionId: 'connected-city',
      points: -95,
      reasonCode: 'scoring-defect',
      sourceId: 'correction-1',
      unitId: 'unit-1',
    });

    await expect(engine.project('event-1', 'unit-1')).resolves.toMatchObject({
      adjustmentPoints: -120,
      totalPoints: 800,
    });
    await expect(
      engine.appendAdjustment({
        entryType: 'correction',
        eventSessionId: 'event-1',
        points: -1000,
        reasonCode: 'invalid',
        sourceId: 'correction-2',
        unitId: 'unit-1',
      }),
    ).rejects.toBeInstanceOf(ScoringError);
  });

  it('ranks total points first and then applies the documented tie-breakers', () => {
    const { engine } = createEngine();
    const projection = {
      adjustmentPoints: 0,
      basePoints: 100,
      bonusPoints: 0,
      byDimension: {
        efficiency: 0,
        evidenceAndGrounding: 20,
        explainability: 0,
        reliability: 15,
        requiredOutcome: 40,
      },
      byMission: {},
      eventSessionId: 'event-1',
      totalPoints: 100,
      unitId: 'unit-a',
    };
    const ranked = engine.rank([
      {
        level3Hints: 0,
        projection: {
          ...projection,
          byDimension: {
            ...projection.byDimension,
            requiredOutcome: 100,
          },
          totalPoints: 99,
          unitId: 'unit-c',
        },
        unitId: 'unit-c',
        unitStatus: 'active',
      },
      {
        finalPassingValidationAt: '2026-09-25T12:00:00Z',
        level3Hints: 1,
        projection,
        unitId: 'unit-b',
        unitStatus: 'active',
      },
      {
        finalPassingValidationAt: '2026-09-25T12:01:00Z',
        level3Hints: 0,
        projection: { ...projection, unitId: 'unit-a' },
        unitId: 'unit-a',
        unitStatus: 'active',
      },
    ]);

    expect(ranked.map(({ unitId }) => unitId)).toEqual([
      'unit-a',
      'unit-b',
      'unit-c',
    ]);
  });

  it('validates policy weights and excludes configured statuses', () => {
    expect(() =>
      createEngine({
        ...policy,
        dimensionWeights: {
          ...policy.dimensionWeights,
          efficiency: 999,
        },
      }),
    ).toThrow(ScoringError);

    const { engine } = createEngine();
    expect(
      engine.rank([
        {
          level3Hints: 0,
          projection: {
            adjustmentPoints: 0,
            basePoints: 0,
            bonusPoints: 0,
            byDimension: {
              efficiency: 0,
              evidenceAndGrounding: 0,
              explainability: 0,
              reliability: 0,
              requiredOutcome: 0,
            },
            byMission: {},
            eventSessionId: 'event-1',
            totalPoints: 0,
            unitId: 'unit-1',
          },
          unitId: 'unit-1',
          unitStatus: 'withdrawn',
        },
      ]),
    ).toEqual([]);
  });
});
