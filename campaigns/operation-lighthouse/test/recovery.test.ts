import type { ResolvedValidationContext } from '@mission-control/validation-worker';
import { describe, expect, it } from 'vitest';

import {
  LighthouseRecovery,
  lighthouseRecoveryPolicy,
  portAzureWorld,
} from '../src/index.js';

const context = (
  missionId: string,
  submission: Readonly<Record<string, unknown>>,
): ResolvedValidationContext => ({
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId,
  missionVersion: '1.0.0',
  submissionId: `submission-${missionId}`,
  submission,
  observedEvidence: [],
});

// Attribution slices of approved decisions, not substitutes for mission validation.
const decisions = [
  context('signal-in-the-storm', { affectedServices: ['water-pumping'] }),
  context('ground-truth', {}),
  context('connected-city', {
    recommendation: {
      shelterId: 'north-hills-school',
      routeIds: ['harbor-old-town', 'old-town-north-hills'],
    },
  }),
  context('specialist-network', {}),
  context('restore-the-lighthouse', {
    resourceAllocations: [
      { destinationDistrictId: 'old-town' },
      { destinationDistrictId: 'harbor' },
    ],
  }),
] as const;

const recordAll = (recovery: LighthouseRecovery, unitId = 'unit-1') => {
  for (const decision of decisions)
    recovery.recordValidation({ ...decision, unitId }, 'passed');
};

describe('Lighthouse decision recovery policy', () => {
  it('preserves the baseline without eligible contributions', () => {
    const recovery = new LighthouseRecovery();
    for (const units of [[], ['unit-1']]) {
      const projection = recovery.project('event-1', units);
      expect(projection).toMatchObject({
        source: 'scenario-baseline',
        policyVersion: '1.0.0',
        baselinePercent: 58,
        collectiveRecoveryPercent: 58,
        eligibleUnitCount: units.length,
        contributionCount: 0,
        finaleThreshold: 80,
        finaleUnlocked: false,
      });
      expect(
        projection.districts.map((district) => district.recoveryPercent),
      ).toEqual([32, 51, 86, 48, 73]);
    }
    recordAll(recovery);
    expect(recovery.project('event-1', []).collectiveRecoveryPercent).toBe(58);
    expect(recovery.project('event-1', []).finaleUnlocked).toBe(false);
  });

  it('reserves half of the recoverable range for the final response plan', () => {
    const weights = lighthouseRecoveryPolicy.missionWeights;
    expect(
      Object.values(weights).reduce((sum, weight) => sum + weight, 0),
    ).toBe(100);
    expect(weights['restore-the-lighthouse']).toBe(50);
    expect(58 + (100 - 58) * 0.5).toBe(79);
    expect(Object.isFrozen(weights)).toBe(true);
  });

  it.each(['partial', 'retry', 'blocked'] as const)(
    'does not apply %s decisions or client-claimed recovery',
    (outcome) => {
      const recovery = new LighthouseRecovery();
      expect(
        recovery.recordValidation(
          {
            ...decisions[0],
            submission: {
              ...decisions[0].submission,
              recoveryPercent: 100,
              finaleUnlocked: true,
            },
          },
          outcome,
        ),
      ).toEqual({
        policyVersion: '1.0.0',
        status: 'not-applied',
        districtIds: [],
      });
      expect(
        recovery.project('event-1', ['unit-1']).collectiveRecoveryPercent,
      ).toBe(58);
    },
  );

  it('attributes canonical services, shelter routes and proposed destinations', () => {
    const recovery = new LighthouseRecovery();
    expect(
      recovery.recordValidation(decisions[0], 'passed').districtIds,
    ).toEqual(['harbor']);
    expect(recovery.project('event-1', ['unit-1']).districts[0]).toMatchObject({
      baselinePercent: 32,
      recoveryPercent: 38,
      contributionCount: 1,
    });
    expect(
      recovery.recordValidation(decisions[2], 'passed').districtIds,
    ).toEqual(['harbor', 'old-town', 'north-hills']);
    expect(
      recovery.recordValidation(decisions[4], 'passed').districtIds,
    ).toEqual(['harbor', 'old-town']);
    for (const decision of [decisions[1], decisions[3]]) {
      expect(recovery.recordValidation(decision, 'passed').districtIds).toEqual(
        portAzureWorld.districts.map(({ districtId }) => districtId),
      );
    }
    const projection = recovery.project('event-1', ['unit-1']);
    expect(projection.collectiveRecoveryPercent).toBe(84);
    expect(
      projection.districts.map((district) => district.recoveryPercent),
    ).toEqual([100, 95, 91, 58, 78]);
    expect(projection.contributionCount).toBe(5);
  });

  it('does not farm recovery through replay, fresh IDs or duplicate destinations', () => {
    const recovery = new LighthouseRecovery();
    recordAll(recovery);
    const initial = recovery.project('event-1', ['unit-1']);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      for (const decision of decisions) {
        expect(
          recovery.recordValidation(
            {
              ...decision,
              submissionId: `new-${String(attempt)}-${decision.missionId}`,
            },
            'passed',
          ).status,
        ).toBe('unchanged');
      }
    }
    expect(
      recovery.recordValidation(
        {
          ...decisions[4],
          submission: {
            resourceAllocations: [
              { destinationDistrictId: 'harbor' },
              { destinationDistrictId: 'old-town' },
              { destinationDistrictId: 'harbor' },
            ],
          },
        },
        'passed',
      ).status,
    ).toBe('unchanged');
    expect(recovery.project('event-1', ['unit-1', 'unit-1'])).toEqual(initial);
  });

  it('replaces an approved plan rather than stacking its earlier district effects', () => {
    const recovery = new LighthouseRecovery();
    recovery.recordValidation(decisions[0], 'passed');
    const revised = context('signal-in-the-storm', {
      affectedServices: ['port-azure-general'],
    });
    expect(recovery.recordValidation(revised, 'passed')).toMatchObject({
      status: 'applied',
      districtIds: ['north-hills'],
    });
    const projection = recovery.project('event-1', ['unit-1']);
    expect(projection.contributionCount).toBe(1);
    expect(
      projection.districts.map((district) => district.recoveryPercent),
    ).toEqual([32, 51, 87, 48, 73]);
    recovery.recordValidation(decisions[0], 'partial');
    expect(recovery.project('event-1', ['unit-1'])).toEqual(projection);
  });

  it('reports unattributed incidents without guessing locations or erasing prior decisions', () => {
    const recovery = new LighthouseRecovery();
    const unattributed = context('signal-in-the-storm', {
      affectedServices: ['unknown-service'],
      location: 'Harbor',
      districtIds: ['harbor'],
    });
    expect(recovery.recordValidation(unattributed, 'passed')).toEqual({
      policyVersion: '1.0.0',
      status: 'unattributed',
      districtIds: [],
    });
    expect(recovery.project('event-1', ['unit-1']).contributionCount).toBe(0);
    recovery.recordValidation(decisions[0], 'passed');
    const before = recovery.project('event-1', ['unit-1']);
    recovery.recordValidation(unattributed, 'passed');
    expect(recovery.project('event-1', ['unit-1'])).toEqual(before);
  });

  it('uses all eligible units, including late joins with no contributions', () => {
    const recovery = new LighthouseRecovery();
    recordAll(recovery);
    expect(recovery.project('event-1', ['unit-1']).finaleUnlocked).toBe(true);
    expect(recovery.project('event-1', ['unit-1', 'unit-2'])).toMatchObject({
      eligibleUnitCount: 2,
      contributionCount: 5,
      collectiveRecoveryPercent: 71,
      finaleUnlocked: false,
    });
    recordAll(recovery, 'unit-2');
    expect(recovery.project('event-1', ['unit-1', 'unit-2'])).toMatchObject({
      eligibleUnitCount: 2,
      contributionCount: 10,
      collectiveRecoveryPercent: 84,
      finaleUnlocked: true,
    });
    expect(recovery.project('event-1', ['unit-1']).contributionCount).toBe(5);
  });

  it('keeps event and unit scope separate without exposing private identifiers', () => {
    const recovery = new LighthouseRecovery();
    recordAll(recovery);
    expect(
      recovery.project('event-2', ['unit-1']).collectiveRecoveryPercent,
    ).toBe(58);
    expect(
      recovery.project('event-1', ['another-unit']).contributionCount,
    ).toBe(0);
    const publicState = JSON.stringify(recovery.project('event-1', ['unit-1']));
    for (const privateValue of [
      'event-1',
      'unit-1',
      'submission-',
      'observedEvidence',
    ])
      expect(publicState).not.toContain(privateValue);
  });

  it('unlocks at exactly 80, not 79, and recalculates after approved replanning', () => {
    const recovery = new LighthouseRecovery();
    for (const decision of decisions.slice(0, 4))
      recovery.recordValidation(decision, 'passed');
    const plan = (district: string) =>
      context('restore-the-lighthouse', {
        resourceAllocations: [
          { destinationDistrictId: district },
          { destinationDistrictId: 'north-hills' },
        ],
      });
    for (const [district, expectedPercent, unlocked] of [
      ['east-bank', 79, false],
      ['harbor', 80, true],
      ['east-bank', 79, false],
    ] as const) {
      recovery.recordValidation(plan(district), 'passed');
      expect(recovery.project('event-1', ['unit-1'])).toMatchObject({
        collectiveRecoveryPercent: expectedPercent,
        finaleUnlocked: unlocked,
        contributionCount: 5,
      });
    }
  });

  it('does not mutate the world or retain mutable submission references', () => {
    const baseline = structuredClone(portAzureWorld);
    const services = ['water-pumping'];
    const recovery = new LighthouseRecovery();
    const feedback = recovery.recordValidation(
      context('signal-in-the-storm', { affectedServices: services }),
      'passed',
    );
    services.push('port-azure-general');
    const projection = recovery.project('event-1', ['unit-1']);
    expect(projection.districts[2]?.recoveryPercent).toBe(86);
    expect(Object.isFrozen(feedback.districtIds)).toBe(true);
    expect(Object.isFrozen(projection.districts[0])).toBe(true);
    recordAll(recovery);
    expect(portAzureWorld).toEqual(baseline);
  });

  it('surfaces broken validated-context invariants explicitly', () => {
    const recovery = new LighthouseRecovery();
    expect(() =>
      recovery.recordValidation(context('unknown-mission', {}), 'passed'),
    ).toThrow('supported Lighthouse mission');
    expect(() =>
      recovery.recordValidation(
        context('connected-city', {
          recommendation: { shelterId: 'unknown-shelter', routeIds: [] },
        }),
        'passed',
      ),
    ).toThrow('must identify a shelter');
    expect(() =>
      recovery.recordValidation(
        context('restore-the-lighthouse', {
          resourceAllocations: [{ destinationDistrictId: 'unknown-district' }],
        }),
        'passed',
      ),
    ).toThrow('must identify a city district');
  });
});
