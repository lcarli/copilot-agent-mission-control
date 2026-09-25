import { describe, expect, it } from 'vitest';

import { ShelterSimulator } from '../src/index.js';

describe('ShelterSimulator', () => {
  it('returns deterministic capacity, resource, and status data', () => {
    const simulator = new ShelterSimulator();

    expect(simulator.getShelters('north-hills')).toMatchObject({
      ok: true,
      value: [
        {
          shelterId: 'north-hills-school',
          status: 'open',
          capacity: 420,
          occupancy: 126,
          accessibleCapacity: 80,
          petCapacity: 64,
          resources: { medicalKits: 32 },
        },
      ],
    });
  });

  it('admits residents while enforcing general and inclusive capacity', () => {
    const simulator = new ShelterSimulator();

    expect(
      simulator.admit({
        shelterId: 'old-town-library',
        people: 20,
        accessiblePlaces: 4,
        pets: 0,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        occupancy: 94,
        accessibleOccupancy: 4,
        revision: 2,
      },
    });
    expect(
      simulator.admit({
        shelterId: 'old-town-library',
        people: 100,
        accessiblePlaces: 40,
        pets: 0,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'constraint-violation' },
    });
  });

  it('prevents admissions when a shelter is not open', () => {
    const simulator = new ShelterSimulator();
    simulator.setStatus('east-bank-arena', 'closed');

    expect(
      simulator.admit({
        shelterId: 'east-bank-arena',
        people: 1,
        accessiblePlaces: 0,
        pets: 0,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
  });

  it('applies controlled resource changes without allowing negative stock', () => {
    const simulator = new ShelterSimulator();

    expect(
      simulator.changeResources({
        shelterId: 'north-hills-school',
        waterUnits: -40,
        medicalKits: 3,
      }),
    ).toMatchObject({
      ok: true,
      value: {
        revision: 2,
        resources: { waterUnits: 700, medicalKits: 35 },
      },
    });
    expect(
      simulator.changeResources({
        shelterId: 'north-hills-school',
        mealUnits: -1_000,
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'constraint-violation' },
    });
  });

  it('isolates state and returns immutable projections', () => {
    const first = new ShelterSimulator();
    const second = new ShelterSimulator();
    first.changeResources({
      shelterId: 'east-bank-arena',
      blankets: -100,
    });

    const firstResult = first.getShelters('east-bank');
    const secondResult = second.getShelters('east-bank');
    expect(firstResult).not.toEqual(secondResult);
    expect(firstResult.ok && Object.isFrozen(firstResult.value)).toBe(true);
  });
});
