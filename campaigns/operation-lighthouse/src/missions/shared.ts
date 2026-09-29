import type {
  ValidationDimension,
  ValidationRuleResult,
  ValidatorOutput,
} from '@mission-control/validation-worker';
import type { SupportedLocale } from '@mission-control/localization';

export interface LocalizedMissionContent {
  readonly locale: SupportedLocale;
  readonly title: string;
  readonly briefing: string;
  readonly coreObjectives: readonly string[];
  readonly advancedObjectives: readonly string[];
  readonly hints: readonly string[];
}

export interface MissionContent {
  readonly missionId: string;
  readonly version: string;
  readonly validatorId: string;
  readonly validatorVersion: string;
  readonly content: Readonly<Record<SupportedLocale, LocalizedMissionContent>>;
}

export const lighthouseScoreWeights = {
  requiredOutcome: 4000,
  evidenceAndGrounding: 2000,
  reliability: 1500,
  explainability: 1500,
  efficiency: 1000,
} as const satisfies Readonly<Record<ValidationDimension, number>>;

export const requiredRulePercentage = (
  rules: readonly ValidationRuleResult[],
): number => {
  const required = rules.filter(({ severity }) => severity === 'required');
  if (required.length === 0) {
    throw new RangeError('A mission must define at least one required rule.');
  }
  return (
    (required.filter(({ status }) => status === 'passed').length * 100) /
    required.length
  );
};

export const validationScores = (
  percentages: Partial<Readonly<Record<ValidationDimension, number>>>,
): Readonly<Record<ValidationDimension, number>> => {
  const weighted = (dimension: ValidationDimension): number => {
    const percentage = percentages[dimension] ?? 0;
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new RangeError(`Invalid percentage for ${dimension}.`);
    }
    return Math.floor((percentage * lighthouseScoreWeights[dimension]) / 100);
  };
  return {
    requiredOutcome: weighted('requiredOutcome'),
    evidenceAndGrounding: weighted('evidenceAndGrounding'),
    reliability: weighted('reliability'),
    explainability: weighted('explainability'),
    efficiency: weighted('efficiency'),
  };
};

export const validatorOutput = (
  rules: readonly ValidationRuleResult[],
  dimensionScores: Readonly<Record<ValidationDimension, number>>,
): ValidatorOutput => {
  const required = rules.filter(({ severity }) => severity === 'required');
  const passedRequired = required.filter(
    ({ status }) => status === 'passed',
  ).length;
  const outcome = required.some(({ status }) => status === 'error')
    ? 'blocked'
    : passedRequired === required.length
      ? 'passed'
      : passedRequired === 0
        ? 'retry'
        : 'partial';
  return {
    outcome,
    rules,
    dimensionScores,
    checksRun: rules.length,
  };
};

export const isRecord = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
