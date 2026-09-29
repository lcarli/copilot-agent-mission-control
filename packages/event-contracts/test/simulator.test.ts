import { describe, expect, it } from 'vitest';

import {
  decodeSimulatorInvocation,
  decodeSimulatorObservation,
  isSimulatorObservation,
} from '../src/index.js';

describe('simulator HTTP contracts', () => {
  it('keeps request scope server-owned and decodes explicit failure receipts', () => {
    const input = { tool: 'weather', operation: 'forecast', arguments: {} };
    expect(decodeSimulatorInvocation(input)).toEqual(input);
    expect(() =>
      decodeSimulatorInvocation({ ...input, unitId: 'injected' }),
    ).toThrow();
    const observation = {
      ...input,
      schemaVersion: '1.0',
      evidenceId: 'receipt-1',
      eventSessionId: 'event-1',
      unitId: 'unit-1',
      missionId: 'connected-city',
      sequence: 1,
      recordedAt: '2026-09-29T12:00:00Z',
      result: {
        ok: false,
        error: {
          code: 'temporarily-unavailable',
          message: 'Retry.',
          retryable: true,
        },
      },
    };
    expect(decodeSimulatorObservation(observation)).toEqual(observation);
    expect(
      isSimulatorObservation({ ...observation, result: { ok: false } }),
    ).toBe(false);
    expect(
      isSimulatorObservation({
        ...observation,
        privateToken: 'not-a-public-field',
      }),
    ).toBe(false);
  });
});
