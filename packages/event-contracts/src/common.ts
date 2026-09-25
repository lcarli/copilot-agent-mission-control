import { Type, type Static } from '@sinclair/typebox';

export const EVENT_SCHEMA_VERSION = '1.0' as const;

export const UuidV7Schema = Type.String({
  $id: 'UuidV7',
  pattern:
    '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
});

export const UtcDateTimeSchema = Type.String({
  $id: 'UtcDateTime',
  pattern:
    '^[0-9]{4}-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\\.[0-9]{1,9})?Z$',
});

export const KebabIdSchema = Type.String({
  $id: 'KebabId',
  minLength: 1,
  maxLength: 120,
  pattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
});

export const SemanticVersionSchema = Type.String({
  $id: 'SemanticVersion',
  pattern:
    '^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$',
});

export const LocalizationKeySchema = Type.String({
  $id: 'LocalizationKey',
  minLength: 3,
  maxLength: 160,
  pattern: '^[a-z][a-z0-9]*(?:\\.[A-Za-z0-9][A-Za-z0-9_-]*)+$',
});

export const EventSchemaVersionSchema = Type.Literal(EVENT_SCHEMA_VERSION, {
  $id: 'EventSchemaVersion',
});

export const ActorSchema = Type.Object(
  {
    actorType: Type.Union([
      Type.Literal('unit'),
      Type.Literal('instructor'),
      Type.Literal('service'),
      Type.Literal('system'),
    ]),
    actorId: Type.Union([
      UuidV7Schema,
      Type.String({
        minLength: 1,
        maxLength: 120,
        pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
      }),
    ]),
    role: KebabIdSchema,
  },
  {
    $id: 'Actor',
    additionalProperties: false,
  },
);

export const AggregateReferenceSchema = Type.Object(
  {
    type: KebabIdSchema,
    id: UuidV7Schema,
    version: Type.Integer({ minimum: 1 }),
  },
  {
    $id: 'AggregateReference',
    additionalProperties: false,
  },
);

export const EventVisibilitySchema = Type.Union(
  [
    Type.Literal('private'),
    Type.Literal('unit'),
    Type.Literal('instructor'),
    Type.Literal('public'),
  ],
  { $id: 'EventVisibility' },
);

export const ReasonCodeSchema = Type.String({
  minLength: 1,
  maxLength: 120,
  pattern: '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$',
});

export const BoundedNoteSchema = Type.String({
  minLength: 1,
  maxLength: 1000,
});

export type Actor = Static<typeof ActorSchema>;
export type AggregateReference = Static<typeof AggregateReferenceSchema>;
export type EventVisibility = Static<typeof EventVisibilitySchema>;
