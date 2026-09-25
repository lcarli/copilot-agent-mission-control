import {
  portAzureWorld,
  type DistrictId,
  type GridSectorId,
  type ShelterId,
  type ShelterStatus,
} from '../world.js';
import { cloneFrozen, type SimulatorResult } from './shared.js';

export interface ShelterResources {
  readonly waterUnits: number;
  readonly mealUnits: number;
  readonly medicalKits: number;
  readonly blankets: number;
}

export interface ShelterState {
  readonly shelterId: ShelterId;
  readonly districtId: DistrictId;
  readonly gridSectorId: GridSectorId;
  readonly revision: number;
  readonly status: ShelterStatus;
  readonly capacity: number;
  readonly occupancy: number;
  readonly accessibleCapacity: number;
  readonly accessibleOccupancy: number;
  readonly petCapacity: number;
  readonly petOccupancy: number;
  readonly backupPowerHours: number;
  readonly resources: ShelterResources;
}

export interface ShelterAdmission {
  readonly shelterId: ShelterId;
  readonly people: number;
  readonly accessiblePlaces: number;
  readonly pets: number;
}

export interface ShelterResourceChange {
  readonly shelterId: ShelterId;
  readonly waterUnits?: number;
  readonly mealUnits?: number;
  readonly medicalKits?: number;
  readonly blankets?: number;
}

const initialResources: Readonly<Record<ShelterId, ShelterResources>> = {
  'harbor-community-center': {
    waterUnits: 420,
    mealUnits: 360,
    medicalKits: 18,
    blankets: 240,
  },
  'old-town-library': {
    waterUnits: 260,
    mealUnits: 220,
    medicalKits: 12,
    blankets: 150,
  },
  'north-hills-school': {
    waterUnits: 740,
    mealUnits: 690,
    medicalKits: 32,
    blankets: 410,
  },
  'east-bank-arena': {
    waterUnits: 860,
    mealUnits: 800,
    medicalKits: 40,
    blankets: 500,
  },
};

const initialShelters = (): Map<ShelterId, ShelterState> => {
  const result = new Map<ShelterId, ShelterState>();
  for (const shelter of portAzureWorld.shelters) {
    const recovery = portAzureWorld.recovery.shelters.find(
      ({ shelterId }) => shelterId === shelter.shelterId,
    );
    if (recovery === undefined) {
      throw new Error(`Missing shelter recovery for ${shelter.shelterId}.`);
    }
    result.set(shelter.shelterId, {
      shelterId: shelter.shelterId,
      districtId: shelter.districtId,
      gridSectorId: shelter.gridSectorId,
      revision: 1,
      status: recovery.status,
      capacity: shelter.capacity,
      occupancy: recovery.occupancy,
      accessibleCapacity: shelter.accessibleCapacity,
      accessibleOccupancy: 0,
      petCapacity: shelter.petCapacity,
      petOccupancy: 0,
      backupPowerHours: shelter.backupPowerHours,
      resources: initialResources[shelter.shelterId],
    });
  }
  return result;
};

export class ShelterSimulator {
  readonly #shelters = initialShelters();

  public getShelters(
    districtId?: DistrictId,
  ): SimulatorResult<readonly ShelterState[]> {
    const shelters = [...this.#shelters.values()]
      .filter(
        (shelter) =>
          districtId === undefined || shelter.districtId === districtId,
      )
      .sort((left, right) => left.shelterId.localeCompare(right.shelterId));
    if (shelters.length === 0) {
      return {
        ok: false,
        error: {
          code: 'not-found',
          message: `No shelter exists for district ${String(districtId)}.`,
          retryable: false,
        },
      };
    }
    return { ok: true, value: cloneFrozen(shelters) };
  }

  public admit(admission: ShelterAdmission): SimulatorResult<ShelterState> {
    const current = this.#shelters.get(admission.shelterId);
    if (current === undefined) {
      return this.#notFound(admission.shelterId);
    }
    if (
      !Number.isInteger(admission.people) ||
      !Number.isInteger(admission.accessiblePlaces) ||
      !Number.isInteger(admission.pets) ||
      admission.people <= 0 ||
      admission.accessiblePlaces < 0 ||
      admission.pets < 0 ||
      admission.accessiblePlaces > admission.people
    ) {
      return {
        ok: false,
        error: {
          code: 'invalid-request',
          message: 'Admission counts must be non-negative integers.',
          retryable: false,
        },
      };
    }
    if (current.status !== 'open') {
      return {
        ok: false,
        error: {
          code: 'conflict',
          message: `Shelter ${current.shelterId} is not open for admission.`,
          retryable: false,
        },
      };
    }
    if (
      current.occupancy + admission.people > current.capacity ||
      current.accessibleOccupancy + admission.accessiblePlaces >
        current.accessibleCapacity ||
      current.petOccupancy + admission.pets > current.petCapacity
    ) {
      return {
        ok: false,
        error: {
          code: 'constraint-violation',
          message: `Admission exceeds capacity at ${current.shelterId}.`,
          retryable: false,
        },
      };
    }
    const occupancy = current.occupancy + admission.people;
    return this.#store({
      ...current,
      revision: current.revision + 1,
      occupancy,
      accessibleOccupancy:
        current.accessibleOccupancy + admission.accessiblePlaces,
      petOccupancy: current.petOccupancy + admission.pets,
      status: occupancy === current.capacity ? 'full' : current.status,
    });
  }

  public changeResources(
    change: ShelterResourceChange,
  ): SimulatorResult<ShelterState> {
    const current = this.#shelters.get(change.shelterId);
    if (current === undefined) {
      return this.#notFound(change.shelterId);
    }
    const resources: ShelterResources = {
      waterUnits: current.resources.waterUnits + (change.waterUnits ?? 0),
      mealUnits: current.resources.mealUnits + (change.mealUnits ?? 0),
      medicalKits: current.resources.medicalKits + (change.medicalKits ?? 0),
      blankets: current.resources.blankets + (change.blankets ?? 0),
    };
    if (
      Object.values(resources).some(
        (value) => !Number.isInteger(value) || value < 0,
      )
    ) {
      return {
        ok: false,
        error: {
          code: 'constraint-violation',
          message: `Resource change would create invalid stock at ${current.shelterId}.`,
          retryable: false,
        },
      };
    }
    return this.#store({
      ...current,
      revision: current.revision + 1,
      resources,
    });
  }

  public setStatus(
    shelterId: ShelterId,
    status: ShelterStatus,
  ): SimulatorResult<ShelterState> {
    const current = this.#shelters.get(shelterId);
    if (current === undefined) {
      return this.#notFound(shelterId);
    }
    if (status === 'full' && current.occupancy !== current.capacity) {
      return {
        ok: false,
        error: {
          code: 'constraint-violation',
          message: `Shelter ${shelterId} cannot be full below capacity.`,
          retryable: false,
        },
      };
    }
    if (status === 'open' && current.occupancy >= current.capacity) {
      return {
        ok: false,
        error: {
          code: 'constraint-violation',
          message: `Shelter ${shelterId} cannot open at capacity.`,
          retryable: false,
        },
      };
    }
    return this.#store({
      ...current,
      revision: current.revision + 1,
      status,
    });
  }

  #notFound(shelterId: string): SimulatorResult<never> {
    return {
      ok: false,
      error: {
        code: 'not-found',
        message: `Unknown shelter: ${shelterId}.`,
        retryable: false,
      },
    };
  }

  #store(state: ShelterState): SimulatorResult<ShelterState> {
    this.#shelters.set(state.shelterId, state);
    return { ok: true, value: cloneFrozen(state) };
  }
}
