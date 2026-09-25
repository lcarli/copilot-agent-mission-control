import { describe, expect, it } from 'vitest';

import { ResourceInventorySimulator } from '../src/index.js';

describe('ResourceInventorySimulator', () => {
  it('lists constrained generators, vehicles, supplies, and teams', () => {
    const simulator = new ResourceInventorySimulator();
    const result = simulator.getInventory();

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(new Set(result.value.map(({ kind }) => kind))).toEqual(
        new Set(['generator', 'vehicle', 'supply', 'team']),
      );
      expect(result.value).toHaveLength(7);
    }
  });

  it('finds resources by capability and minimum available quantity', () => {
    const simulator = new ResourceInventorySimulator();

    expect(
      simulator.getInventory({
        capability: 'shelter-support',
        minimumQuantity: 10,
      }),
    ).toMatchObject({
      ok: true,
      value: [{ resourceId: 'medical-kits' }, { resourceId: 'water-pallets' }],
    });
  });

  it('allocates finite resources with deterministic identifiers', () => {
    const simulator = new ResourceInventorySimulator();

    expect(
      simulator.allocate({
        resourceId: 'portable-generators',
        quantity: 2,
        missionId: 'restore-the-lighthouse',
        destinationDistrictId: 'harbor',
        purpose: 'Power the water pumping station.',
      }),
    ).toMatchObject({
      ok: true,
      value: {
        allocationId: 'allocation-001',
        quantity: 2,
        status: 'active',
      },
    });
    expect(simulator.getInventory({ kind: 'generator' })).toMatchObject({
      ok: true,
      value: [{ availableQuantity: 4, revision: 2 }],
    });
  });

  it('rejects over-allocation and restores released inventory once', () => {
    const simulator = new ResourceInventorySimulator();
    const allocation = simulator.allocate({
      resourceId: 'high-water-vehicles',
      quantity: 3,
      missionId: 'connected-city',
      destinationDistrictId: 'harbor',
      purpose: 'Reach residents near Pier 4.',
    });

    expect(
      simulator.allocate({
        resourceId: 'high-water-vehicles',
        quantity: 1,
        missionId: 'connected-city',
        destinationDistrictId: 'old-town',
        purpose: 'Secondary response.',
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'constraint-violation' },
    });
    if (!allocation.ok) {
      throw new Error('Expected resource allocation to succeed.');
    }
    expect(simulator.release(allocation.value.allocationId)).toMatchObject({
      ok: true,
      value: { status: 'released' },
    });
    expect(simulator.release(allocation.value.allocationId)).toMatchObject({
      ok: false,
      error: { code: 'conflict' },
    });
  });

  it('isolates allocations and returns immutable projections', () => {
    const first = new ResourceInventorySimulator();
    const second = new ResourceInventorySimulator();
    first.allocate({
      resourceId: 'electrical-crews',
      quantity: 2,
      missionId: 'restore-the-lighthouse',
      destinationDistrictId: 'civic-center',
      purpose: 'Restore the central loop.',
    });

    expect(first.getInventory({ kind: 'team' })).not.toEqual(
      second.getInventory({ kind: 'team' }),
    );
    const result = first.getInventory();
    expect(result.ok && Object.isFrozen(result.value)).toBe(true);
  });
});
