export type AuthenticationErrorCode =
  | 'event-code-invalid'
  | 'token-configuration-invalid'
  | 'token-invalid'
  | 'token-scope-invalid'
  | 'token-version-revoked'
  | 'instructor-inactive'
  | 'instructor-role-required'
  | 'instructor-scope-denied'
  | 'instructor-action-denied';

export class AuthenticationError extends Error {
  public readonly code: AuthenticationErrorCode;

  public constructor(code: AuthenticationErrorCode, cause?: unknown) {
    super(code, cause ? { cause } : undefined);
    this.name = 'AuthenticationError';
    this.code = code;
  }
}
