import { Value } from '@sinclair/typebox/value';

import { EVENT_SCHEMA_VERSION } from './common.js';
import {
  domainEventSchemas,
  isDomainEventType,
  type DomainEvent,
} from './events.js';

export type EventContractErrorCode =
  | 'invalid-envelope'
  | 'unsupported-schema-version'
  | 'unsupported-event-type'
  | 'invalid-event';

export interface EventContractIssue {
  readonly path: string;
  readonly message: string;
}

export interface EventContractError {
  readonly code: EventContractErrorCode;
  readonly issues: readonly EventContractIssue[];
}

export type EventValidationResult =
  | {
      readonly success: true;
      readonly value: DomainEvent;
    }
  | {
      readonly success: false;
      readonly error: EventContractError;
    };

export class EventContractValidationError extends Error {
  public readonly code: EventContractErrorCode;
  public readonly issues: readonly EventContractIssue[];

  public constructor(error: EventContractError) {
    super(error.code);
    this.name = 'EventContractValidationError';
    this.code = error.code;
    this.issues = error.issues;
  }
}

const failure = (
  code: EventContractErrorCode,
  path: string,
  message: string,
): EventValidationResult => ({
  success: false,
  error: {
    code,
    issues: [{ path, message }],
  },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateDomainEvent = (input: unknown): EventValidationResult => {
  if (!isRecord(input)) {
    return failure(
      'invalid-envelope',
      '',
      'Domain event must be a JSON object.',
    );
  }

  const schemaVersion = input.schemaVersion;
  if (typeof schemaVersion !== 'string') {
    return failure(
      'invalid-envelope',
      '/schemaVersion',
      'schemaVersion must be a string.',
    );
  }

  if (schemaVersion !== EVENT_SCHEMA_VERSION) {
    return failure(
      'unsupported-schema-version',
      '/schemaVersion',
      `Unsupported event schema version: ${schemaVersion}.`,
    );
  }

  const eventType = input.eventType;
  if (typeof eventType !== 'string') {
    return failure(
      'invalid-envelope',
      '/eventType',
      'eventType must be a string.',
    );
  }

  if (!isDomainEventType(eventType)) {
    return failure(
      'unsupported-event-type',
      '/eventType',
      `Unsupported event type: ${eventType}.`,
    );
  }

  const schema = domainEventSchemas[eventType];
  const issues = [...Value.Errors(schema, input)].map((error) => ({
    path: error.path,
    message: error.message,
  }));

  if (issues.length > 0) {
    return {
      success: false,
      error: {
        code: 'invalid-event',
        issues,
      },
    };
  }

  return {
    success: true,
    value: Value.Decode(schema, input),
  };
};

export const assertDomainEvent = (input: unknown): DomainEvent => {
  const result = validateDomainEvent(input);
  if (!result.success) {
    throw new EventContractValidationError(result.error);
  }

  return result.value;
};
