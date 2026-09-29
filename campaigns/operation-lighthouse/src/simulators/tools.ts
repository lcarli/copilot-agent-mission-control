import type {
  SimulatorCatalog,
  SimulatorInvocation,
  SimulatorObservation,
} from '@mission-control/event-contracts';
import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

import { districtIds, gridSectorIds } from '../world.js';
import { GridSimulator } from './grid.js';
import { IncidentIntakeSimulator } from './incidents.js';
import { ResourceInventorySimulator } from './resources.js';
import { cloneFrozen, type SimulatorResult } from './shared.js';
import { ShelterSimulator } from './shelter.js';
import { TransportSimulator } from './transport.js';
import { WeatherSimulator } from './weather.js';

const closed = { additionalProperties: false } as const;
const district = Type.Union(districtIds.map((id) => Type.Literal(id)));
const sector = Type.Union(gridSectorIds.map((id) => Type.Literal(id)));
const empty = Type.Object({}, closed);
const districtQuery = Type.Object(
  { districtId: Type.Optional(district) },
  closed,
);

interface CityTools {
  readonly weather: WeatherSimulator;
  readonly shelter: ShelterSimulator;
  readonly transport: TransportSimulator;
  readonly grid: GridSimulator;
  readonly resources: ResourceInventorySimulator;
  readonly incidents: IncidentIntakeSimulator;
}

const defineTool = <S extends TSchema>(
  tool: keyof CityTools,
  operation: string,
  argumentsSchema: S,
  invoke: (city: CityTools, args: Static<S>) => SimulatorResult<unknown>,
) => ({
  tool,
  operation,
  argumentsSchema,
  schema: Type.Object(
    {
      tool: Type.Literal(tool),
      operation: Type.Literal(operation),
      arguments: argumentsSchema,
    },
    closed,
  ),
  invoke(city: CityTools, args: unknown): SimulatorResult<unknown> {
    if (!Value.Check(argumentsSchema, args)) {
      throw new Error('Invalid simulator arguments.');
    }
    return invoke(city, args);
  },
});

const tools = [
  defineTool('weather', 'observations', districtQuery, (city, args) =>
    city.weather.getObservation(args.districtId),
  ),
  defineTool('weather', 'forecast', empty, (city) =>
    city.weather.getForecast(),
  ),
  defineTool('shelter', 'list', districtQuery, (city, args) =>
    city.shelter.getShelters(args.districtId),
  ),
  defineTool('transport', 'routes', districtQuery, (city, args) =>
    city.transport.getRoutes(args.districtId),
  ),
  defineTool(
    'transport',
    'journey',
    Type.Object(
      {
        originDistrictId: district,
        destinationDistrictId: district,
        mode: Type.Union([
          Type.Literal('bus'),
          Type.Literal('emergency'),
          Type.Literal('pedestrian'),
        ]),
      },
      closed,
    ),
    (city, args) =>
      city.transport.planJourney(
        args.originDistrictId,
        args.destinationDistrictId,
        args.mode,
      ),
  ),
  defineTool(
    'grid',
    'health',
    Type.Object({ gridSectorId: Type.Optional(sector) }, closed),
    (city, args) => city.grid.getSectorHealth(args.gridSectorId),
  ),
  defineTool(
    'grid',
    'constraints',
    Type.Object({ gridSectorId: sector }, closed),
    (city, args) => city.grid.getRestorationConstraint(args.gridSectorId),
  ),
  defineTool('resources', 'inventory', empty, (city) =>
    city.resources.getInventory(),
  ),
  defineTool('incidents', 'reports', districtQuery, (city, args) =>
    city.incidents.getReports(args),
  ),
] as const;

export const LighthouseSimulatorInvocationSchema = Type.Union(
  tools.map(({ schema }) => schema),
);

export const lighthouseSimulatorCatalog = (
  missionId: string,
): SimulatorCatalog => ({
  missionId,
  tools: tools
    .filter(
      ({ tool }) =>
        missionId === 'restore-the-lighthouse' ||
        (missionId === 'connected-city' &&
          ['weather', 'shelter', 'transport'].includes(tool)),
    )
    .map(({ tool, operation, argumentsSchema }) => ({
      tool,
      operation,
      argumentsSchema,
    })),
});

export interface SimulatorScope {
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId: string;
}

export class LighthouseSimulatorSession {
  readonly #city: CityTools;
  readonly #observations: SimulatorObservation[] = [];

  constructor(private readonly scope: SimulatorScope) {
    if (lighthouseSimulatorCatalog(scope.missionId).tools.length === 0) {
      throw new Error('This mission has no simulator tools.');
    }
    const weather = new WeatherSimulator();
    const advanced = weather.advance();
    if (!advanced.ok) throw new Error(advanced.error.message);
    this.#city = {
      weather,
      shelter: new ShelterSimulator(),
      transport: new TransportSimulator(),
      grid: new GridSimulator(),
      resources: new ResourceInventorySimulator(),
      incidents: new IncidentIntakeSimulator(),
    };
  }

  invoke(
    input: SimulatorInvocation,
    evidenceId: string,
    recordedAt: string,
  ): SimulatorObservation {
    const definition = tools.find(
      (candidate) =>
        candidate.tool === input.tool &&
        candidate.operation === input.operation,
    );
    if (
      definition === undefined ||
      !lighthouseSimulatorCatalog(this.scope.missionId).tools.some(
        ({ tool, operation }) =>
          tool === input.tool && operation === input.operation,
      )
    ) {
      throw new Error('Simulator operation is not available in this mission.');
    }
    const observation: SimulatorObservation = cloneFrozen({
      schemaVersion: '1.0',
      ...this.scope,
      tool: input.tool,
      operation: input.operation,
      arguments: input.arguments,
      evidenceId,
      sequence: this.#observations.length + 1,
      recordedAt,
      result: definition.invoke(this.#city, input.arguments),
    });
    this.#observations.push(observation);
    return observation;
  }

  observations(): readonly SimulatorObservation[] {
    return cloneFrozen(this.#observations);
  }
}
