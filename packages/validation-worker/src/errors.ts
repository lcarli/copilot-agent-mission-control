export type ValidationWorkerErrorCode =
  | 'validation-request-invalid'
  | 'validation-scope-mismatch'
  | 'validator-not-found'
  | 'validator-output-invalid';

export class ValidationWorkerError extends Error {
  public readonly code: ValidationWorkerErrorCode;

  public constructor(code: ValidationWorkerErrorCode) {
    super(code);
    this.name = 'ValidationWorkerError';
    this.code = code;
  }
}

export class ValidatorExecutionError extends Error {
  public readonly outcome: 'retry' | 'blocked';

  public constructor(outcome: 'retry' | 'blocked') {
    super(`validator-${outcome}`);
    this.name = 'ValidatorExecutionError';
    this.outcome = outcome;
  }
}
