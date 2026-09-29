import type { SimulatorObservation } from '@mission-control/event-contracts';

import { LighthouseSimulatorSession } from '../../src/index.js';

export const observeTools = (
  missionId: string,
): readonly SimulatorObservation[] => {
  const session = new LighthouseSimulatorSession({
    eventSessionId: 'event-1',
    unitId: 'unit-1',
    missionId,
  });
  const call = (
    tool: string,
    operation: string,
    evidenceId: string,
    args: Record<string, unknown> = {},
  ) =>
    session.invoke(
      { tool, operation, arguments: args },
      evidenceId,
      '2026-09-25T10:00:00Z',
    );
  call('weather', 'forecast', 'forecast-failed');
  call('weather', 'forecast', 'forecast-1000');
  call('shelter', 'list', 'shelter-state');
  call('transport', 'journey', 'journey-1', {
    originDistrictId: 'harbor',
    destinationDistrictId: 'north-hills',
    mode: 'emergency',
  });
  if (missionId === 'restore-the-lighthouse') {
    call('grid', 'health', 'harbor-loop-health');
    call('resources', 'inventory', 'inventory-1');
  }
  return session.observations();
};

export const traceFor = (observations: readonly SimulatorObservation[]) =>
  observations.map(({ tool, evidenceId, result }) => ({
    tool,
    evidenceId,
    status: result.ok ? 'success' : 'failed',
  }));
