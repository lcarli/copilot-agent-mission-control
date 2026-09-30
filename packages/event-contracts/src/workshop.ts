import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';

const text = () => Type.String({ minLength: 1, maxLength: 200 });
const percent = () => Type.Number({ minimum: 0, maximum: 100 });
const count = () => Type.Integer({ minimum: 0 });
const closed = { additionalProperties: false } as const;

export const PublicMissionSummarySchema = Type.Object(
  {
    title: text(),
    phase: text(),
    progressPercent: percent(),
  },
  closed,
);

export const PublicDistrictSummarySchema = Type.Object(
  {
    districtId: text(),
    displayName: text(),
    recoveryPercent: percent(),
    baselinePercent: Type.Optional(percent()),
    contributionCount: Type.Optional(count()),
    status: Type.Union([
      Type.Literal('critical'),
      Type.Literal('stabilizing'),
      Type.Literal('recovered'),
    ]),
  },
  closed,
);

export const PublicRankingSummarySchema = Type.Object(
  {
    rank: Type.Integer({ minimum: 1 }),
    moderatedUnitName: text(),
    score: count(),
  },
  closed,
);

export const PublicRecognitionSummarySchema = Type.Object(
  {
    recognitionId: text(),
    moderatedUnitName: text(),
    title: text(),
  },
  closed,
);

export const PublicRecoverySummarySchema = Type.Object(
  {
    policyVersion: text(),
    baselinePercent: percent(),
    eligibleUnitCount: count(),
    contributionCount: count(),
    finaleThreshold: percent(),
    finaleUnlocked: Type.Boolean(),
  },
  closed,
);

export const PublicPresentationProjectionSchema = Type.Object(
  {
    eventName: text(),
    activeMission: PublicMissionSummarySchema,
    collectiveRecoveryPercent: percent(),
    connectedUnitCount: count(),
    districts: Type.Array(PublicDistrictSummarySchema, { maxItems: 100 }),
    rankings: Type.Array(PublicRankingSummarySchema, { maxItems: 100 }),
    recognitions: Type.Array(PublicRecognitionSummarySchema, { maxItems: 100 }),
    schemaVersion: Type.Optional(Type.Literal('1.0')),
    eventSessionId: Type.Optional(text()),
    source: Type.Optional(
      Type.Union([Type.Literal('local-event'), Type.Literal('hosted-event')]),
    ),
    recoverySource: Type.Optional(
      Type.Union([
        Type.Literal('scenario-baseline'),
        Type.Literal('validated-decisions'),
      ]),
    ),
    recovery: Type.Optional(PublicRecoverySummarySchema),
    registeredUnitCount: Type.Optional(count()),
    activityWindowSeconds: Type.Optional(Type.Integer({ minimum: 1 })),
    updatedAt: Type.Optional(text()),
    revision: Type.Optional(count()),
  },
  closed,
);

const uuidPattern =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const WorkshopIdentitySchema = Type.Object(
  {
    tenantId: Type.String({ pattern: `^${uuidPattern}$` }),
    clientId: Type.String({ pattern: `^${uuidPattern}$` }),
    scope: Type.String({ pattern: `^api://${uuidPattern}/Workshop\\.Access$` }),
    redirectUri: Type.String({ minLength: 1, maxLength: 1000 }),
  },
  closed,
);

export type WorkshopIdentity = Static<typeof WorkshopIdentitySchema>;
export const decodeWorkshopIdentity = (value: unknown): WorkshopIdentity =>
  Value.Decode(WorkshopIdentitySchema, value);

const RuleSchema = Type.Object(
  {
    ruleId: text(),
    status: Type.Union([
      Type.Literal('passed'),
      Type.Literal('failed'),
      Type.Literal('not-applicable'),
      Type.Literal('error'),
    ]),
    severity: Type.Union([
      Type.Literal('required'),
      Type.Literal('advanced'),
      Type.Literal('diagnostic'),
    ]),
    messageKey: text(),
  },
  closed,
);

export const MissionRecoveryFeedbackSchema = Type.Object(
  {
    policyVersion: text(),
    status: Type.Union([
      Type.Literal('applied'),
      Type.Literal('unchanged'),
      Type.Literal('not-applied'),
      Type.Literal('unattributed'),
    ]),
    districtIds: Type.Array(text(), { maxItems: 100, uniqueItems: true }),
  },
  closed,
);

export const MissionSubmissionFeedbackSchema = Type.Object(
  {
    schemaVersion: Type.Literal('1.0'),
    submissionId: text(),
    missionId: text(),
    status: Type.Literal('evaluated'),
    outcome: Type.Union([
      Type.Literal('passed'),
      Type.Literal('partial'),
      Type.Literal('retry'),
      Type.Literal('blocked'),
    ]),
    rules: Type.Array(RuleSchema, { maxItems: 100 }),
    score: Type.Object(
      {
        missionPoints: count(),
        totalPoints: count(),
        awardedPoints: count(),
      },
      closed,
    ),
    recovery: Type.Optional(MissionRecoveryFeedbackSchema),
    evaluatedAt: text(),
  },
  closed,
);

export type PublicMissionSummary = Static<typeof PublicMissionSummarySchema>;
export type PublicDistrictSummary = Static<typeof PublicDistrictSummarySchema>;
export type PublicRankingSummary = Static<typeof PublicRankingSummarySchema>;
export type PublicRecognitionSummary = Static<
  typeof PublicRecognitionSummarySchema
>;
export type PublicPresentationProjection = Static<
  typeof PublicPresentationProjectionSchema
>;
export type MissionSubmissionFeedback = Static<
  typeof MissionSubmissionFeedbackSchema
>;
export type PublicRecoverySummary = Static<typeof PublicRecoverySummarySchema>;
export type MissionRecoveryFeedback = Static<
  typeof MissionRecoveryFeedbackSchema
>;

export const decodePublicPresentationProjection = (
  value: unknown,
): PublicPresentationProjection =>
  Value.Decode(PublicPresentationProjectionSchema, value);

export const decodeMissionSubmissionFeedback = (
  value: unknown,
): MissionSubmissionFeedback =>
  Value.Decode(MissionSubmissionFeedbackSchema, value);
