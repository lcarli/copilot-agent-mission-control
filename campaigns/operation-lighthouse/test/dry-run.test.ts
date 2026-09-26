import { describe, expect, it } from 'vitest';

import {
  campaignFinaleRecoveryThreshold,
  incidentModifierIds,
  narrativeBeatIds,
  runCampaignDryRun,
} from '../src/index.js';

describe('Operation Lighthouse campaign dry run', () => {
  it('proves every narrative beat and mission end to end', async () => {
    const report = await runCampaignDryRun();

    expect(report.narrativeBeatIds).toEqual(narrativeBeatIds);
    expect(report.missionResults).toHaveLength(5);
    expect(
      report.missionResults.every(({ outcome }) => outcome === 'passed'),
    ).toBe(true);
    expect(report.simulatorEvidence).toMatchObject({
      incidentReportCount: 3,
      contradictionCount: 1,
      weatherForecastId: 'forecast-1000',
      weatherRetryCount: 1,
      restoredGridSectorId: 'upland-loop',
      shelterId: 'north-hills-school',
      allocationIds: ['allocation-001', 'allocation-002'],
    });
    expect(report.simulatorEvidence.originalRouteIds).not.toEqual(
      report.simulatorEvidence.replannedRouteIds,
    );
  });

  it('reverses every incident modifier and unlocks the finale', async () => {
    const report = await runCampaignDryRun();

    expect(report.modifierIdsActivatedAndReversed).toEqual(incidentModifierIds);
    expect(report.finalScenarioState.activeModifiers).toEqual({});
    expect(report.finalScenarioState.weatherScenarioId).toBe(
      'accelerating-storm',
    );
    expect(report.finalScenarioState.unavailableTools).toEqual([]);
    expect(report.finalRecoveryPercent).toBeGreaterThanOrEqual(
      campaignFinaleRecoveryThreshold,
    );
    expect(report.finaleUnlocked).toBe(true);
  });

  it('is deterministic, immutable, and isolated across repeated runs', async () => {
    const first = await runCampaignDryRun();
    const second = await runCampaignDryRun();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.simulatorEvidence)).toBe(true);
    expect(Object.isFrozen(first.missionResults)).toBe(true);
  });
});
