import { describe, expect, it } from 'vitest';

import {
  signalInTheStormContent,
  signalInTheStormValidator,
} from '../src/index.js';

const request = {
  schemaVersion: '1.0',
  validationRequestId: 'validation-1',
  submissionId: 'submission-1',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'signal-in-the-storm',
  missionVersion: '1.0.0',
  validatorId: signalInTheStormValidator.id,
  validatorVersion: signalInTheStormValidator.version,
  scoringPolicyVersion: '1.0.0',
  scenarioSeed: 'default',
  requestedAt: '2026-09-25T08:20:00Z',
  deadlineAt: '2026-09-25T08:20:05Z',
} as const;

const context = {
  submissionId: 'submission-1',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'signal-in-the-storm',
  missionVersion: '1.0.0',
  submission: {
    category: 'flooding',
    severity: 'high',
    location: 'Harbor Pier 4',
    affectedServices: ['water-pumping'],
    missingInformation: ['current-hazard'],
    severityExplanation: 'Water is entering occupied homes.',
    duplicateOf: 'incident-002',
  },
  observedEvidence: [],
} as const;

describe('Signal in the Storm', () => {
  it('provides complete localized mission content', () => {
    expect(Object.keys(signalInTheStormContent.content)).toEqual([
      'en',
      'fr',
      'pt-BR',
    ]);
    for (const content of Object.values(signalInTheStormContent.content)) {
      expect(content.coreObjectives).toHaveLength(4);
      expect(content.advancedObjectives).toHaveLength(3);
      expect(content.hints).toHaveLength(3);
    }
  });

  it('passes a complete structured incident assessment', async () => {
    const result = await signalInTheStormValidator.validate(
      context,
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('passed');
    expect(result.checksRun).toBe(9);
    expect(result.dimensionScores.requiredOutcome).toBe(112);
  });

  it('returns partial when some required fields are missing', async () => {
    const result = await signalInTheStormValidator.validate(
      {
        ...context,
        submission: {
          category: 'power',
          severity: 'high',
          missingInformation: ['location'],
        },
      },
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('partial');
    expect(
      result.rules.find(({ ruleId }) => ruleId === 'location'),
    ).toMatchObject({ status: 'failed', severity: 'required' });
  });

  it('requests a retry for an invalid submission shape', async () => {
    const result = await signalInTheStormValidator.validate(
      { ...context, submission: {} },
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('partial');
    expect(
      result.rules.filter(
        ({ severity, status }) =>
          severity === 'required' && status === 'passed',
      ),
    ).toHaveLength(2);
  });
});
