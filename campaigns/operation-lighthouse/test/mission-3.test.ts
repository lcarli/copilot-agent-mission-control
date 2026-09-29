import { describe, expect, it } from 'vitest';

import { connectedCityContent, connectedCityValidator } from '../src/index.js';
import { observeTools, traceFor } from './fixtures/tool-evidence.js';

const observations = observeTools('connected-city');

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
    toolTrace: traceFor(observations),
    recommendation: {
      shelterId: 'north-hills-school',
      routeIds: ['harbor-old-town', 'old-town-north-hills'],
      evidenceIds: ['forecast-1000', 'shelter-state', 'journey-1'],
      alternatives: ['east-bank-arena'],
    },
  },
  observedEvidence: observations,
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
    expect(result.dimensionScores.efficiency).toBe(900);
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

  it('rejects fabricated or foreign unit observations', async () => {
    for (const observedEvidence of [
      [],
      observations.map((item) => ({ ...item, unitId: 'another-unit' })),
    ]) {
      const result = await connectedCityValidator.validate(
        { ...context, observedEvidence },
        request,
        new AbortController().signal,
      );
      expect(result.outcome).not.toBe('passed');
      expect(
        result.rules.find(({ ruleId }) => ruleId === 'tool-provenance')?.status,
      ).toBe('failed');
    }
  });

  it('requires the actual available shelter and returned route, not plausible identifiers', async () => {
    for (const recommendation of [
      { ...context.submission.recommendation, shelterId: 'unknown-shelter' },
      { ...context.submission.recommendation, routeIds: ['harbor-east-bank'] },
      {
        ...context.submission.recommendation,
        evidenceIds: ['forecast-1000', 'forecast-1000', 'forecast-1000'],
      },
    ]) {
      const result = await connectedCityValidator.validate(
        { ...context, submission: { ...context.submission, recommendation } },
        request,
        new AbortController().signal,
      );
      expect(result.outcome).not.toBe('passed');
    }
  });

  it('does not let a declared retry count conceal excess server-observed retries', async () => {
    const failed = observations[0];
    if (failed === undefined) throw new Error('Missing failure fixture.');
    const extraAttempts = [5, 6].map((sequence) => ({
      ...failed,
      evidenceId: `extra-${String(sequence)}`,
      sequence,
    }));
    const result = await connectedCityValidator.validate(
      { ...context, observedEvidence: [...observations, ...extraAttempts] },
      request,
      new AbortController().signal,
    );
    expect(
      result.rules.find(({ ruleId }) => ruleId === 'failure-handling')?.status,
    ).toBe('failed');
    expect(
      result.rules.find(({ ruleId }) => ruleId === 'bounded-retries')?.status,
    ).toBe('failed');
  });
});
