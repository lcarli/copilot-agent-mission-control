import {
  Type,
  type Static,
  type TProperties,
  type TSchema,
} from '@sinclair/typebox';

import {
  ActorSchema,
  AggregateReferenceSchema,
  BoundedNoteSchema,
  EVENT_SCHEMA_VERSION,
  EventSchemaVersionSchema,
  EventVisibilitySchema,
  KebabIdSchema,
  LocalizationKeySchema,
  ReasonCodeSchema,
  SemanticVersionSchema,
  UtcDateTimeSchema,
  UuidV7Schema,
} from './common.js';

const eventScope = {};
const unitScope = {
  unitId: UuidV7Schema,
};
const missionScope = {
  missionId: KebabIdSchema,
};
const unitMissionScope = {
  unitId: UuidV7Schema,
  missionId: KebabIdSchema,
};
const unitOptionalMissionScope = {
  unitId: UuidV7Schema,
  missionId: Type.Optional(KebabIdSchema),
};

const createDomainEventSchema = <
  const TEventType extends string,
  const TPayload extends TSchema,
  const TScope extends TProperties,
>(
  eventType: TEventType,
  payload: TPayload,
  scope: TScope,
) =>
  Type.Object(
    {
      schemaVersion: EventSchemaVersionSchema,
      eventId: UuidV7Schema,
      eventType: Type.Literal(eventType),
      occurredAt: UtcDateTimeSchema,
      recordedAt: UtcDateTimeSchema,
      eventSessionId: UuidV7Schema,
      ...scope,
      actor: ActorSchema,
      correlationId: UuidV7Schema,
      causationId: Type.Optional(UuidV7Schema),
      idempotencyKey: Type.String({ minLength: 1, maxLength: 200 }),
      aggregate: AggregateReferenceSchema,
      visibility: EventVisibilitySchema,
      payload,
    },
    {
      $id: `DomainEvent.${EVENT_SCHEMA_VERSION}.${eventType}`,
      additionalProperties: false,
    },
  );

const ReasonPayloadSchema = Type.Object(
  {
    reasonCode: ReasonCodeSchema,
    note: Type.Optional(BoundedNoteSchema),
  },
  { additionalProperties: false },
);

const MissionLifecyclePayloadSchema = Type.Object(
  {
    missionVersion: SemanticVersionSchema,
    reasonCode: Type.Optional(ReasonCodeSchema),
    note: Type.Optional(BoundedNoteSchema),
  },
  { additionalProperties: false },
);

const ConnectionPayloadSchema = Type.Object(
  {
    connectionId: Type.String({ minLength: 1, maxLength: 200 }),
    transport: Type.Union([
      Type.Literal('signalr'),
      Type.Literal('polling'),
      Type.Literal('cli'),
    ]),
  },
  { additionalProperties: false },
);

const DimensionScoresSchema = Type.Object(
  {
    requiredOutcome: Type.Integer({ minimum: 0, maximum: 10000 }),
    evidenceAndGrounding: Type.Integer({ minimum: 0, maximum: 10000 }),
    reliability: Type.Integer({ minimum: 0, maximum: 10000 }),
    explainability: Type.Integer({ minimum: 0, maximum: 10000 }),
    efficiency: Type.Integer({ minimum: 0, maximum: 10000 }),
  },
  { additionalProperties: false },
);

const ValidationOutcomeSchema = Type.Union([
  Type.Literal('passed'),
  Type.Literal('partial'),
  Type.Literal('retry'),
  Type.Literal('blocked'),
]);

const CommandTargetSchema = Type.Object(
  {
    unitId: Type.Optional(UuidV7Schema),
    missionId: Type.Optional(KebabIdSchema),
    modifierId: Type.Optional(KebabIdSchema),
  },
  { additionalProperties: false },
);

export const domainEventSchemas = {
  'event-session.created': createDomainEventSchema(
    'event-session.created',
    Type.Object(
      {
        campaignId: KebabIdSchema,
        campaignVersion: SemanticVersionSchema,
        defaultLocale: Type.Union([
          Type.Literal('en'),
          Type.Literal('fr'),
          Type.Literal('pt-BR'),
        ]),
        supportedLocales: Type.Array(
          Type.Union([
            Type.Literal('en'),
            Type.Literal('fr'),
            Type.Literal('pt-BR'),
          ]),
          { minItems: 1, uniqueItems: true },
        ),
        scoringPolicyVersion: SemanticVersionSchema,
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'event-session.lobby-opened': createDomainEventSchema(
    'event-session.lobby-opened',
    Type.Object(
      {
        registrationEnabled: Type.Boolean(),
        openedAt: UtcDateTimeSchema,
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'event-session.started': createDomainEventSchema(
    'event-session.started',
    Type.Object(
      { startedAt: UtcDateTimeSchema },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'event-session.paused': createDomainEventSchema(
    'event-session.paused',
    ReasonPayloadSchema,
    eventScope,
  ),
  'event-session.resumed': createDomainEventSchema(
    'event-session.resumed',
    Type.Object(
      {
        reasonCode: Type.Optional(ReasonCodeSchema),
        note: Type.Optional(BoundedNoteSchema),
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'event-session.closed': createDomainEventSchema(
    'event-session.closed',
    Type.Object(
      {
        closedAt: UtcDateTimeSchema,
        reasonCode: ReasonCodeSchema,
        note: Type.Optional(BoundedNoteSchema),
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'unit.registered': createDomainEventSchema(
    'unit.registered',
    Type.Object(
      {
        displayName: Type.String({ minLength: 1, maxLength: 80 }),
        locale: Type.Union([
          Type.Literal('en'),
          Type.Literal('fr'),
          Type.Literal('pt-BR'),
        ]),
      },
      { additionalProperties: false },
    ),
    unitScope,
  ),
  'unit.ready': createDomainEventSchema(
    'unit.ready',
    Type.Object(
      {
        waivedChecks: Type.Array(KebabIdSchema, { uniqueItems: true }),
      },
      { additionalProperties: false },
    ),
    unitScope,
  ),
  'unit.connected': createDomainEventSchema(
    'unit.connected',
    ConnectionPayloadSchema,
    unitScope,
  ),
  'unit.disconnected': createDomainEventSchema(
    'unit.disconnected',
    Type.Object(
      {
        connectionId: Type.String({ minLength: 1, maxLength: 200 }),
        reasonCode: Type.Optional(ReasonCodeSchema),
      },
      { additionalProperties: false },
    ),
    unitScope,
  ),
  'unit.muted': createDomainEventSchema(
    'unit.muted',
    ReasonPayloadSchema,
    unitScope,
  ),
  'unit.unmuted': createDomainEventSchema(
    'unit.unmuted',
    ReasonPayloadSchema,
    unitScope,
  ),
  'mission.opened': createDomainEventSchema(
    'mission.opened',
    MissionLifecyclePayloadSchema,
    missionScope,
  ),
  'mission.paused': createDomainEventSchema(
    'mission.paused',
    MissionLifecyclePayloadSchema,
    missionScope,
  ),
  'mission.resumed': createDomainEventSchema(
    'mission.resumed',
    MissionLifecyclePayloadSchema,
    missionScope,
  ),
  'mission.closed': createDomainEventSchema(
    'mission.closed',
    MissionLifecyclePayloadSchema,
    missionScope,
  ),
  'mission.started': createDomainEventSchema(
    'mission.started',
    Type.Object(
      {
        missionRunId: UuidV7Schema,
        missionVersion: SemanticVersionSchema,
        startedAt: UtcDateTimeSchema,
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'mission.submitted': createDomainEventSchema(
    'mission.submitted',
    Type.Object(
      {
        submissionId: UuidV7Schema,
        missionRunId: UuidV7Schema,
        missionVersion: SemanticVersionSchema,
        attempt: Type.Integer({ minimum: 1 }),
        submittedAt: UtcDateTimeSchema,
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'mission.validation-started': createDomainEventSchema(
    'mission.validation-started',
    Type.Object(
      {
        validationRequestId: UuidV7Schema,
        submissionId: UuidV7Schema,
        validatorId: KebabIdSchema,
        validatorVersion: SemanticVersionSchema,
        deadlineAt: UtcDateTimeSchema,
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'mission.validation-completed': createDomainEventSchema(
    'mission.validation-completed',
    Type.Object(
      {
        validationResultId: UuidV7Schema,
        validationRequestId: UuidV7Schema,
        submissionId: UuidV7Schema,
        validatorId: KebabIdSchema,
        validatorVersion: SemanticVersionSchema,
        outcome: ValidationOutcomeSchema,
        dimensionScores: DimensionScoresSchema,
        durationMs: Type.Integer({ minimum: 0, maximum: 60000 }),
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'mission.completed': createDomainEventSchema(
    'mission.completed',
    Type.Object(
      {
        missionRunId: UuidV7Schema,
        validationResultId: UuidV7Schema,
        completedAt: UtcDateTimeSchema,
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'mission.blocked': createDomainEventSchema(
    'mission.blocked',
    Type.Object(
      {
        missionRunId: UuidV7Schema,
        reasonCode: ReasonCodeSchema,
        validationResultId: Type.Optional(UuidV7Schema),
        note: Type.Optional(BoundedNoteSchema),
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'hint.requested': createDomainEventSchema(
    'hint.requested',
    Type.Object(
      {
        level: Type.Integer({ minimum: 1, maximum: 3 }),
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'hint.delivered': createDomainEventSchema(
    'hint.delivered',
    Type.Object(
      {
        level: Type.Integer({ minimum: 1, maximum: 3 }),
        contentKey: LocalizationKeySchema,
      },
      { additionalProperties: false },
    ),
    unitMissionScope,
  ),
  'score.changed': createDomainEventSchema(
    'score.changed',
    Type.Object(
      {
        scoreEntryId: UuidV7Schema,
        entryType: Type.Union([
          Type.Literal('validation-award'),
          Type.Literal('advanced-bonus'),
          Type.Literal('hint-adjustment'),
          Type.Literal('instructor-adjustment'),
          Type.Literal('correction'),
        ]),
        dimension: Type.Optional(
          Type.Union([
            Type.Literal('requiredOutcome'),
            Type.Literal('evidenceAndGrounding'),
            Type.Literal('reliability'),
            Type.Literal('explainability'),
            Type.Literal('efficiency'),
          ]),
        ),
        points: Type.Integer(),
        totalPoints: Type.Integer({ minimum: 0 }),
        reasonCode: ReasonCodeSchema,
        sourceId: UuidV7Schema,
      },
      { additionalProperties: false },
    ),
    unitOptionalMissionScope,
  ),
  'achievement.awarded': createDomainEventSchema(
    'achievement.awarded',
    Type.Object(
      {
        achievementId: KebabIdSchema,
        achievementVersion: SemanticVersionSchema,
        titleKey: LocalizationKeySchema,
      },
      { additionalProperties: false },
    ),
    unitOptionalMissionScope,
  ),
  'incident-modifier.activated': createDomainEventSchema(
    'incident-modifier.activated',
    Type.Object(
      {
        modifierId: KebabIdSchema,
        parameters: Type.Record(Type.String({ maxLength: 80 }), Type.Unknown()),
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'incident-modifier.deactivated': createDomainEventSchema(
    'incident-modifier.deactivated',
    Type.Object(
      {
        modifierId: KebabIdSchema,
        reasonCode: Type.Optional(ReasonCodeSchema),
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'instructor-command.accepted': createDomainEventSchema(
    'instructor-command.accepted',
    Type.Object(
      {
        commandId: UuidV7Schema,
        commandType: Type.String({
          minLength: 3,
          maxLength: 120,
          pattern: '^[a-z][a-z0-9-]*\\.[a-z][a-z0-9-]*$',
        }),
        target: CommandTargetSchema,
        resultingAggregateVersion: Type.Integer({ minimum: 1 }),
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
  'instructor-command.rejected': createDomainEventSchema(
    'instructor-command.rejected',
    Type.Object(
      {
        commandId: UuidV7Schema,
        commandType: Type.String({
          minLength: 3,
          maxLength: 120,
          pattern: '^[a-z][a-z0-9-]*\\.[a-z][a-z0-9-]*$',
        }),
        target: CommandTargetSchema,
        errorCode: ReasonCodeSchema,
      },
      { additionalProperties: false },
    ),
    eventScope,
  ),
} as const;

export type DomainEventType = keyof typeof domainEventSchemas;
export type DomainEvent = Static<(typeof domainEventSchemas)[DomainEventType]>;

export const domainEventTypes = Object.freeze(
  Object.keys(domainEventSchemas) as DomainEventType[],
);

export const isDomainEventType = (value: string): value is DomainEventType =>
  Object.hasOwn(domainEventSchemas, value);
