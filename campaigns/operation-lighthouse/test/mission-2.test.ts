import { describe, expect, it } from 'vitest';

import { groundTruthContent, groundTruthValidator } from '../src/index.js';

const request = {
  schemaVersion: '1.0',
  validationRequestId: 'validation-2',
  submissionId: 'submission-2',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'ground-truth',
  missionVersion: '1.0.0',
  validatorId: groundTruthValidator.id,
  validatorVersion: groundTruthValidator.version,
  scoringPolicyVersion: '1.0.0',
  scenarioSeed: 'default',
  requestedAt: '2026-09-25T09:20:00Z',
  deadlineAt: '2026-09-25T09:20:05Z',
} as const;

const context = {
  submissionId: 'submission-2',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'ground-truth',
  missionVersion: '1.0.0',
  submission: {
    facts: ['incident-004 reports a closure'],
    assumptions: [],
    unknowns: ['current flood depth'],
    evidenceIds: ['incident-004', 'bulletin-03'],
    recommendation: { supported: false, summary: 'Verify before dispatch.' },
    nextInformationStep: 'Query Transit Control.',
    contradictionResolution:
      'The operator report outranks an unverified driver report.',
    confidence: 0.82,
    untrustedInstructionDetected: true,
  },
  observedEvidence: [{ evidenceId: 'incident-004' }],
} as const;

describe('Ground Truth', () => {
  it('provides equivalent content structure in every locale', () => {
    for (const content of Object.values(groundTruthContent.content)) {
      expect(content.coreObjectives).toHaveLength(4);
      expect(content.advancedObjectives).toHaveLength(3);
      expect(content.hints).toHaveLength(3);
    }
  });

  it('passes evidence-aware submissions with uncertainty boundaries', async () => {
    const result = await groundTruthValidator.validate(
      context,
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('passed');
    expect(result.dimensionScores.evidenceAndGrounding).toBe(95);
  });

  it('returns partial when citations and next steps are missing', async () => {
    const result = await groundTruthValidator.validate(
      {
        ...context,
        submission: {
          facts: ['A report exists.'],
          assumptions: [],
          unknowns: ['Reliability'],
          recommendation: { supported: false },
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
      expect.arrayContaining(['evidence-citations', 'next-information-step']),
    );
  });
});
