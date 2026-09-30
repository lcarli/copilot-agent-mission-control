import {
  MissionSubmissionFeedbackSchema,
  SimulatorObservationSchema,
} from '@mission-control/event-contracts';
import { Type } from '@sinclair/typebox';

const text = () => Type.String({ minLength: 1, maxLength: 1000 });
const integer = () => Type.Integer({ minimum: 0 });
const version = () => Type.Integer({ minimum: 1 });
const closed = { additionalProperties: false } as const;
const literals = <const T extends readonly string[]>(values: T) =>
  Type.Union(values.map((value: T[number]) => Type.Literal(value)));
const locale = literals(['en', 'fr', 'pt-BR']);
const eventScope = { eventSessionId: text() };
const unitScope = { ...eventScope, unitId: text() };
const missionScope = { ...unitScope, missionId: text() };
const unknownRecord = Type.Record(Type.String(), Type.Unknown());
const outcome = literals(['passed', 'partial', 'retry', 'blocked']);
const rule = Type.Object(
  {
    ruleId: text(),
    status: literals(['passed', 'failed', 'not-applicable', 'error']),
    severity: literals(['required', 'advanced', 'diagnostic']),
    messageKey: text(),
    messageArgs: Type.Optional(
      Type.Record(
        Type.String(),
        Type.Union([Type.String(), Type.Number(), Type.Boolean()]),
      ),
    ),
    evidenceIds: Type.Optional(Type.Array(text(), { maxItems: 100 })),
  },
  closed,
);

export const documentSchemas = {
  head: Type.Object({ revision: version() }, closed),
  event: Type.Object(
    {
      ...eventScope,
      campaignId: text(),
      campaignVersion: text(),
      campaignArtifactSha256: Type.Optional(
        Type.String({ pattern: '^[a-f0-9]{64}$' }),
      ),
      defaultLocale: locale,
      supportedLocales: Type.Array(locale, { minItems: 1, maxItems: 3 }),
      status: literals([
        'draft',
        'lobby',
        'active',
        'paused',
        'closed',
        'archived',
      ]),
      registrationEnabled: Type.Boolean(),
      eventCodeVerifier: text(),
      eventCodeLookup: Type.Optional(text()),
      scenarioSeed: text(),
      scoringPolicyVersion: text(),
      createdBy: text(),
      createdInTenant: Type.Optional(text()),
      createdAt: text(),
      updatedAt: text(),
      version: version(),
    },
    closed,
  ),
  unit: Type.Object(
    {
      ...unitScope,
      displayName: text(),
      normalizedDisplayName: text(),
      locale,
      status: literals([
        'registered',
        'ready',
        'active',
        'disconnected',
        'muted',
        'withdrawn',
        'completed',
      ]),
      tokenVersion: version(),
      reconnectVerifier: text(),
      connectedAt: text(),
      lastSeenAt: text(),
      createdAt: text(),
      updatedAt: text(),
      version: version(),
    },
    closed,
  ),
  mission: Type.Object(
    {
      ...eventScope,
      missionId: text(),
      missionVersion: text(),
      prerequisiteMissions: Type.Array(text(), { maxItems: 100 }),
      status: literals(['locked', 'open', 'paused', 'closed']),
      openedAt: Type.Optional(text()),
      pausedAt: Type.Optional(text()),
      closedAt: Type.Optional(text()),
      updatedAt: text(),
      version: version(),
    },
    closed,
  ),
  progress: Type.Object(
    {
      ...missionScope,
      status: Type.Union([Type.Literal('active'), Type.Literal('completed')]),
      startedAt: text(),
      completedAt: Type.Optional(text()),
      updatedAt: text(),
      version: version(),
    },
    closed,
  ),
  award: Type.Object(
    {
      deduplicationKey: text(),
      entries: Type.Array(
        Type.Object(
          {
            ...unitScope,
            scoreEntryId: text(),
            missionId: Type.Optional(text()),
            entryType: literals([
              'validation-award',
              'advanced-bonus',
              'hint-adjustment',
              'instructor-adjustment',
              'correction',
            ]),
            dimension: Type.Optional(
              literals([
                'requiredOutcome',
                'evidenceAndGrounding',
                'reliability',
                'explainability',
                'efficiency',
              ]),
            ),
            points: Type.Integer(),
            sourceId: text(),
            reasonCode: text(),
            createdAt: text(),
          },
          closed,
        ),
        { maxItems: 100 },
      ),
    },
    closed,
  ),
  validation: Type.Object(
    {
      schemaVersion: Type.Literal('1.0'),
      validationResultId: text(),
      validationRequestId: text(),
      validatorId: text(),
      validatorVersion: text(),
      outcome,
      rules: Type.Array(rule, { maxItems: 100 }),
      dimensionScores: Type.Object(
        {
          requiredOutcome: integer(),
          evidenceAndGrounding: integer(),
          reliability: integer(),
          explainability: integer(),
          efficiency: integer(),
        },
        closed,
      ),
      checksRun: integer(),
      trace: Type.Object(
        {
          startedAt: text(),
          completedAt: text(),
          durationMs: integer(),
          checksRun: integer(),
          attempts: version(),
        },
        closed,
      ),
    },
    closed,
  ),
  hint: Type.Object(
    {
      ...missionScope,
      hintUsageId: text(),
      missionVersion: text(),
      level: Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3)]),
      contentKey: text(),
      bonusAdjustmentPoints: Type.Integer(),
      idempotencyKey: text(),
      requestedAt: text(),
      deliveredAt: text(),
    },
    closed,
  ),
  submission: Type.Object(
    {
      ...missionScope,
      submissionId: text(),
      missionVersion: text(),
      submission: unknownRecord,
      observedEvidence: Type.Array(unknownRecord, { maxItems: 1000 }),
    },
    closed,
  ),
  feedback: MissionSubmissionFeedbackSchema,
  observation: SimulatorObservationSchema,
  recovery: Type.Object(
    {
      ...unitScope,
      missionId: Type.Union([
        Type.Literal('signal-in-the-storm'),
        Type.Literal('ground-truth'),
        Type.Literal('connected-city'),
        Type.Literal('specialist-network'),
        Type.Literal('restore-the-lighthouse'),
      ]),
      submissionId: text(),
      districtIds: Type.Array(
        Type.Union([
          Type.Literal('harbor'),
          Type.Literal('old-town'),
          Type.Literal('north-hills'),
          Type.Literal('east-bank'),
          Type.Literal('civic-center'),
        ]),
        { minItems: 1, maxItems: 5, uniqueItems: true },
      ),
    },
    closed,
  ),
  audit: Type.Object(
    {
      ...eventScope,
      commandId: text(),
      commandType: text(),
      actorId: text(),
      correlationId: text(),
      status: Type.Union([Type.Literal('accepted'), Type.Literal('rejected')]),
      recordedAt: text(),
    },
    closed,
  ),
  replay: Type.Object(
    {
      fingerprint: text(),
      sealed: Type.String({ minLength: 1, maxLength: 2_000_000 }),
    },
    closed,
  ),
  creation: Type.Object(
    { eventSessionId: text(), fingerprint: text() },
    closed,
  ),
  publication: Type.Object(
    { revision: version(), pending: Type.Boolean() },
    closed,
  ),
} as const;

export type DocumentKind = keyof typeof documentSchemas;
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };

export interface StateDocument {
  readonly id: string;
  readonly eventSessionId: string;
  readonly schemaVersion: '1.0';
  readonly kind: DocumentKind;
  readonly value: Json;
}

export interface VersionedDocument {
  readonly document: StateDocument;
  readonly etag: string;
}

export type DocumentWrite =
  | {
      readonly operation: 'create' | 'upsert';
      readonly document: StateDocument;
    }
  | {
      readonly operation: 'replace';
      readonly document: StateDocument;
      readonly etag: string;
    };

export interface DocumentFilter {
  readonly field: 'eventCodeLookup' | 'unitId' | 'missionId' | 'pending';
  readonly value: string | boolean;
}

export interface DocumentBackend {
  read(partition: string, id: string): Promise<VersionedDocument | undefined>;
  query(
    kind: DocumentKind,
    partition?: string,
    filters?: readonly DocumentFilter[],
  ): Promise<readonly VersionedDocument[]>;
  batch(partition: string, writes: readonly DocumentWrite[]): Promise<void>;
  check(): Promise<'up' | 'down'>;
  close(): void;
}
