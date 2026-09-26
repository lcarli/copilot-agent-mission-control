import { describe, expect, it } from 'vitest';

import {
  specialistNetworkContent,
  specialistNetworkValidator,
} from '../src/index.js';

const request = {
  schemaVersion: '1.0',
  validationRequestId: 'validation-4',
  submissionId: 'submission-4',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'specialist-network',
  missionVersion: '1.0.0',
  validatorId: specialistNetworkValidator.id,
  validatorVersion: specialistNetworkValidator.version,
  scoringPolicyVersion: '1.0.0',
  scenarioSeed: 'default',
  requestedAt: '2026-09-25T13:20:00Z',
  deadlineAt: '2026-09-25T13:20:05Z',
} as const;

const specialists = [
  {
    roleId: 'weather-specialist',
    responsibility: 'Assess weather hazards.',
    inputFields: ['districtId'],
    outputFields: ['forecastEvidence'],
    latencyMs: 40,
    toolsUsed: ['weather'],
  },
  {
    roleId: 'logistics-specialist',
    responsibility: 'Assess shelters and routes.',
    inputFields: ['originDistrictId'],
    outputFields: ['evacuationOption'],
    latencyMs: 55,
    toolsUsed: ['shelter', 'transport'],
  },
  {
    roleId: 'reviewer',
    responsibility: 'Verify evidence and approve decisions.',
    inputFields: ['candidateDecision'],
    outputFields: ['approval'],
    latencyMs: 25,
    toolsUsed: [],
  },
] as const;

const context = {
  submissionId: 'submission-4',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'specialist-network',
  missionVersion: '1.0.0',
  submission: {
    specialists,
    handoffs: [
      {
        sourceRole: 'reviewer',
        targetRole: 'weather-specialist',
        evidenceIds: ['incident-004'],
        payload: { request: 'Assess hazard.' },
      },
      {
        sourceRole: 'weather-specialist',
        targetRole: 'logistics-specialist',
        evidenceIds: ['forecast-1000'],
        payload: { hazard: 'storm-surge-warning' },
      },
      {
        sourceRole: 'logistics-specialist',
        targetRole: 'reviewer',
        evidenceIds: ['forecast-1000', 'journey-1'],
        payload: { recommendation: 'north-hills-school' },
      },
    ],
    review: {
      proposerRoleId: 'logistics-specialist',
      reviewerRoleId: 'reviewer',
      approved: true,
    },
    concurrentAnalyses: [
      { roleId: 'weather-specialist' },
      { roleId: 'logistics-specialist' },
    ],
    disagreements: [
      {
        detected: true,
        resolved: false,
        humanEscalationRequired: true,
      },
    ],
  },
  observedEvidence: [],
} as const;

describe('Specialist Network', () => {
  it('provides complete localized content', () => {
    for (const content of Object.values(specialistNetworkContent.content)) {
      expect(content.coreObjectives).toHaveLength(4);
      expect(content.advancedObjectives).toHaveLength(3);
      expect(content.hints).toHaveLength(3);
    }
  });

  it('passes a bounded, reviewed specialist topology', async () => {
    const result = await specialistNetworkValidator.validate(
      context,
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('passed');
    expect(result.dimensionScores.reliability).toBe(95);
    expect(result.checksRun).toBe(10);
  });

  it('returns partial when evidence and independent review are missing', async () => {
    const result = await specialistNetworkValidator.validate(
      {
        ...context,
        submission: {
          specialists,
          handoffs: [],
          review: {
            proposerRoleId: 'reviewer',
            reviewerRoleId: 'reviewer',
            approved: true,
          },
        },
      },
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('partial');
    expect(
      result.rules
        .filter(({ status }) => status === 'failed')
        .map(({ ruleId }) => ruleId),
    ).toEqual(
      expect.arrayContaining([
        'correct-routing',
        'evidence-preservation',
        'independent-review',
      ]),
    );
  });
});
