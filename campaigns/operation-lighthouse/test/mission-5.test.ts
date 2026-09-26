import { describe, expect, it } from 'vitest';

import {
  restoreTheLighthouseContent,
  restoreTheLighthouseValidator,
} from '../src/index.js';

const request = {
  schemaVersion: '1.0',
  validationRequestId: 'validation-5',
  submissionId: 'submission-5',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'restore-the-lighthouse',
  missionVersion: '1.0.0',
  validatorId: restoreTheLighthouseValidator.id,
  validatorVersion: restoreTheLighthouseValidator.version,
  scoringPolicyVersion: '1.0.0',
  scenarioSeed: 'default',
  requestedAt: '2026-09-25T15:00:00Z',
  deadlineAt: '2026-09-25T15:00:05Z',
} as const;

const context = {
  submissionId: 'submission-5',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'restore-the-lighthouse',
  missionVersion: '1.0.0',
  submission: {
    incidentAssessment: {
      hazards: ['grid-failure', 'communications-loss', 'storm-surge'],
    },
    evidenceIds: [
      'forecast-1200',
      'harbor-loop-health',
      'shelter-state',
      'journey-1',
      'inventory-1',
    ],
    toolTrace: [
      { tool: 'weather', status: 'success' },
      { tool: 'grid', status: 'success' },
      { tool: 'shelter', status: 'success' },
      { tool: 'transport', status: 'success' },
      { tool: 'resources', status: 'success' },
    ],
    prioritizedActions: [
      {
        priority: 1,
        actionId: 'restore-radio',
        impact: 'high',
        rationale: 'Restore emergency coordination.',
        evidenceIds: ['harbor-loop-health', 'inventory-1'],
      },
      {
        priority: 2,
        actionId: 'evacuate-harbor',
        impact: 'high',
        rationale: 'Move residents ahead of the surge.',
        evidenceIds: ['forecast-1200', 'journey-1'],
      },
    ],
    resourceAllocations: [
      {
        resourceId: 'portable-generators',
        quantity: 2,
        destinationDistrictId: 'old-town',
        purpose: 'Restore public safety radio.',
      },
      {
        resourceId: 'evacuation-buses',
        quantity: 3,
        destinationDistrictId: 'harbor',
        purpose: 'Evacuate residents.',
      },
    ],
    specialistHandoffs: [
      {
        sourceRole: 'weather-specialist',
        targetRole: 'logistics-specialist',
        evidenceIds: ['forecast-1200'],
      },
      {
        sourceRole: 'logistics-specialist',
        targetRole: 'reviewer',
        evidenceIds: ['journey-1', 'inventory-1'],
      },
    ],
    finalReview: {
      reviewerRoleId: 'reviewer',
      planVersion: '2',
      approved: true,
    },
    audit: {
      decisionId: 'decision-001',
      createdAt: '2026-09-25T15:00:00Z',
      evidenceIds: ['forecast-1200', 'inventory-1'],
    },
    incidentModifierId: 'storm-surge-escalation',
    incidentModifierApplied: true,
    replan: {
      failedTool: 'transport',
      changedActionIds: ['evacuate-harbor'],
    },
    rejectedAlternatives: [
      {
        alternativeId: 'harbor-east-bank',
        reason: 'Route is closed.',
      },
    ],
    humanApprovals: [
      {
        actionId: 'restore-radio',
        approverRole: 'mission-commander',
        approved: true,
      },
      {
        actionId: 'evacuate-harbor',
        approverRole: 'mission-commander',
        approved: true,
      },
    ],
    totalToolCalls: 9,
  },
  observedEvidence: [],
} as const;

describe('Restore the Lighthouse', () => {
  it('provides finale mission content in all supported languages', () => {
    for (const content of Object.values(restoreTheLighthouseContent.content)) {
      expect(content.coreObjectives).toHaveLength(5);
      expect(content.advancedObjectives).toHaveLength(3);
      expect(content.hints).toHaveLength(3);
    }
  });

  it('passes a coordinated, audited response plan', async () => {
    const result = await restoreTheLighthouseValidator.validate(
      context,
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('passed');
    expect(result.dimensionScores.reliability).toBe(100);
    expect(result.checksRun).toBe(13);
  });

  it('returns partial when allocation, review, and audit are missing', async () => {
    const result = await restoreTheLighthouseValidator.validate(
      {
        ...context,
        submission: {
          incidentAssessment: {
            hazards: ['grid-failure', 'communications-loss', 'storm-surge'],
          },
          evidenceIds: context.submission.evidenceIds,
          toolTrace: context.submission.toolTrace,
          prioritizedActions: context.submission.prioritizedActions,
          resourceAllocations: [],
          specialistHandoffs: [],
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
        'resource-allocation',
        'specialist-routing',
        'final-validation',
        'auditable-package',
      ]),
    );
  });
});
