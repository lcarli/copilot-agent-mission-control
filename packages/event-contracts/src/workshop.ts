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
    source: Type.Optional(Type.Literal('local-event')),
    recoverySource: Type.Optional(Type.Literal('scenario-baseline')),
    registeredUnitCount: Type.Optional(count()),
    activityWindowSeconds: Type.Optional(Type.Integer({ minimum: 1 })),
    updatedAt: Type.Optional(text()),
  },
  closed,
);

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

export const decodePublicPresentationProjection = (
  value: unknown,
): PublicPresentationProjection =>
  Value.Decode(PublicPresentationProjectionSchema, value);

export const decodeMissionSubmissionFeedback = (
  value: unknown,
): MissionSubmissionFeedback =>
  Value.Decode(MissionSubmissionFeedbackSchema, value);
