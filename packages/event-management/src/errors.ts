export type EventManagementErrorCode =
  | 'event-not-found'
  | 'event-version-conflict'
  | 'event-state-invalid'
  | 'registration-closed'
  | 'event-code-invalid'
  | 'display-name-invalid'
  | 'display-name-unavailable'
  | 'locale-not-supported'
  | 'unit-not-found'
  | 'unit-reconnect-denied'
  | 'unit-token-invalid'
  | 'unit-scope-denied';

export class EventManagementError extends Error {
  public readonly code: EventManagementErrorCode;

  public constructor(code: EventManagementErrorCode, cause?: unknown) {
    super(code, cause ? { cause } : undefined);
    this.name = 'EventManagementError';
    this.code = code;
  }
}
