import { describe, expect, it } from 'vitest';

import {
  decodeMissionSubmissionFeedback,
  decodePublicPresentationProjection,
} from '../src/index.js';

const projection = {
  eventName: 'Operation Lighthouse',
  activeMission: { title: 'Mission', phase: 'open', progressPercent: 0 },
  collectiveRecoveryPercent: 58,
  connectedUnitCount: 1,
  districts: [],
  rankings: [],
  recognitions: [],
};
const recovery = {
  policyVersion: '1.0.0',
  baselinePercent: 58,
  eligibleUnitCount: 1,
  contributionCount: 0,
  finaleThreshold: 80,
  finaleUnlocked: false,
};
const feedback = {
  schemaVersion: '1.0',
  submissionId: 'submission-1',
  missionId: 'signal-in-the-storm',
  status: 'evaluated',
  outcome: 'passed',
  rules: [],
  score: { missionPoints: 882, totalPoints: 882, awardedPoints: 882 },
  evaluatedAt: '2026-09-29T12:00:00Z',
};

describe('workshop decision recovery contracts', () => {
  it('accepts legacy projections and explicit decision-policy metadata', () => {
    expect(decodePublicPresentationProjection(projection)).toEqual(projection);
    for (const recoverySource of ['scenario-baseline', 'validated-decisions']) {
      const value = { ...projection, recoverySource, recovery };
      expect(decodePublicPresentationProjection(value)).toEqual(value);
    }
    expect(() =>
      decodePublicPresentationProjection({
        ...projection,
        recoverySource: 'executed-actions',
      }),
    ).toThrow();
  });

  it('rejects out-of-range values and private fields in recovery metadata', () => {
    for (const invalid of [
      { ...recovery, baselinePercent: 101 },
      { ...recovery, eligibleUnitCount: -1 },
      { ...recovery, contributionCount: 1.5 },
      { ...recovery, finaleUnlocked: 'true' },
      { ...recovery, unitId: 'private-unit' },
      { ...recovery, evidenceIds: ['private-evidence'] },
    ]) {
      expect(() =>
        decodePublicPresentationProjection({
          ...projection,
          recovery: invalid,
        }),
      ).toThrow();
    }
    expect(() =>
      decodePublicPresentationProjection({
        ...projection,
        districts: [
          {
            districtId: 'harbor',
            displayName: 'Harbor',
            recoveryPercent: 101,
            status: 'recovered',
          },
        ],
      }),
    ).toThrow();
  });

  it('reports decision application separately from scoring and execution', () => {
    expect(decodeMissionSubmissionFeedback(feedback)).toEqual(feedback);
    for (const status of [
      'applied',
      'unchanged',
      'not-applied',
      'unattributed',
    ]) {
      const value = {
        ...feedback,
        recovery: { policyVersion: '1.0.0', status, districtIds: ['harbor'] },
      };
      expect(decodeMissionSubmissionFeedback(value)).toEqual(value);
    }
    for (const invalid of [
      { policyVersion: '1.0.0', status: 'executed', districtIds: ['harbor'] },
      {
        policyVersion: '1.0.0',
        status: 'applied',
        districtIds: ['harbor', 'harbor'],
      },
      {
        policyVersion: '1.0.0',
        status: 'applied',
        districtIds: [],
        consumedResources: 2,
      },
    ]) {
      expect(() =>
        decodeMissionSubmissionFeedback({
          ...feedback,
          recovery: invalid,
        }),
      ).toThrow();
    }
  });
});
