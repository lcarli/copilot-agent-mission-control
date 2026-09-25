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

export const validationScores = (
  values: Partial<Readonly<Record<ValidationDimension, number>>>,
): Readonly<Record<ValidationDimension, number>> => ({
  requiredOutcome: values.requiredOutcome ?? 0,
  evidenceAndGrounding: values.evidenceAndGrounding ?? 0,
  reliability: values.reliability ?? 0,
  explainability: values.explainability ?? 0,
  efficiency: values.efficiency ?? 0,
});

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
