import { describe, expect, it } from 'vitest';

import {
  InvalidWorldModelError,
  assertValidPortAzureWorld,
  portAzureWorld,
  validatePortAzureWorld,
  type PortAzureWorldModel,
} from '../src/index.js';

describe('Port Azure world model', () => {
  it('defines a valid, connected initial city state', () => {
    const result = validatePortAzureWorld(portAzureWorld);

    expect(result).toEqual({ valid: true, issues: [] });
    expect(portAzureWorld.districts).toHaveLength(5);
    expect(portAzureWorld.services).toHaveLength(5);
    expect(portAzureWorld.shelters).toHaveLength(4);
    expect(portAzureWorld.routes).toHaveLength(6);
    expect(portAzureWorld.gridSectors).toHaveLength(4);
  });

  it('publishes an immutable snapshot for simulator consumers', () => {
    expect(Object.isFrozen(portAzureWorld)).toBe(true);
    expect(Object.isFrozen(portAzureWorld.recovery.routes)).toBe(true);
    expect(Object.isFrozen(portAzureWorld.districts[0]?.map)).toBe(true);
  });

  it('rejects unknown cross-entity references', () => {
    const firstService = portAzureWorld.services[0];
    if (firstService === undefined) {
      throw new Error('Expected a seeded service.');
    }
    const world: PortAzureWorldModel = {
      ...structuredClone(portAzureWorld),
      services: [
        { ...firstService, districtId: 'missing-district' as never },
        ...portAzureWorld.services.slice(1),
      ],
    };

    expect(validatePortAzureWorld(world)).toMatchObject({
      valid: false,
      issues: [
        {
          code: 'invalid-reference',
          path: 'services.emergency-operations',
        },
      ],
    });
  });

  it('rejects incomplete and contradictory recovery state', () => {
    const firstGridRecovery = portAzureWorld.recovery.gridSectors[0];
    if (firstGridRecovery === undefined) {
      throw new Error('Expected seeded grid recovery.');
    }
    const world: PortAzureWorldModel = {
      ...structuredClone(portAzureWorld),
      recovery: {
        ...structuredClone(portAzureWorld.recovery),
        shelters: portAzureWorld.recovery.shelters.slice(1),
        gridSectors: [
          { ...firstGridRecovery, availableCapacityMw: 1_000 },
          ...portAzureWorld.recovery.gridSectors.slice(1),
        ],
      },
    };

    const result = validatePortAzureWorld(world);

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'missing-recovery',
          path: 'recovery.shelters',
        }),
        expect.objectContaining({
          code: 'inconsistent-recovery',
          path: 'recovery.gridSectors.harbor-loop',
        }),
      ]),
    );
  });

  it('throws a structured error when assertion fails', () => {
    const world: PortAzureWorldModel = {
      ...structuredClone(portAzureWorld),
      recovery: {
        ...structuredClone(portAzureWorld.recovery),
        overallPercent: 99,
      },
    };

    expect(() => {
      assertValidPortAzureWorld(world);
    }).toThrow(InvalidWorldModelError);
  });
});
