import { v7 as uuidV7 } from 'uuid';

import { ValidationWorkerError, ValidatorExecutionError } from './errors.js';
import type { ValidatorRegistry } from './registry.js';
import type { ValidationResultRepository } from './repository.js';
import {
  validationDimensions,
  type ResolvedValidationContext,
  type ValidationContextResolver,
  type ValidationRequest,
  type ValidationResult,
  type ValidationRuleResult,
  type ValidatorOutput,
  type VersionedValidator,
} from './types.js';

export interface ValidationWorkerOptions {
  readonly clock?: () => Date;
  readonly contextResolver: ValidationContextResolver;
  readonly maximumAttempts?: number;
  readonly maximumRules?: number;
  readonly registry: ValidatorRegistry;
  readonly repository: ValidationResultRepository;
}

const deepFreeze = <T>(value: T): T => {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
};

const zeroScores = () => ({
  efficiency: 0,
  evidenceAndGrounding: 0,
  explainability: 0,
  reliability: 0,
  requiredOutcome: 0,
});

export class ValidationWorker {
  readonly #clock: () => Date;
  readonly #contextResolver: ValidationContextResolver;
  readonly #maximumAttempts: number;
  readonly #maximumRules: number;
  readonly #registry: ValidatorRegistry;
  readonly #repository: ValidationResultRepository;

  public constructor(options: ValidationWorkerOptions) {
    this.#clock = options.clock ?? (() => new Date());
    this.#contextResolver = options.contextResolver;
    this.#maximumAttempts = options.maximumAttempts ?? 2;
    this.#maximumRules = options.maximumRules ?? 100;
    this.#registry = options.registry;
    this.#repository = options.repository;
    if (
      !Number.isInteger(this.#maximumAttempts) ||
      this.#maximumAttempts < 1 ||
      !Number.isInteger(this.#maximumRules) ||
      this.#maximumRules < 1
    ) {
      throw new ValidationWorkerError('validation-request-invalid');
    }
  }

  public async run(request: ValidationRequest): Promise<ValidationResult> {
    this.#validateRequest(request);
    const existing = await this.#repository.get(request.validationRequestId);
    if (existing !== undefined) {
      return existing;
    }

    const validator = this.#registry.resolve(
      request.validatorId,
      request.validatorVersion,
    );
    const context = await this.#contextResolver.resolve(request);
    this.#validateScope(request, context);
    const immutableContext = deepFreeze(structuredClone(context));
    const started = this.#clock();
    let attempts = 0;
    let output: ValidatorOutput | undefined;

    while (attempts < this.#maximumAttempts) {
      attempts += 1;
      const remainingMs =
        new Date(request.deadlineAt).getTime() - this.#clock().getTime();
      if (remainingMs <= 0) {
        output = this.#platformOutput('retry', 'validation.deadline.exceeded');
        break;
      }
      try {
        output = await this.#execute(
          validator,
          immutableContext,
          request,
          remainingMs,
        );
        break;
      } catch (error: unknown) {
        if (
          error instanceof ValidatorExecutionError &&
          error.outcome === 'retry' &&
          attempts < this.#maximumAttempts
        ) {
          continue;
        }
        output = this.#platformOutput(
          error instanceof ValidatorExecutionError ? error.outcome : 'retry',
          error instanceof ValidatorExecutionError &&
            error.outcome === 'blocked'
            ? 'validation.platform.blocked'
            : 'validation.validator.unavailable',
        );
        break;
      }
    }

    const completed = this.#clock();
    const validatedOutput =
      output ??
      this.#platformOutput('retry', 'validation.validator.unavailable');
    this.#validateOutput(validatedOutput);
    const result: ValidationResult = {
      ...validatedOutput,
      schemaVersion: '1.0',
      trace: {
        attempts,
        checksRun: validatedOutput.checksRun,
        completedAt: completed.toISOString(),
        durationMs: Math.max(0, completed.getTime() - started.getTime()),
        startedAt: started.toISOString(),
      },
      validationRequestId: request.validationRequestId,
      validationResultId: uuidV7(),
      validatorId: request.validatorId,
      validatorVersion: request.validatorVersion,
    };
    return this.#repository.saveOnce(result);
  }

  async #execute(
    validator: VersionedValidator,
    context: ResolvedValidationContext,
    request: ValidationRequest,
    timeoutMs: number,
  ): Promise<ValidatorOutput> {
    const controller = new AbortController();
    let timeout: NodeJS.Timeout | undefined;
    const timedOut = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new ValidatorExecutionError('retry'));
      }, timeoutMs);
      timeout.unref();
    });
    try {
      return await Promise.race([
        validator.validate(context, request, controller.signal),
        timedOut,
      ]);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }

  #platformOutput(
    outcome: 'retry' | 'blocked',
    messageKey: string,
  ): ValidatorOutput {
    return {
      checksRun: 0,
      dimensionScores: zeroScores(),
      outcome,
      rules: [
        {
          messageKey,
          ruleId: 'platform-validation',
          severity: 'diagnostic',
          status: 'error',
        },
      ],
    };
  }

  #validateRequest(request: ValidationRequest): void {
    const requestedAt = new Date(request.requestedAt).getTime();
    const deadlineAt = new Date(request.deadlineAt).getTime();
    if (
      !Number.isFinite(requestedAt) ||
      !Number.isFinite(deadlineAt) ||
      deadlineAt <= requestedAt ||
      [
        request.validationRequestId,
        request.submissionId,
        request.eventSessionId,
        request.unitId,
        request.missionId,
        request.missionVersion,
        request.validatorId,
        request.validatorVersion,
        request.scoringPolicyVersion,
        request.scenarioSeed,
      ].some((value) => value.trim().length === 0)
    ) {
      throw new ValidationWorkerError('validation-request-invalid');
    }
  }

  #validateScope(
    request: ValidationRequest,
    context: ResolvedValidationContext,
  ): void {
    if (
      context.submissionId !== request.submissionId ||
      context.eventSessionId !== request.eventSessionId ||
      context.unitId !== request.unitId ||
      context.missionId !== request.missionId ||
      context.missionVersion !== request.missionVersion
    ) {
      throw new ValidationWorkerError('validation-scope-mismatch');
    }
  }

  #validateOutput(output: ValidatorOutput): void {
    if (
      !Number.isInteger(output.checksRun) ||
      output.checksRun < 0 ||
      output.rules.length > this.#maximumRules ||
      validationDimensions.some((dimension) => {
        const score = output.dimensionScores[dimension];
        return !Number.isInteger(score) || score < 0 || score > 10_000;
      }) ||
      output.rules.some((rule) => !this.#validRule(rule))
    ) {
      throw new ValidationWorkerError('validator-output-invalid');
    }
  }

  #validRule(rule: ValidationRuleResult): boolean {
    return (
      rule.ruleId.trim().length > 0 &&
      rule.ruleId.length <= 100 &&
      rule.messageKey.trim().length > 0 &&
      rule.messageKey.length <= 200 &&
      (rule.evidenceIds?.length ?? 0) <= 100 &&
      Object.keys(rule.messageArgs ?? {}).length <= 50
    );
  }
}
