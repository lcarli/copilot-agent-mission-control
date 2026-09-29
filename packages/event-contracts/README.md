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
- Allowlisted public-presentation and participant-feedback schemas, with
  `decodePublicPresentationProjection` and `decodeMissionSubmissionFeedback`
  for HTTP response validation. Unknown fields are rejected. Local projections
  distinguish scenario-baseline recovery from the pedagogical
  `validated-decisions` source. Optional recovery metadata identifies the
  policy version, eligible units, contributions, district baselines and current
  finale readiness. Feedback reports whether a decision contribution was
  applied, unchanged, not applied or unattributed; it does not claim execution
  of simulator actions. The recent-activity window is not a persistent socket.
- Simulator catalog, invocation and observation schemas and decoders.
  Observations include explicit success/failure and server-assigned
  event/unit/mission scope. Invocation requests cannot supply that scope.

`pnpm build` also writes standalone JSON Schema artifacts to
`dist/schemas/v1/`. Unknown properties are rejected at the envelope and payload
boundaries.
