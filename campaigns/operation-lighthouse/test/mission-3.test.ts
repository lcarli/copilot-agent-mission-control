import { describe, expect, it } from 'vitest';

import { connectedCityContent, connectedCityValidator } from '../src/index.js';

const request = {
  schemaVersion: '1.0',
  validationRequestId: 'validation-3',
  submissionId: 'submission-3',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'connected-city',
  missionVersion: '1.0.0',
  validatorId: connectedCityValidator.id,
  validatorVersion: connectedCityValidator.version,
  scoringPolicyVersion: '1.0.0',
  scenarioSeed: 'default',
  requestedAt: '2026-09-25T10:20:00Z',
  deadlineAt: '2026-09-25T10:20:05Z',
} as const;

const context = {
  submissionId: 'submission-3',
  eventSessionId: 'event-1',
  unitId: 'unit-1',
  missionId: 'connected-city',
  missionVersion: '1.0.0',
  submission: {
    toolTrace: [
      { tool: 'weather', status: 'success', evidenceId: 'forecast-1000' },
      { tool: 'shelter', status: 'success', evidenceId: 'north-hills-school' },
      {
        tool: 'transport',
        status: 'failed',
        retryable: true,
        retries: 1,
      },
      { tool: 'transport', status: 'success', evidenceId: 'journey-1' },
    ],
    recommendation: {
      shelterId: 'north-hills-school',
      routeIds: ['harbor-old-town', 'old-town-north-hills'],
      evidenceIds: ['forecast-1000', 'north-hills-school', 'journey-1'],
      alternatives: ['east-bank-arena'],
    },
  },
  observedEvidence: [],
} as const;

describe('Connected City', () => {
  it('provides localized mission guidance', () => {
    expect(Object.keys(connectedCityContent.content)).toEqual([
      'en',
      'fr',
      'pt-BR',
    ]);
  });

  it('passes a grounded recommendation with bounded recovery', async () => {
    const result = await connectedCityValidator.validate(
      context,
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('passed');
    expect(result.dimensionScores.efficiency).toBe(90);
  });

  it('returns partial when required tool evidence is absent', async () => {
    const result = await connectedCityValidator.validate(
      {
        ...context,
        submission: {
          toolTrace: [{ tool: 'weather', status: 'success' }],
          recommendation: {
            shelterId: 'north-hills-school',
            routeIds: [],
            evidenceIds: [],
          },
        },
      },
      request,
      new AbortController().signal,
    );

    expect(result.outcome).toBe('partial');
    expect(
      result.rules.find(({ ruleId }) => ruleId === 'required-tools'),
    ).toMatchObject({ status: 'failed' });
  });
});
