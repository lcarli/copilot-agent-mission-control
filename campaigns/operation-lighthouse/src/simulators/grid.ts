import {
  portAzureWorld,
  type GridSectorId,
  type GridStatus,
  type ServiceId,
} from '../world.js';
import { cloneFrozen, type SimulatorResult } from './shared.js';

export interface GridSectorHealth {
  readonly gridSectorId: GridSectorId;
  readonly revision: number;
  readonly status: GridStatus;
  readonly availableCapacityMw: number;
  readonly baselineLoadMw: number;
  readonly priorityServiceIds: readonly ServiceId[];
  readonly outageCause?: 'flooding' | 'equipment-failure' | 'overload';
}

export interface RestorationRequest {
  readonly gridSectorId: GridSectorId;
  readonly crewCount: number;
  readonly generatorUnits: number;
}

export interface RestorationConstraint {
  readonly gridSectorId: GridSectorId;
  readonly minimumCrewCount: number;
  readonly minimumGeneratorUnits: number;
  readonly prerequisiteSectorIds: readonly GridSectorId[];
}

const constraints: Readonly<Record<GridSectorId, RestorationConstraint>> = {
  'harbor-loop': {
    gridSectorId: 'harbor-loop',
    minimumCrewCount: 3,
    minimumGeneratorUnits: 1,
    prerequisiteSectorIds: ['central-loop'],
  },
  'central-loop': {
    gridSectorId: 'central-loop',
    minimumCrewCount: 4,
    minimumGeneratorUnits: 2,
    prerequisiteSectorIds: [],
  },
  'upland-loop': {
    gridSectorId: 'upland-loop',
    minimumCrewCount: 2,
    minimumGeneratorUnits: 0,
    prerequisiteSectorIds: [],
  },
  'east-loop': {
    gridSectorId: 'east-loop',
    minimumCrewCount: 3,
    minimumGeneratorUnits: 1,
    prerequisiteSectorIds: ['central-loop'],
  },
};

const initialHealth = (): Map<GridSectorId, GridSectorHealth> => {
  const result = new Map<GridSectorId, GridSectorHealth>();
  for (const sector of portAzureWorld.gridSectors) {
    const recovery = portAzureWorld.recovery.gridSectors.find(
      ({ gridSectorId }) => gridSectorId === sector.gridSectorId,
    );
    if (recovery === undefined) {
      throw new Error(`Missing grid recovery for ${sector.gridSectorId}.`);
    }
    result.set(sector.gridSectorId, {
      gridSectorId: sector.gridSectorId,
      revision: 1,
      status: recovery.status,
      availableCapacityMw: recovery.availableCapacityMw,
      baselineLoadMw: sector.baselineLoadMw,
      priorityServiceIds: sector.priorityServiceIds,
    });
  }
  return result;
};

export class GridSimulator {
  readonly #health = initialHealth();

  public getSectorHealth(
    gridSectorId?: GridSectorId,
  ): SimulatorResult<readonly GridSectorHealth[]> {
    const sectors =
      gridSectorId === undefined
        ? [...this.#health.values()]
        : [this.#health.get(gridSectorId)].filter(
            (sector): sector is GridSectorHealth => sector !== undefined,
          );
    if (sectors.length === 0) {
      return {
        ok: false,
        error: {
          code: 'not-found',
          message: `Unknown grid sector: ${String(gridSectorId)}.`,
          retryable: false,
        },
      };
    }
    return {
      ok: true,
      value: cloneFrozen(
        sectors.sort((left, right) =>
          left.gridSectorId.localeCompare(right.gridSectorId),
        ),
      ),
    };
  }

  public triggerOutage(
    gridSectorId: GridSectorId,
    cause: NonNullable<GridSectorHealth['outageCause']>,
  ): SimulatorResult<GridSectorHealth> {
    const current = this.#health.get(gridSectorId);
    if (current === undefined) {
      return this.#notFound(gridSectorId);
    }
    if (current.status === 'outage') {
      return {
        ok: false,
        error: {
          code: 'conflict',
          message: `Grid sector ${gridSectorId} is already in outage.`,
          retryable: false,
        },
      };
    }
    return this.#store({
      ...current,
      revision: current.revision + 1,
      status: 'outage',
      availableCapacityMw: 0,
      outageCause: cause,
    });
  }

  public restoreSector(
    request: RestorationRequest,
  ): SimulatorResult<GridSectorHealth> {
    const current = this.#health.get(request.gridSectorId);
    if (current === undefined) {
      return this.#notFound(request.gridSectorId);
    }
    if (current.status === 'stable') {
      return {
        ok: false,
        error: {
          code: 'conflict',
          message: `Grid sector ${request.gridSectorId} is already stable.`,
          retryable: false,
        },
      };
    }
    const constraint = constraints[request.gridSectorId];
    const unavailablePrerequisites = constraint.prerequisiteSectorIds.filter(
      (sectorId) => this.#health.get(sectorId)?.status !== 'stable',
    );
    if (
      request.crewCount < constraint.minimumCrewCount ||
      request.generatorUnits < constraint.minimumGeneratorUnits ||
      unavailablePrerequisites.length > 0
    ) {
      return {
        ok: false,
        error: {
          code: 'constraint-violation',
          message: [
            `Restoration of ${request.gridSectorId} requires`,
            `${String(constraint.minimumCrewCount)} crews,`,
            `${String(constraint.minimumGeneratorUnits)} generators,`,
            `and stable prerequisites: ${constraint.prerequisiteSectorIds.join(', ') || 'none'}.`,
          ].join(' '),
          retryable: false,
        },
      };
    }
    const definition = portAzureWorld.gridSectors.find(
      ({ gridSectorId }) => gridSectorId === request.gridSectorId,
    );
    if (definition === undefined) {
      return this.#notFound(request.gridSectorId);
    }
    return this.#store({
      gridSectorId: current.gridSectorId,
      revision: current.revision + 1,
      status: 'stable',
      availableCapacityMw: definition.generationCapacityMw,
      baselineLoadMw: current.baselineLoadMw,
      priorityServiceIds: current.priorityServiceIds,
    });
  }

  public getRestorationConstraint(
    gridSectorId: GridSectorId,
  ): SimulatorResult<RestorationConstraint> {
    return { ok: true, value: cloneFrozen(constraints[gridSectorId]) };
  }

  #notFound(gridSectorId: string): SimulatorResult<never> {
    return {
      ok: false,
      error: {
        code: 'not-found',
        message: `Unknown grid sector: ${gridSectorId}.`,
        retryable: false,
      },
    };
  }

  #store(health: GridSectorHealth): SimulatorResult<GridSectorHealth> {
    this.#health.set(health.gridSectorId, health);
    return { ok: true, value: cloneFrozen(health) };
  }
}
