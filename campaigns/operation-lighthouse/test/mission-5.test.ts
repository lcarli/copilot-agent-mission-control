import { describe, expect, it } from 'vitest';

import {
  restoreTheLighthouseContent,
  restoreTheLighthouseValidator,
} from '../src/index.js';
import { observeTools, traceFor } from './fixtures/tool-evidence.js';

const observations = observeTools('restore-the-lighthouse');

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
      'forecast-1000',
      'harbor-loop-health',
      'shelter-state',
      'journey-1',
      'inventory-1',
    ],
    toolTrace: traceFor(observations),
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
        evidenceIds: ['forecast-1000', 'journey-1'],
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
        evidenceIds: ['forecast-1000'],
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
      evidenceIds: ['forecast-1000', 'inventory-1'],
    },
    incidentModifierId: 'storm-surge-escalation',
    incidentModifierApplied: true,
    replan: {
      failedTool: 'weather',
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
    totalToolCalls: observations.length,
  },
  observedEvidence: observations,
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
    expect(result.dimensionScores.reliability).toBe(1500);
    expect(result.checksRun).toBe(14);
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

  it('rejects declared traces without scoped server observations', async () => {
    const result = await restoreTheLighthouseValidator.validate(
      { ...context, observedEvidence: [] },
      request,
      new AbortController().signal,
    );
    expect(result.outcome).not.toBe('passed');
    expect(
      result.rules.find(({ ruleId }) => ruleId === 'tool-provenance')?.status,
    ).toBe('failed');
  });

  it('checks total resource quantities against observed inventory and validates nested citations', async () => {
    const allocation = context.submission.resourceAllocations[0];
    const result = await restoreTheLighthouseValidator.validate(
      {
        ...context,
        submission: {
          ...context.submission,
          resourceAllocations: [
            { ...allocation, quantity: 4 },
            { ...allocation, quantity: 4 },
          ],
          audit: { ...context.submission.audit, evidenceIds: ['made-up'] },
        },
      },
      request,
      new AbortController().signal,
    );
    expect(
      result.rules.find(({ ruleId }) => ruleId === 'resource-allocation')
        ?.status,
    ).toBe('failed');
    expect(
      result.rules.find(({ ruleId }) => ruleId === 'auditable-package')?.status,
    ).toBe('failed');
  });
});
