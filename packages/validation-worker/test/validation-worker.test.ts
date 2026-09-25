import { describe, expect, it, vi } from 'vitest';

import {
  InMemoryValidationResultRepository,
  InMemoryValidatorRegistry,
  ValidationWorker,
  ValidationWorkerError,
  ValidatorExecutionError,
  type ResolvedValidationContext,
  type ValidationRequest,
  type ValidatorOutput,
  type VersionedValidator,
} from '../src/index.js';

const request = (
  overrides: Partial<ValidationRequest> = {},
): ValidationRequest => ({
  deadlineAt: '2026-09-25T14:00:10Z',
  eventSessionId: 'event-1',
  missionId: 'ground-truth',
  missionVersion: '1.0.0',
  requestedAt: '2026-09-25T14:00:00Z',
  scenarioSeed: 'seed-1',
  schemaVersion: '1.0',
  scoringPolicyVersion: '1.0.0',
  submissionId: 'submission-1',
  unitId: 'unit-1',
  validationRequestId: 'request-1',
  validatorId: 'ground-truth-validator',
  validatorVersion: '1.0.0',
  ...overrides,
});

const context = (
  overrides: Partial<ResolvedValidationContext> = {},
): ResolvedValidationContext => ({
  eventSessionId: 'event-1',
  missionId: 'ground-truth',
  missionVersion: '1.0.0',
  observedEvidence: [{ evidenceId: 'evidence-1' }],
  submission: { answer: 42 },
  submissionId: 'submission-1',
  unitId: 'unit-1',
  ...overrides,
});

const successfulOutput = (): ValidatorOutput => ({
  checksRun: 2,
  dimensionScores: {
    efficiency: 500,
    evidenceAndGrounding: 1500,
    explainability: 1000,
    reliability: 1200,
    requiredOutcome: 4000,
  },
  outcome: 'passed',
  rules: [
    {
      evidenceIds: ['evidence-1'],
      messageKey: 'validation.required.passed',
      ruleId: 'required-outcome',
      severity: 'required',
      status: 'passed',
    },
  ],
});

const createValidator = (
  validate: VersionedValidator['validate'] = vi.fn(() =>
    Promise.resolve(successfulOutput()),
  ),
): VersionedValidator => ({
  id: 'ground-truth-validator',
  validate,
  version: '1.0.0',
});

const createWorker = (
  options: {
    validator?: VersionedValidator;
    resolvedContext?: ResolvedValidationContext;
    maximumAttempts?: number;
    clock?: () => Date;
  } = {},
) => {
  const repository = new InMemoryValidationResultRepository();
  const validator = options.validator ?? createValidator();
  const worker = new ValidationWorker({
    clock: options.clock ?? (() => new Date('2026-09-25T14:00:01Z')),
    contextResolver: {
      resolve: vi.fn(() =>
        Promise.resolve(options.resolvedContext ?? context()),
      ),
    },
    ...(options.maximumAttempts === undefined
      ? {}
      : { maximumAttempts: options.maximumAttempts }),
    registry: new InMemoryValidatorRegistry([validator]),
    repository,
  });
  return { repository, validator, worker };
};

describe('validation worker', () => {
  it('runs the exact validator version and returns a structured result', async () => {
    const validate = vi.fn(() => Promise.resolve(successfulOutput()));
    const { worker } = createWorker({ validator: createValidator(validate) });

    const result = await worker.run(request());

    expect(validate).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      outcome: 'passed',
      schemaVersion: '1.0',
      validationRequestId: 'request-1',
      validatorId: 'ground-truth-validator',
      validatorVersion: '1.0.0',
    });
    expect(result.trace).toMatchObject({
      attempts: 1,
      checksRun: 2,
      durationMs: 0,
    });
  });

  it('does not expose mutable server-resolved context to validators', async () => {
    const validate: VersionedValidator['validate'] = vi.fn(
      (resolved: ResolvedValidationContext) => {
        expect(Object.isFrozen(resolved)).toBe(true);
        expect(Object.isFrozen(resolved.submission)).toBe(true);
        expect(() => {
          (resolved.submission as { answer: number }).answer = 0;
        }).toThrow(TypeError);
        return Promise.resolve(successfulOutput());
      },
    );
    const { worker } = createWorker({ validator: createValidator(validate) });

    await worker.run(request());
  });

  it('rejects cross-unit or cross-mission resolved data', async () => {
    const { worker } = createWorker({
      resolvedContext: context({ unitId: 'unit-2' }),
    });

    await expect(worker.run(request())).rejects.toMatchObject({
      code: 'validation-scope-mismatch',
    });
  });

  it('returns retry on timeout and aborts the validator', async () => {
    vi.useFakeTimers();
    const validate: VersionedValidator['validate'] = vi.fn(
      (
        _context: ResolvedValidationContext,
        _request: ValidationRequest,
        signal: AbortSignal,
      ): Promise<ValidatorOutput> =>
        new Promise<ValidatorOutput>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            reject(new ValidatorExecutionError('retry'));
          });
        }),
    );
    const { worker } = createWorker({
      clock: () => new Date('2026-09-25T14:00:09.990Z'),
      maximumAttempts: 1,
      validator: createValidator(validate),
    });

    const resultPromise = worker.run(request());
    await vi.advanceTimersByTimeAsync(10);
    const result = await resultPromise;
    vi.useRealTimers();

    expect(result).toMatchObject({
      outcome: 'retry',
      rules: [
        { messageKey: 'validation.validator.unavailable', status: 'error' },
      ],
    });
  });

  it('retries explicit transient failures within the attempt limit', async () => {
    const validate = vi
      .fn<VersionedValidator['validate']>()
      .mockRejectedValueOnce(new ValidatorExecutionError('retry'))
      .mockResolvedValueOnce(successfulOutput());
    const { worker } = createWorker({ validator: createValidator(validate) });

    const result = await worker.run(request());

    expect(validate).toHaveBeenCalledTimes(2);
    expect(result.trace.attempts).toBe(2);
    expect(result.outcome).toBe('passed');
  });

  it('persists one result per validation request and replays it', async () => {
    const validate = vi.fn(() => Promise.resolve(successfulOutput()));
    const { worker } = createWorker({ validator: createValidator(validate) });

    const first = await worker.run(request());
    const replay = await worker.run(request());

    expect(validate).toHaveBeenCalledOnce();
    expect(replay).toEqual(first);
  });

  it('rejects unknown versions and unbounded or malformed output', async () => {
    const { worker } = createWorker();
    await expect(
      worker.run(request({ validatorVersion: '2.0.0' })),
    ).rejects.toBeInstanceOf(ValidationWorkerError);

    const invalid = createValidator(() =>
      Promise.resolve({
        ...successfulOutput(),
        dimensionScores: {
          ...successfulOutput().dimensionScores,
          requiredOutcome: 10_001,
        },
      }),
    );
    const invalidWorker = createWorker({ validator: invalid }).worker;
    await expect(invalidWorker.run(request())).rejects.toMatchObject({
      code: 'validator-output-invalid',
    });
  });

  it('maps blocked platform failures without participant penalties', async () => {
    const validator = createValidator(() =>
      Promise.reject(new ValidatorExecutionError('blocked')),
    );
    const { worker } = createWorker({ validator });

    const result = await worker.run(request());

    expect(result).toMatchObject({
      dimensionScores: {
        efficiency: 0,
        evidenceAndGrounding: 0,
        explainability: 0,
        reliability: 0,
        requiredOutcome: 0,
      },
      outcome: 'blocked',
      rules: [
        {
          messageKey: 'validation.platform.blocked',
          severity: 'diagnostic',
          status: 'error',
        },
      ],
    });
  });
});
