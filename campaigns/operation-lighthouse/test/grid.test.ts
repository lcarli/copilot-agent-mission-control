import { describe, expect, it } from 'vitest';

import { GridSimulator } from '../src/index.js';

describe('GridSimulator', () => {
  it('returns deterministic sector health from the world model', () => {
    const simulator = new GridSimulator();

    expect(simulator.getSectorHealth('harbor-loop')).toMatchObject({
      ok: true,
      value: [
        {
          gridSectorId: 'harbor-loop',
          status: 'strained',
          availableCapacityMw: 26,
          priorityServiceIds: ['water-pumping'],
        },
      ],
    });
  });

  it('applies an outage with an auditable revision and cause', () => {
    const simulator = new GridSimulator();

    expect(simulator.triggerOutage('upland-loop', 'equipment-failure')).toEqual(
      {
        ok: true,
        value: {
          gridSectorId: 'upland-loop',
          revision: 2,
          status: 'outage',
          availableCapacityMw: 0,
          baselineLoadMw: 19,
          priorityServiceIds: ['port-azure-general'],
          outageCause: 'equipment-failure',
        },
      },
    );
  });

  it('enforces restoration resources and prerequisite sectors', () => {
    const simulator = new GridSimulator();
    simulator.triggerOutage('harbor-loop', 'flooding');

    expect(
      simulator.restoreSector({
        gridSectorId: 'harbor-loop',
        crewCount: 3,
        generatorUnits: 1,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'constraint-violation' },
    });

    expect(
      simulator.restoreSector({
        gridSectorId: 'central-loop',
        crewCount: 4,
        generatorUnits: 2,
      }),
    ).toMatchObject({ ok: true, value: { status: 'stable' } });
    expect(
      simulator.restoreSector({
        gridSectorId: 'harbor-loop',
        crewCount: 3,
        generatorUnits: 1,
      }),
    ).toMatchObject({
      ok: true,
      value: { status: 'stable', availableCapacityMw: 42 },
    });
  });

  it('keeps mutations isolated between simulator instances', () => {
    const first = new GridSimulator();
    const second = new GridSimulator();
    first.triggerOutage('upland-loop', 'overload');

    expect(first.getSectorHealth('upland-loop')).toMatchObject({
      ok: true,
      value: [{ status: 'outage' }],
    });
    expect(second.getSectorHealth('upland-loop')).toMatchObject({
      ok: true,
      value: [{ status: 'stable' }],
    });
  });

  it('rejects repeated outages and returns immutable projections', () => {
    const simulator = new GridSimulator();
    simulator.triggerOutage('east-loop', 'overload');

    expect(simulator.triggerOutage('east-loop', 'overload')).toMatchObject({
      ok: false,
      error: { code: 'conflict', retryable: false },
    });
    const result = simulator.getSectorHealth();
    expect(result.ok && Object.isFrozen(result.value)).toBe(true);
  });
});
