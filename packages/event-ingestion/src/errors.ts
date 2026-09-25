import type { EventContractIssue } from '@mission-control/event-contracts';

export type EventIngestionErrorCode =
  | 'event-invalid'
  | 'event-type-not-allowed'
  | 'event-scope-denied'
  | 'event-session-not-active'
  | 'unit-muted'
  | 'unit-not-active'
  | 'duplicate-event-id'
  | 'aggregate-version-conflict'
  | 'idempotency-key-reused'
  | 'event-publication-failed';

export class EventIngestionError extends Error {
  public readonly code: EventIngestionErrorCode;
  public readonly issues: readonly EventContractIssue[];

  public constructor(
    code: EventIngestionErrorCode,
    options: {
      readonly cause?: unknown;
      readonly issues?: readonly EventContractIssue[];
    } = {},
  ) {
    super(code, options.cause ? { cause: options.cause } : undefined);
    this.name = 'EventIngestionError';
    this.code = code;
    this.issues = options.issues ?? [];
  }
}
