export type ScoringErrorCode =
  | 'scoring-policy-invalid'
  | 'validation-score-invalid'
  | 'score-adjustment-invalid'
  | 'score-would-be-negative';

export class ScoringError extends Error {
  public readonly code: ScoringErrorCode;

  public constructor(code: ScoringErrorCode) {
    super(code);
    this.name = 'ScoringError';
    this.code = code;
  }
}
