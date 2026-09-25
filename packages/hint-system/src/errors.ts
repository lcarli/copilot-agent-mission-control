export type HintSystemErrorCode =
  | 'hint-request-invalid'
  | 'hint-policy-invalid'
  | 'hint-event-not-open'
  | 'hint-unit-not-eligible'
  | 'hint-mission-not-active'
  | 'hint-scope-mismatch'
  | 'hint-levels-exhausted';

export class HintSystemError extends Error {
  public readonly code: HintSystemErrorCode;

  public constructor(code: HintSystemErrorCode) {
    super(code);
    this.name = 'HintSystemError';
    this.code = code;
  }
}
