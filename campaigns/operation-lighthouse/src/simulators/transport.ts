import {
  portAzureWorld,
  type DistrictId,
  type RouteId,
  type RouteStatus,
} from '../world.js';
import { cloneFrozen, type SimulatorResult } from './shared.js';

export type TransportMode = 'bus' | 'emergency' | 'pedestrian';

export interface RouteCondition {
  readonly routeId: RouteId;
  readonly revision: number;
  readonly fromDistrictId: DistrictId;
  readonly toDistrictId: DistrictId;
  readonly status: RouteStatus;
  readonly allowedModes: readonly TransportMode[];
  readonly travelMinutes: number;
  readonly restrictionReason?: string;
}

export interface RouteConditionUpdate {
  readonly routeId: RouteId;
  readonly status: RouteStatus;
  readonly delayMinutes: number;
  readonly allowedModes: readonly TransportMode[];
  readonly restrictionReason?: string;
}

export interface JourneyPlan {
  readonly originDistrictId: DistrictId;
  readonly destinationDistrictId: DistrictId;
  readonly mode: TransportMode;
  readonly routeIds: readonly RouteId[];
  readonly districtIds: readonly DistrictId[];
  readonly totalMinutes: number;
}

const initialConditions = (): Map<RouteId, RouteCondition> => {
  const result = new Map<RouteId, RouteCondition>();
  for (const route of portAzureWorld.routes) {
    const recovery = portAzureWorld.recovery.routes.find(
      ({ routeId }) => routeId === route.routeId,
    );
    if (recovery === undefined) {
      throw new Error(`Missing route recovery for ${route.routeId}.`);
    }
    const constrained = recovery.status === 'constrained';
    result.set(route.routeId, {
      routeId: route.routeId,
      revision: 1,
      fromDistrictId: route.fromDistrictId,
      toDistrictId: route.toDistrictId,
      status: recovery.status,
      allowedModes: constrained
        ? route.modes.filter((mode) => mode !== 'bus')
        : recovery.status === 'closed'
          ? []
          : route.modes,
      travelMinutes: route.baselineMinutes + (constrained ? 8 : 0),
      ...(constrained ? { restrictionReason: 'storm-debris-restriction' } : {}),
    });
  }
  return result;
};

export class TransportSimulator {
  readonly #routes = initialConditions();

  public getRoutes(
    districtId?: DistrictId,
  ): SimulatorResult<readonly RouteCondition[]> {
    const routes = [...this.#routes.values()]
      .filter(
        (route) =>
          districtId === undefined ||
          route.fromDistrictId === districtId ||
          route.toDistrictId === districtId,
      )
      .sort((left, right) => left.routeId.localeCompare(right.routeId));
    if (routes.length === 0) {
      return {
        ok: false,
        error: {
          code: 'not-found',
          message: `No route exists for district ${String(districtId)}.`,
          retryable: false,
        },
      };
    }
    return { ok: true, value: cloneFrozen(routes) };
  }

  public updateRoute(
    update: RouteConditionUpdate,
  ): SimulatorResult<RouteCondition> {
    const current = this.#routes.get(update.routeId);
    if (current === undefined) {
      return this.#notFound(update.routeId);
    }
    if (
      !Number.isInteger(update.delayMinutes) ||
      update.delayMinutes < 0 ||
      (update.status === 'closed' && update.allowedModes.length > 0) ||
      (update.status !== 'closed' && update.allowedModes.length === 0)
    ) {
      return {
        ok: false,
        error: {
          code: 'invalid-request',
          message: 'Route status, modes, and delay are inconsistent.',
          retryable: false,
        },
      };
    }
    const definition = portAzureWorld.routes.find(
      ({ routeId }) => routeId === update.routeId,
    );
    if (
      definition === undefined ||
      update.allowedModes.some((mode) => !definition.modes.includes(mode))
    ) {
      return {
        ok: false,
        error: {
          code: 'constraint-violation',
          message: `Route ${update.routeId} does not support every requested mode.`,
          retryable: false,
        },
      };
    }
    const next: RouteCondition = {
      routeId: current.routeId,
      revision: current.revision + 1,
      fromDistrictId: current.fromDistrictId,
      toDistrictId: current.toDistrictId,
      status: update.status,
      allowedModes: update.allowedModes,
      travelMinutes: definition.baselineMinutes + update.delayMinutes,
      ...(update.restrictionReason === undefined
        ? {}
        : { restrictionReason: update.restrictionReason }),
    };
    this.#routes.set(next.routeId, next);
    return { ok: true, value: cloneFrozen(next) };
  }

  public planJourney(
    originDistrictId: DistrictId,
    destinationDistrictId: DistrictId,
    mode: TransportMode,
  ): SimulatorResult<JourneyPlan> {
    if (originDistrictId === destinationDistrictId) {
      return {
        ok: false,
        error: {
          code: 'invalid-request',
          message: 'Journey origin and destination must differ.',
          retryable: false,
        },
      };
    }

    const distances = new Map<DistrictId, number>([[originDistrictId, 0]]);
    const previous = new Map<
      DistrictId,
      { readonly districtId: DistrictId; readonly routeId: RouteId }
    >();
    const unvisited = new Set(
      portAzureWorld.districts.map(({ districtId }) => districtId),
    );

    while (unvisited.size > 0) {
      const current = [...unvisited].sort((left, right) => {
        const difference =
          (distances.get(left) ?? Number.POSITIVE_INFINITY) -
          (distances.get(right) ?? Number.POSITIVE_INFINITY);
        return difference === 0 ? left.localeCompare(right) : difference;
      })[0];
      if (
        current === undefined ||
        (distances.get(current) ?? Number.POSITIVE_INFINITY) ===
          Number.POSITIVE_INFINITY
      ) {
        break;
      }
      unvisited.delete(current);
      if (current === destinationDistrictId) {
        break;
      }
      for (const route of this.#routes.values()) {
        if (
          route.status === 'closed' ||
          !route.allowedModes.includes(mode) ||
          (route.fromDistrictId !== current && route.toDistrictId !== current)
        ) {
          continue;
        }
        const neighbor =
          route.fromDistrictId === current
            ? route.toDistrictId
            : route.fromDistrictId;
        if (!unvisited.has(neighbor)) {
          continue;
        }
        const candidate = (distances.get(current) ?? 0) + route.travelMinutes;
        if (candidate < (distances.get(neighbor) ?? Number.POSITIVE_INFINITY)) {
          distances.set(neighbor, candidate);
          previous.set(neighbor, {
            districtId: current,
            routeId: route.routeId,
          });
        }
      }
    }

    const totalMinutes = distances.get(destinationDistrictId);
    if (totalMinutes === undefined) {
      return {
        ok: false,
        error: {
          code: 'not-found',
          message: `No ${mode} route is available from ${originDistrictId} to ${destinationDistrictId}.`,
          retryable: false,
        },
      };
    }
    const districtIds: DistrictId[] = [destinationDistrictId];
    const routeIds: RouteId[] = [];
    let cursor = destinationDistrictId;
    while (cursor !== originDistrictId) {
      const step = previous.get(cursor);
      if (step === undefined) {
        return {
          ok: false,
          error: {
            code: 'not-found',
            message: 'Journey path could not be reconstructed.',
            retryable: false,
          },
        };
      }
      districtIds.unshift(step.districtId);
      routeIds.unshift(step.routeId);
      cursor = step.districtId;
    }
    return {
      ok: true,
      value: cloneFrozen({
        originDistrictId,
        destinationDistrictId,
        mode,
        routeIds,
        districtIds,
        totalMinutes,
      }),
    };
  }

  #notFound(routeId: string): SimulatorResult<never> {
    return {
      ok: false,
      error: {
        code: 'not-found',
        message: `Unknown route: ${routeId}.`,
        retryable: false,
      },
    };
  }
}
