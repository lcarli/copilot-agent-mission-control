import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const text = () => Type.String({ minLength: 1, maxLength: 200 });
const closed = { additionalProperties: false } as const;

export const SimulatorInvocationSchema = Type.Object(
  {
    tool: text(),
    operation: text(),
    arguments: Type.Record(Type.String(), Type.Unknown()),
  },
  closed,
);

export const SimulatorObservationSchema = Type.Object(
  {
    schemaVersion: Type.Literal('1.0'),
    evidenceId: text(),
    eventSessionId: text(),
    unitId: text(),
    missionId: text(),
    sequence: Type.Integer({ minimum: 1 }),
    recordedAt: text(),
    ...SimulatorInvocationSchema.properties,
    result: Type.Union([
      Type.Object({ ok: Type.Literal(true), value: Type.Unknown() }, closed),
      Type.Object(
        {
          ok: Type.Literal(false),
          error: Type.Object(
            { code: text(), message: Type.String(), retryable: Type.Boolean() },
            closed,
          ),
        },
        closed,
      ),
    ]),
  },
  closed,
);

export const SimulatorCatalogSchema = Type.Object(
  {
    missionId: text(),
    tools: Type.Array(
      Type.Object(
        {
          tool: text(),
          operation: text(),
          argumentsSchema: Type.Record(Type.String(), Type.Unknown()),
        },
        closed,
      ),
      { maxItems: 100 },
    ),
  },
  closed,
);

export type SimulatorInvocation = Static<typeof SimulatorInvocationSchema>;
export type SimulatorObservation = Static<typeof SimulatorObservationSchema>;
export type SimulatorCatalog = Static<typeof SimulatorCatalogSchema>;

export const isSimulatorObservation = (
  value: unknown,
): value is SimulatorObservation =>
  Value.Check(SimulatorObservationSchema, value);

export const decodeSimulatorInvocation = (
  value: unknown,
): SimulatorInvocation => Value.Decode(SimulatorInvocationSchema, value);
export const decodeSimulatorObservation = (
  value: unknown,
): SimulatorObservation => Value.Decode(SimulatorObservationSchema, value);
export const decodeSimulatorCatalog = (value: unknown): SimulatorCatalog =>
  Value.Decode(SimulatorCatalogSchema, value);
