import {
  portAzureWorld,
  type GridSectorId,
  type RouteId,
  type ShelterId,
} from './world.js';
import type { WeatherScenarioId } from './simulators/weather.js';
import { cloneFrozen, type SimulatorResult } from './simulators/shared.js';

export const incidentModifierIds = [
  'storm-surge-escalation',
  'grid-sector-failure',
  'route-emergency-closure',
  'shelter-capacity-pressure',
  'simulator-tool-outage',
] as const;
export type IncidentModifierId = (typeof incidentModifierIds)[number];
export type SimulatorToolId =
  'weather' | 'grid' | 'shelter' | 'transport' | 'incidents' | 'resources';

export interface IncidentModifierDefinition {
  readonly modifierId: IncidentModifierId;
  readonly title: string;
  readonly description: string;
  readonly facilitatorGuidance: string;
  readonly risk: 'low' | 'moderate' | 'high';
  readonly reversible: true;
  readonly affectedScope:
    | 'weather'
    | 'grid-sector'
    | 'transport-route'
    | 'shelter'
    | 'simulator-tool';
}

export interface ActiveIncidentModifier {
  readonly modifierId: IncidentModifierId;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly affectedKey: string;
  readonly previousValue: unknown;
}

export interface CampaignScenarioState {
  readonly revision: number;
  readonly weatherScenarioId: WeatherScenarioId;
  readonly gridOutageIds: readonly GridSectorId[];
  readonly closedRouteIds: readonly RouteId[];
  readonly shelterCapacityAdjustments: Readonly<
    Partial<Record<ShelterId, number>>
  >;
  readonly unavailableTools: readonly SimulatorToolId[];
  readonly activeModifiers: Readonly<
    Partial<Record<IncidentModifierId, ActiveIncidentModifier>>
  >;
}

export const incidentModifierCatalog: Readonly<
  Record<IncidentModifierId, IncidentModifierDefinition>
> = {
  'storm-surge-escalation': {
    modifierId: 'storm-surge-escalation',
    title: 'Escalate storm surge',
    description:
      'Switch weather observations and forecasts to the deterministic storm-surge scenario.',
    facilitatorGuidance:
      'Use during Mission 5 after units have produced an initial plan.',
    risk: 'high',
    reversible: true,
    affectedScope: 'weather',
  },
  'grid-sector-failure': {
    modifierId: 'grid-sector-failure',
    title: 'Trigger grid-sector failure',
    description:
      'Mark one known electrical sector for a controlled outage scenario.',
    facilitatorGuidance:
      'Choose a sector relevant to the active plan; avoid stacking failures on the same sector.',
    risk: 'high',
    reversible: true,
    affectedScope: 'grid-sector',
  },
  'route-emergency-closure': {
    modifierId: 'route-emergency-closure',
    title: 'Close transport route',
    description:
      'Close one known route and require units to recompute travel plans.',
    facilitatorGuidance:
      'Confirm that at least one alternate path remains before activation.',
    risk: 'moderate',
    reversible: true,
    affectedScope: 'transport-route',
  },
  'shelter-capacity-pressure': {
    modifierId: 'shelter-capacity-pressure',
    title: 'Reduce shelter capacity',
    description: 'Apply a bounded temporary capacity reduction to one shelter.',
    facilitatorGuidance:
      'Capacity cannot drop below current occupancy or below half of its configured capacity.',
    risk: 'moderate',
    reversible: true,
    affectedScope: 'shelter',
  },
  'simulator-tool-outage': {
    modifierId: 'simulator-tool-outage',
    title: 'Interrupt simulator tool',
    description:
      'Make one simulator tool temporarily unavailable to exercise fallback behavior.',
    facilitatorGuidance:
      'Do not disable more than one simulator tool at a time.',
    risk: 'moderate',
    reversible: true,
    affectedScope: 'simulator-tool',
  },
};

export const initialCampaignScenarioState = (): CampaignScenarioState =>
  cloneFrozen({
    revision: 1,
    weatherScenarioId: 'accelerating-storm',
    gridOutageIds: [],
    closedRouteIds: portAzureWorld.recovery.routes
      .filter(({ status }) => status === 'closed')
      .map(({ routeId }) => routeId),
    shelterCapacityAdjustments: {},
    unavailableTools: [],
    activeModifiers: {},
  });

const stringParameter = (
  parameters: Readonly<Record<string, unknown>>,
  name: string,
): string | undefined => {
  const value = parameters[name];
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
};

const conflict = (message: string): SimulatorResult<never> => ({
  ok: false,
  error: { code: 'conflict', message, retryable: false },
});

const invalid = (message: string): SimulatorResult<never> => ({
  ok: false,
  error: { code: 'invalid-request', message, retryable: false },
});

const isIncidentModifierId = (value: string): value is IncidentModifierId =>
  incidentModifierIds.some((candidate) => candidate === value);

export const activateIncidentModifier = (
  state: CampaignScenarioState,
  modifierId: string,
  parameters: Readonly<Record<string, unknown>>,
): SimulatorResult<CampaignScenarioState> => {
  if (!isIncidentModifierId(modifierId)) {
    return invalid(`Unknown incident modifier: ${modifierId}.`);
  }
  if (state.activeModifiers[modifierId] !== undefined) {
    return conflict(`Incident modifier ${modifierId} is already active.`);
  }

  let affectedKey: string;
  let previousValue: unknown;
  let changes: Partial<CampaignScenarioState>;

  switch (modifierId) {
    case 'storm-surge-escalation':
      affectedKey = 'weather';
      previousValue = state.weatherScenarioId;
      changes = { weatherScenarioId: 'storm-surge' };
      break;
    case 'grid-sector-failure': {
      const gridSectorId = stringParameter(parameters, 'gridSectorId');
      if (
        gridSectorId === undefined ||
        !portAzureWorld.gridSectors.some(
          (sector) => sector.gridSectorId === gridSectorId,
        )
      ) {
        return invalid('gridSectorId must identify a known grid sector.');
      }
      affectedKey = `grid:${gridSectorId}`;
      previousValue = state.gridOutageIds.includes(
        gridSectorId as GridSectorId,
      );
      changes = {
        gridOutageIds: [
          ...new Set([...state.gridOutageIds, gridSectorId as GridSectorId]),
        ],
      };
      break;
    }
    case 'route-emergency-closure': {
      const routeId = stringParameter(parameters, 'routeId');
      if (
        routeId === undefined ||
        !portAzureWorld.routes.some((route) => route.routeId === routeId)
      ) {
        return invalid('routeId must identify a known transport route.');
      }
      const alternateRoutes = portAzureWorld.routes.filter(
        (route) =>
          route.routeId !== routeId &&
          !state.closedRouteIds.includes(route.routeId),
      );
      if (alternateRoutes.length === 0) {
        return conflict('Route closure would leave no available routes.');
      }
      affectedKey = `route:${routeId}`;
      previousValue = state.closedRouteIds.includes(routeId as RouteId);
      changes = {
        closedRouteIds: [
          ...new Set([...state.closedRouteIds, routeId as RouteId]),
        ],
      };
      break;
    }
    case 'shelter-capacity-pressure': {
      const shelterId = stringParameter(parameters, 'shelterId');
      const reduction = parameters.reduction;
      const shelter = portAzureWorld.shelters.find(
        (candidate) => candidate.shelterId === shelterId,
      );
      const recovery = portAzureWorld.recovery.shelters.find(
        (candidate) => candidate.shelterId === shelterId,
      );
      if (
        shelter === undefined ||
        recovery === undefined ||
        typeof reduction !== 'number' ||
        !Number.isInteger(reduction) ||
        reduction <= 0
      ) {
        return invalid(
          'shelterId and a positive integer reduction are required.',
        );
      }
      const currentAdjustment =
        state.shelterCapacityAdjustments[shelter.shelterId] ?? 0;
      const resultingCapacity =
        shelter.capacity + currentAdjustment - reduction;
      if (
        resultingCapacity < recovery.occupancy ||
        resultingCapacity < Math.ceil(shelter.capacity / 2)
      ) {
        return conflict(
          'Shelter capacity cannot fall below occupancy or fifty percent.',
        );
      }
      affectedKey = `shelter:${shelter.shelterId}`;
      previousValue = currentAdjustment;
      changes = {
        shelterCapacityAdjustments: {
          ...state.shelterCapacityAdjustments,
          [shelter.shelterId]: currentAdjustment - reduction,
        },
      };
      break;
    }
    case 'simulator-tool-outage': {
      const toolId = stringParameter(parameters, 'toolId');
      const tools: readonly SimulatorToolId[] = [
        'weather',
        'grid',
        'shelter',
        'transport',
        'incidents',
        'resources',
      ];
      if (
        toolId === undefined ||
        !tools.some((candidate) => candidate === toolId)
      ) {
        return invalid('toolId must identify a known simulator tool.');
      }
      if (state.unavailableTools.length > 0) {
        return conflict('Only one simulator tool may be unavailable.');
      }
      affectedKey = `tool:${toolId}`;
      previousValue = false;
      changes = { unavailableTools: [toolId as SimulatorToolId] };
      break;
    }
  }

  if (
    Object.values(state.activeModifiers).some(
      (active) => active.affectedKey === affectedKey,
    )
  ) {
    return conflict(`Another modifier already affects ${affectedKey}.`);
  }

  return {
    ok: true,
    value: cloneFrozen({
      ...state,
      ...changes,
      revision: state.revision + 1,
      activeModifiers: {
        ...state.activeModifiers,
        [modifierId]: {
          modifierId,
          parameters: structuredClone(parameters),
          affectedKey,
          previousValue,
        },
      },
    }),
  };
};

export const deactivateIncidentModifier = (
  state: CampaignScenarioState,
  modifierId: string,
): SimulatorResult<CampaignScenarioState> => {
  if (!isIncidentModifierId(modifierId)) {
    return invalid(`Unknown incident modifier: ${modifierId}.`);
  }
  const active = state.activeModifiers[modifierId];
  if (active === undefined) {
    return conflict(`Incident modifier ${modifierId} is not active.`);
  }

  let changes: Partial<CampaignScenarioState>;
  switch (modifierId) {
    case 'storm-surge-escalation':
      changes = {
        weatherScenarioId: active.previousValue as WeatherScenarioId,
      };
      break;
    case 'grid-sector-failure': {
      const gridSectorId = stringParameter(active.parameters, 'gridSectorId');
      changes = {
        gridOutageIds:
          active.previousValue === true || gridSectorId === undefined
            ? state.gridOutageIds
            : state.gridOutageIds.filter(
                (candidate) => candidate !== gridSectorId,
              ),
      };
      break;
    }
    case 'route-emergency-closure': {
      const routeId = stringParameter(active.parameters, 'routeId');
      changes = {
        closedRouteIds:
          active.previousValue === true || routeId === undefined
            ? state.closedRouteIds
            : state.closedRouteIds.filter((candidate) => candidate !== routeId),
      };
      break;
    }
    case 'shelter-capacity-pressure': {
      const shelterId = stringParameter(active.parameters, 'shelterId');
      if (shelterId === undefined) {
        return invalid('Active shelter modifier is missing shelterId.');
      }
      changes = {
        shelterCapacityAdjustments: {
          ...state.shelterCapacityAdjustments,
          [shelterId]: active.previousValue as number,
        },
      };
      break;
    }
    case 'simulator-tool-outage': {
      const toolId = stringParameter(active.parameters, 'toolId');
      changes = {
        unavailableTools:
          toolId === undefined
            ? state.unavailableTools
            : state.unavailableTools.filter(
                (candidate) => candidate !== toolId,
              ),
      };
      break;
    }
  }

  const activeModifiers = Object.fromEntries(
    Object.entries(state.activeModifiers).filter(
      ([activeId]) => activeId !== modifierId,
    ),
  );
  return {
    ok: true,
    value: cloneFrozen({
      ...state,
      ...changes,
      revision: state.revision + 1,
      activeModifiers,
    }),
  };
};
