export const validationDimensions = [
  'requiredOutcome',
  'evidenceAndGrounding',
  'reliability',
  'explainability',
  'efficiency',
] as const;

export type ValidationDimension = (typeof validationDimensions)[number];
export type ValidationOutcome = 'passed' | 'partial' | 'retry' | 'blocked';
export type ValidationRuleStatus =
  'passed' | 'failed' | 'not-applicable' | 'error';
export type ValidationRuleSeverity = 'required' | 'advanced' | 'diagnostic';

export interface ValidationRequest {
  readonly schemaVersion: '1.0';
  readonly validationRequestId: string;
  readonly submissionId: string;
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId: string;
  readonly missionVersion: string;
  readonly validatorId: string;
  readonly validatorVersion: string;
  readonly scoringPolicyVersion: string;
  readonly scenarioSeed: string;
  readonly requestedAt: string;
  readonly deadlineAt: string;
}

export interface ResolvedValidationContext {
  readonly submissionId: string;
  readonly eventSessionId: string;
  readonly unitId: string;
  readonly missionId: string;
  readonly missionVersion: string;
  readonly submission: Readonly<Record<string, unknown>>;
  readonly observedEvidence: readonly Readonly<Record<string, unknown>>[];
}

export interface ValidationRuleResult {
  readonly ruleId: string;
  readonly status: ValidationRuleStatus;
  readonly severity: ValidationRuleSeverity;
  readonly messageKey: string;
  readonly messageArgs?: Readonly<Record<string, string | number | boolean>>;
  readonly evidenceIds?: readonly string[];
}

export interface ValidatorOutput {
  readonly outcome: ValidationOutcome;
  readonly rules: readonly ValidationRuleResult[];
  readonly dimensionScores: Readonly<Record<ValidationDimension, number>>;
  readonly checksRun: number;
}

export interface ValidationResult extends ValidatorOutput {
  readonly schemaVersion: '1.0';
  readonly validationResultId: string;
  readonly validationRequestId: string;
  readonly validatorId: string;
  readonly validatorVersion: string;
  readonly trace: {
    readonly startedAt: string;
    readonly completedAt: string;
    readonly durationMs: number;
    readonly checksRun: number;
    readonly attempts: number;
  };
}

export interface VersionedValidator {
  readonly id: string;
  readonly version: string;
  validate(
    context: ResolvedValidationContext,
    request: ValidationRequest,
    signal: AbortSignal,
  ): Promise<ValidatorOutput>;
}

export interface ValidationContextResolver {
  resolve(request: ValidationRequest): Promise<ResolvedValidationContext>;
}
