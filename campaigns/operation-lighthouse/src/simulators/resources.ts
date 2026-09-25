import type { DistrictId } from '../world.js';
import { cloneFrozen, type SimulatorResult } from './shared.js';

export const resourceIds = [
  'portable-generators',
  'high-water-vehicles',
  'evacuation-buses',
  'water-pallets',
  'medical-kits',
  'electrical-crews',
  'logistics-teams',
] as const;

export type ResourceId = (typeof resourceIds)[number];
export type ResourceKind = 'generator' | 'vehicle' | 'supply' | 'team';

export interface ResourceInventoryItem {
  readonly resourceId: ResourceId;
  readonly kind: ResourceKind;
  readonly nameKey: string;
  readonly unit: 'unit' | 'pallet' | 'kit' | 'team';
  readonly homeDistrictId: DistrictId;
  readonly totalQuantity: number;
  readonly availableQuantity: number;
  readonly capabilities: readonly string[];
  readonly revision: number;
}

export interface ResourceQuery {
  readonly kind?: ResourceKind;
  readonly capability?: string;
  readonly minimumQuantity?: number;
}

export interface ResourceAllocationRequest {
  readonly resourceId: ResourceId;
  readonly quantity: number;
  readonly missionId: string;
  readonly destinationDistrictId: DistrictId;
  readonly purpose: string;
}

export interface ResourceAllocation {
  readonly allocationId: string;
  readonly resourceId: ResourceId;
  readonly quantity: number;
  readonly missionId: string;
  readonly destinationDistrictId: DistrictId;
  readonly purpose: string;
  readonly status: 'active' | 'released';
}

const inventorySeed: readonly Omit<
  ResourceInventoryItem,
  'availableQuantity' | 'revision'
>[] = [
  {
    resourceId: 'portable-generators',
    kind: 'generator',
    nameKey: 'resource.portableGenerators',
    unit: 'unit',
    homeDistrictId: 'civic-center',
    totalQuantity: 6,
    capabilities: ['backup-power', 'critical-service'],
  },
  {
    resourceId: 'high-water-vehicles',
    kind: 'vehicle',
    nameKey: 'resource.highWaterVehicles',
    unit: 'unit',
    homeDistrictId: 'harbor',
    totalQuantity: 3,
    capabilities: ['flood-access', 'rescue'],
  },
  {
    resourceId: 'evacuation-buses',
    kind: 'vehicle',
    nameKey: 'resource.evacuationBuses',
    unit: 'unit',
    homeDistrictId: 'east-bank',
    totalQuantity: 5,
    capabilities: ['mass-evacuation', 'accessible-transport'],
  },
  {
    resourceId: 'water-pallets',
    kind: 'supply',
    nameKey: 'resource.waterPallets',
    unit: 'pallet',
    homeDistrictId: 'old-town',
    totalQuantity: 12,
    capabilities: ['shelter-support'],
  },
  {
    resourceId: 'medical-kits',
    kind: 'supply',
    nameKey: 'resource.medicalKits',
    unit: 'kit',
    homeDistrictId: 'north-hills',
    totalQuantity: 20,
    capabilities: ['medical-response', 'shelter-support'],
  },
  {
    resourceId: 'electrical-crews',
    kind: 'team',
    nameKey: 'resource.electricalCrews',
    unit: 'team',
    homeDistrictId: 'civic-center',
    totalQuantity: 4,
    capabilities: ['grid-restoration'],
  },
  {
    resourceId: 'logistics-teams',
    kind: 'team',
    nameKey: 'resource.logisticsTeams',
    unit: 'team',
    homeDistrictId: 'east-bank',
    totalQuantity: 6,
    capabilities: ['distribution', 'shelter-support'],
  },
];

const initialInventory = (): Map<ResourceId, ResourceInventoryItem> =>
  new Map(
    inventorySeed.map((resource) => [
      resource.resourceId,
      {
        ...resource,
        availableQuantity: resource.totalQuantity,
        revision: 1,
      },
    ]),
  );

export class ResourceInventorySimulator {
  readonly #inventory = initialInventory();
  readonly #allocations = new Map<string, ResourceAllocation>();
  #nextAllocation = 1;

  public getInventory(
    query: ResourceQuery = {},
  ): SimulatorResult<readonly ResourceInventoryItem[]> {
    if (
      query.minimumQuantity !== undefined &&
      (!Number.isInteger(query.minimumQuantity) || query.minimumQuantity < 0)
    ) {
      return {
        ok: false,
        error: {
          code: 'invalid-request',
          message: 'Minimum quantity must be a non-negative integer.',
          retryable: false,
        },
      };
    }
    const inventory = [...this.#inventory.values()]
      .filter(
        (resource) =>
          (query.kind === undefined || resource.kind === query.kind) &&
          (query.capability === undefined ||
            resource.capabilities.includes(query.capability)) &&
          resource.availableQuantity >= (query.minimumQuantity ?? 0),
      )
      .sort((left, right) => left.resourceId.localeCompare(right.resourceId));
    return { ok: true, value: cloneFrozen(inventory) };
  }

  public allocate(
    request: ResourceAllocationRequest,
  ): SimulatorResult<ResourceAllocation> {
    const resource = this.#inventory.get(request.resourceId);
    if (resource === undefined) {
      return this.#notFound(request.resourceId);
    }
    if (
      !Number.isInteger(request.quantity) ||
      request.quantity <= 0 ||
      request.missionId.trim() === '' ||
      request.purpose.trim() === ''
    ) {
      return {
        ok: false,
        error: {
          code: 'invalid-request',
          message:
            'Allocation requires a positive quantity, mission, and purpose.',
          retryable: false,
        },
      };
    }
    if (request.quantity > resource.availableQuantity) {
      return {
        ok: false,
        error: {
          code: 'constraint-violation',
          message: `Only ${String(resource.availableQuantity)} ${resource.unit}(s) of ${resource.resourceId} remain.`,
          retryable: false,
        },
      };
    }
    const allocation: ResourceAllocation = {
      allocationId: `allocation-${String(this.#nextAllocation).padStart(3, '0')}`,
      resourceId: request.resourceId,
      quantity: request.quantity,
      missionId: request.missionId,
      destinationDistrictId: request.destinationDistrictId,
      purpose: request.purpose,
      status: 'active',
    };
    this.#nextAllocation += 1;
    this.#allocations.set(allocation.allocationId, allocation);
    this.#inventory.set(resource.resourceId, {
      ...resource,
      availableQuantity: resource.availableQuantity - request.quantity,
      revision: resource.revision + 1,
    });
    return { ok: true, value: cloneFrozen(allocation) };
  }

  public release(allocationId: string): SimulatorResult<ResourceAllocation> {
    const allocation = this.#allocations.get(allocationId);
    if (allocation === undefined) {
      return this.#notFound(allocationId);
    }
    if (allocation.status === 'released') {
      return {
        ok: false,
        error: {
          code: 'conflict',
          message: `Allocation ${allocationId} is already released.`,
          retryable: false,
        },
      };
    }
    const resource = this.#inventory.get(allocation.resourceId);
    if (resource === undefined) {
      return this.#notFound(allocation.resourceId);
    }
    const released: ResourceAllocation = {
      ...allocation,
      status: 'released',
    };
    this.#allocations.set(allocationId, released);
    this.#inventory.set(resource.resourceId, {
      ...resource,
      availableQuantity: resource.availableQuantity + allocation.quantity,
      revision: resource.revision + 1,
    });
    return { ok: true, value: cloneFrozen(released) };
  }

  public getAllocations(): readonly ResourceAllocation[] {
    return cloneFrozen(
      [...this.#allocations.values()].sort((left, right) =>
        left.allocationId.localeCompare(right.allocationId),
      ),
    );
  }

  #notFound(identifier: string): SimulatorResult<never> {
    return {
      ok: false,
      error: {
        code: 'not-found',
        message: `Unknown resource or allocation: ${identifier}.`,
        retryable: false,
      },
    };
  }
}
