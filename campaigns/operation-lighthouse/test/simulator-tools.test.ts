import { describe, expect, it } from 'vitest';
import {
  LighthouseSimulatorSession,
  lighthouseSimulatorCatalog,
} from '../src/index.js';

describe('scoped city simulator sessions', () => {
  it('restores failure sequences without changing receipts and rejects inconsistent persisted history', () => {
    const scope = {
      eventSessionId: 'event-1',
      unitId: 'unit-1',
      missionId: 'connected-city',
    };
    const invocation = {
      tool: 'weather',
      operation: 'forecast',
      arguments: {},
    };
    const original = new LighthouseSimulatorSession(scope);
    const failed = original.invoke(invocation, 'first', '2026-09-29T12:00:00Z');
    const restored = LighthouseSimulatorSession.restore(
      scope,
      original.observations(),
    );
    expect(restored.observations()).toEqual([failed]);
    expect(
      restored.invoke(invocation, 'second', '2026-09-29T12:00:01Z'),
    ).toMatchObject({
      sequence: 2,
      result: { ok: true },
    });
    expect(() =>
      LighthouseSimulatorSession.restore(scope, [{ ...failed, sequence: 2 }]),
    ).toThrow();
    expect(() =>
      LighthouseSimulatorSession.restore({ ...scope, unitId: 'other' }, [
        failed,
      ]),
    ).toThrow();
  });

  it('keeps deterministic failures isolated and forbids out-of-mission operations', () => {
    const scope = {
      eventSessionId: 'event-1',
      unitId: 'unit-1',
      missionId: 'connected-city',
    };
    const first = new LighthouseSimulatorSession(scope);
    const second = new LighthouseSimulatorSession({
      ...scope,
      unitId: 'unit-2',
    });
    const input = {
      tool: 'weather',
      operation: 'forecast',
      arguments: {},
      unitId: 'injected',
    };
    const failure = first.invoke(input, 'first', '2026-09-29T12:00:00Z');
    expect(failure.unitId).toBe('unit-1');
    expect(failure.result.ok).toBe(false);
    expect(first.invoke(input, 'retry', '2026-09-29T12:00:01Z').result.ok).toBe(
      true,
    );
    expect(
      second.invoke(input, 'other', '2026-09-29T12:00:02Z').result.ok,
    ).toBe(false);
    expect(() =>
      first.invoke(
        { tool: 'grid', operation: 'health', arguments: {} },
        'grid',
        'now',
      ),
    ).toThrow();
    expect(first.observations()).toHaveLength(2);
    expect(Object.isFrozen(first.observations())).toBe(true);
  });

  it('runs every advertised read operation and rejects unknown arguments and writes', () => {
    const session = new LighthouseSimulatorSession({
      eventSessionId: 'event-1',
      unitId: 'unit-1',
      missionId: 'restore-the-lighthouse',
    });
    for (const [index, { tool, operation }] of lighthouseSimulatorCatalog(
      'restore-the-lighthouse',
    ).tools.entries()) {
      const args =
        operation === 'journey'
          ? {
              originDistrictId: 'harbor',
              destinationDistrictId: 'north-hills',
              mode: 'emergency',
            }
          : operation === 'constraints'
            ? { gridSectorId: 'harbor-loop' }
            : {};
      const result = session.invoke(
        { tool, operation, arguments: args },
        `receipt-${String(index)}`,
        '2026-09-29T12:00:00Z',
      );
      expect(result.tool).toBe(tool);
      expect(result.operation).toBe(operation);
      expect(result.result.ok).toBe(operation !== 'forecast');
    }
    expect(() =>
      session.invoke(
        { tool: 'weather', operation: 'forecast', arguments: { advance: 2 } },
        'bad',
        'now',
      ),
    ).toThrow();
    expect(() =>
      session.invoke(
        { tool: 'grid', operation: 'restore', arguments: {} },
        'bad',
        'now',
      ),
    ).toThrow();
    expect(lighthouseSimulatorCatalog('signal-in-the-storm').tools).toEqual([]);
  });
});
