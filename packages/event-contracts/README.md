# Event Contracts

Typed domain event envelopes and runtime JSON Schema validation for the
contracts defined by ADR 0002.

## Usage

```ts
import {
  assertDomainEvent,
  domainEventSchemas,
  validateDomainEvent,
} from '@mission-control/event-contracts';

const result = validateDomainEvent(message);
if (!result.success) {
  console.error(result.error.code, result.error.issues);
}

const event = assertDomainEvent(message);
```

The package exports:

- TypeBox schemas for every event in the initial domain event catalog.
- Static TypeScript types derived from those schemas.
- `validateDomainEvent` for non-throwing boundary validation.
- `assertDomainEvent` for validation that throws
  `EventContractValidationError`.
- Stable schema-version and event-type guards.

`pnpm build` also writes standalone JSON Schema artifacts to
`dist/schemas/v1/`. Unknown properties are rejected at the envelope and payload
boundaries.
