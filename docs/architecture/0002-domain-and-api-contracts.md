# ADR 0002: Domain and API Contracts

- **Status:** Accepted
- **Date:** 2026-09-25
- **Decision owners:** Copilot Agent Mission Control maintainers
- **Roadmap:** TASK-002

## Context

The platform coordinates a live workshop in which participant units complete
missions, submit evidence, receive deterministic validation, earn scores, and
change a shared campaign state under instructor control. API, CLI, dashboard,
campaign, validator, and real-time implementations need one stable vocabulary
and compatible state model before executable schemas and application code are
created.

The word "event" is overloaded: it can mean the workshop instance or a message
recorded by the platform. This ADR uses **event session** for a running workshop
and **domain event** for an immutable fact emitted by the platform.

## Decision drivers

- Preserve event-session and unit isolation at every boundary.
- Make all mutations idempotent, attributable, and auditable.
- Evaluate observable behavior without prescribing participant implementation.
- Keep public contracts technology-neutral JSON.
- Support reconnect, replay, optimistic concurrency, and projection rebuilding.
- Keep validation and scoring deterministic and versioned.
- Separate localized presentation text from stable machine identifiers.
- Prevent public displays from receiving private unit details.

## Contract conventions

### Identifiers and time

- Server-created entity and event identifiers are UUID version 7 strings.
- Human-entered event codes are short, case-insensitive, and are never entity
  identifiers.
- Campaign, mission, rule, achievement, and message identifiers are stable
  lowercase kebab-case strings.
- All timestamps are RFC 3339 UTC strings with a `Z` suffix.
- Durations are integer milliseconds unless a field explicitly states another
  unit.
- Scores use integers, not floating-point values.
- Optional fields are omitted rather than set to `null`, unless `null` has a
  documented domain meaning.

Identifiers are opaque to clients. Clients must not infer creation time,
ownership, ordering, or entity type from an identifier.

### Versioning

- HTTP endpoints are rooted at `/api/v1`.
- JSON documents include `schemaVersion` when they can be persisted, replayed,
  exported, or exchanged independently.
- Domain events and commands use a `type` plus a type-specific payload.
- Campaign, mission, validator, scoring policy, and contract versions are
  recorded with every submission and validation result.
- Additive optional fields are backward compatible within a major API version.
- Removing fields, changing meaning, or tightening previously valid values
  requires a new major contract version.

### Localization

Machine contracts contain stable codes and message keys. They do not contain
English text as the source of truth.

Localized responses may include resolved display text for the request locale,
but persisted validation results, audit entries, and domain events store the
message key plus interpolation arguments. Supported locale values are `en`,
`fr`, and `pt-BR`; unsupported locales fall back to the event session's default
locale and report the resolved locale.

### Actor contract

Every mutation resolves an authenticated actor:

```json
{
  "actorType": "unit",
  "actorId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d401",
  "role": "participant"
}
```

`actorType` is one of `unit`, `instructor`, `service`, or `system`. Participant
tokens resolve to exactly one event session and one unit. Instructor tokens
resolve to an event session and an instructor role. Service and system actors
are internal identities and cannot be selected by API clients.

## Core domain model

### Event session

An `EventSession` is one scheduled or active delivery of a campaign.

Required properties:

| Property | Meaning |
|---|---|
| `eventSessionId` | Opaque server identifier |
| `campaignId` and `campaignVersion` | Immutable campaign selection after the lobby opens |
| `defaultLocale` and `supportedLocales` | Enabled language configuration |
| `status` | Current lifecycle state |
| `eventCodeHash` | Server-only verifier; the plain event code is never persisted |
| `scenarioSeed` | Stable seed used by deterministic simulators |
| `scoringPolicyVersion` | Policy applied to new validation results |
| `schedule` | Planned mission and event timing |
| `createdAt`, `updatedAt`, `version` | Audit and optimistic concurrency fields |

Lifecycle:

```text
draft -> lobby -> active -> closed -> archived
                  |   ^
                  v   |
                paused
```

Invariants:

- Registration is allowed only in `lobby` or `active` when registration is
  explicitly enabled.
- Participant mission mutations are rejected while the event session is
  `paused`, `closed`, or `archived`.
- Closing is irreversible through the normal API.
- Archiving changes retention and query behavior but not historical records.
- Only one campaign version and scenario seed apply to an event session.
- An event session has a monotonically increasing aggregate `version`.

### Unit

A `Unit` represents an individual, pair, or team participating together.

Required properties:

| Property | Meaning |
|---|---|
| `unitId` and `eventSessionId` | Identity and isolation boundary |
| `displayName` | Moderated event-visible name |
| `locale` | Unit-specific response locale |
| `status` | Participation state |
| `capabilities` | Optional preflight results, never secrets |
| `connectedAt`, `lastSeenAt` | Connectivity projection |
| `createdAt`, `updatedAt`, `version` | Audit and concurrency fields |

Status values are `registered`, `ready`, `active`, `disconnected`, `muted`,
`withdrawn`, and `completed`.

Invariants:

- A display name is unique within an event session after case folding.
- A unit can read its own detailed state and only public summaries of others.
- `muted` units may read state and diagnostics but cannot submit, request hints,
  or publish participant activity.
- `withdrawn` and `completed` are terminal participation states.
- Connectivity is a projection, not an authorization decision.
- No participant name, email address, source code, credential, or prompt is
  required by the unit contract.

### Mission definition and mission run

A `MissionDefinition` belongs to a versioned campaign pack and describes
objectives, prerequisites, tools, validator references, hints, scoring
configuration, and localized content keys. TASK-003 defines its executable
campaign schema.

A `MissionRun` is the state of one mission for one unit in one event session.

Required properties:

| Property | Meaning |
|---|---|
| `missionRunId` | Opaque attempt-group identifier |
| `eventSessionId`, `unitId`, `missionId` | Isolation and mission identity |
| `missionVersion` | Definition version used by the run |
| `status` | Unit-specific mission lifecycle |
| `attemptCount` | Accepted submission count |
| `hintLevelUsed` | Highest delivered progressive hint |
| `latestValidationResultId` | Most recent completed validation |
| `startedAt`, `completedAt`, `updatedAt`, `version` | Timing and concurrency |

Lifecycle:

```text
locked -> available -> active -> submitted -> completed
                         ^           |
                         |-----------|
                         |
                         +---------> blocked
```

An instructor can pause a mission globally without changing each unit's
`MissionRun` status. A `submitted` run returns to `active` after a `partial` or
`retry` result, becomes `completed` after `passed`, and becomes `blocked` after
a confirmed platform `blocked` result or instructor override.

Invariants:

- A unit has at most one nonterminal run for a mission.
- Prerequisites and instructor availability must both allow a run to start.
- A submission records the exact mission and validator versions.
- A completed run cannot accept another scored submission.
- A blocked run can be reopened only by an instructor command with a reason.

### Submission

A `Submission` is an immutable participant claim that a mission objective has
been completed.

```json
{
  "schemaVersion": "1.0",
  "submissionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d410",
  "eventSessionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d400",
  "unitId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d401",
  "missionId": "ground-truth",
  "missionVersion": "1.0.0",
  "attempt": 2,
  "output": {},
  "evidence": [
    {
      "evidenceId": "bulletin-17",
      "claimIds": ["claim-shelter-capacity"]
    }
  ],
  "toolInteractions": [
    {
      "toolId": "shelter-status",
      "operation": "get-shelter",
      "interactionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d420"
    }
  ],
  "handoffs": [],
  "submittedAt": "2026-09-25T14:00:00Z"
}
```

The maximum sizes and mission-specific `output` shape are defined by executable
schemas. Evidence references, tool interaction identifiers, and handoffs must
refer to server-observed records in the same event session and unit.

Submissions never contain participant source code, access tokens, complete
prompts, or raw third-party credentials.

## Domain event contract

Domain events are immutable facts used for audit, projection updates, replay,
and real-time delivery.

### Envelope

```json
{
  "schemaVersion": "1.0",
  "eventId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d430",
  "eventType": "mission.validation-completed",
  "occurredAt": "2026-09-25T14:00:01Z",
  "recordedAt": "2026-09-25T14:00:01Z",
  "eventSessionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d400",
  "unitId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d401",
  "missionId": "ground-truth",
  "actor": {
    "actorType": "service",
    "actorId": "validation-worker",
    "role": "validator"
  },
  "correlationId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d431",
  "causationId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d410",
  "idempotencyKey": "validation:submission-id:validator-version",
  "aggregate": {
    "type": "mission-run",
    "id": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d411",
    "version": 7
  },
  "visibility": "unit",
  "payload": {}
}
```

`visibility` is `private`, `unit`, `instructor`, or `public`. It is an upper
bound, not proof that the payload is safe to publish. Real-time gateways create
role-specific projections and never forward persisted envelopes blindly.

### Initial event catalog

| Event type | Emitted when |
|---|---|
| `event-session.created` | An instructor creates an event session |
| `event-session.lobby-opened` | Registration and lobby views open |
| `event-session.started` | The workshop becomes active |
| `event-session.paused` / `resumed` | Global participant mutations stop or resume |
| `event-session.closed` | New participant activity is permanently locked |
| `unit.registered` | A unit exchanges an event code for a unit identity |
| `unit.ready` | Preflight requirements pass or are overridden |
| `unit.connected` / `disconnected` | Connectivity projection changes |
| `unit.muted` / `unmuted` | Instructor changes mutation permission |
| `mission.opened` / `paused` / `resumed` / `closed` | Global mission availability changes |
| `mission.started` | A unit starts an available mission |
| `mission.submitted` | An idempotently accepted submission is stored |
| `mission.validation-started` | A validator accepts work |
| `mission.validation-completed` | A terminal validation result is stored |
| `mission.completed` | A unit passes the mission |
| `mission.blocked` | A platform issue or override blocks normal completion |
| `hint.requested` / `delivered` | A hint request is accepted and resolved |
| `score.changed` | A ledger entry changes a score projection |
| `achievement.awarded` | A versioned achievement rule succeeds |
| `incident-modifier.activated` / `deactivated` | Campaign state changes |
| `instructor-command.accepted` / `rejected` | An audited command is processed |

All event types have documented payload schemas before implementation emits
them. Consumers must ignore unknown additive fields and must not infer business
state from event arrival order across different aggregates.

### Ordering, deduplication, and replay

- Producers assign one monotonically increasing version per aggregate.
- The event store rejects duplicate `eventId` and aggregate versions.
- Mutation idempotency records are scoped by event session, actor, route, and
  idempotency key.
- Repeating a request with the same key and equivalent body returns the original
  status and response.
- Reusing a key with a different body returns `409 idempotency-key-reused`.
- Clients order events within an aggregate by aggregate version.
- Reconnect uses a server-issued opaque cursor, not timestamps.
- If a cursor is expired, the client retrieves a fresh state projection and
  resumes from the cursor returned with that projection.

## Validation contract

### Validation request

A validation request is internal and immutable:

```json
{
  "schemaVersion": "1.0",
  "validationRequestId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d440",
  "submissionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d410",
  "eventSessionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d400",
  "unitId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d401",
  "missionId": "ground-truth",
  "missionVersion": "1.0.0",
  "validatorId": "ground-truth-validator",
  "validatorVersion": "1.0.0",
  "scoringPolicyVersion": "1.0.0",
  "scenarioSeed": "opaque-seed-reference",
  "requestedAt": "2026-09-25T14:00:00Z",
  "deadlineAt": "2026-09-25T14:00:10Z"
}
```

The worker resolves the submission and server-observed evidence through
authorized repositories; the request does not duplicate unbounded payloads.

### Validation result

```json
{
  "schemaVersion": "1.0",
  "validationResultId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d441",
  "validationRequestId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d440",
  "outcome": "partial",
  "validatorId": "ground-truth-validator",
  "validatorVersion": "1.0.0",
  "rules": [
    {
      "ruleId": "evidence-supports-claim",
      "status": "failed",
      "severity": "required",
      "messageKey": "validation.evidence.unsupported",
      "messageArgs": {
        "claimId": "claim-shelter-capacity"
      },
      "evidenceIds": ["bulletin-17"]
    }
  ],
  "dimensionScores": {
    "requiredOutcome": 3000,
    "evidenceAndGrounding": 900,
    "reliability": 1100,
    "explainability": 800,
    "efficiency": 500
  },
  "trace": {
    "startedAt": "2026-09-25T14:00:00Z",
    "completedAt": "2026-09-25T14:00:01Z",
    "durationMs": 840,
    "checksRun": 12
  }
}
```

Outcomes:

- `passed`: every core requirement succeeds.
- `partial`: the request is valid and meaningful progress is demonstrated, but
  one or more required rules fail.
- `retry`: the submission cannot be assessed because it is malformed,
  unsupported, stale, or affected by a transient validator condition.
- `blocked`: a confirmed platform or infrastructure failure prevents fair
  assessment and causes no score penalty.

Rule status is `passed`, `failed`, `not-applicable`, or `error`. Rule severity is
`required`, `advanced`, or `diagnostic`. A validator error cannot be represented
as a participant rule failure.

Validation results are deterministic for the tuple of submission, observed
interaction records, campaign version, validator version, scoring policy
version, and scenario seed. Retrying that tuple returns the same result or an
explicit versioned correction.

## Scoring contract

### Policy

A `ScoringPolicy` is immutable and versioned. Dimension weights use basis
points and must total `10000`.

Default dimensions:

| Dimension | Default weight |
|---|---:|
| `requiredOutcome` | 4000 |
| `evidenceAndGrounding` | 2000 |
| `reliability` | 1500 |
| `explainability` | 1500 |
| `efficiency` | 1000 |

Each mission defines a maximum base score. Validators produce normalized
dimension scores from `0` through the corresponding weight. The scoring engine
calculates integer mission points from those normalized scores and the mission
maximum.

Core completion points cannot be reduced by hints. Hint use may reduce only
explicit advanced or efficiency bonus points. Speed never contributes points
and is used only as the final tie-breaker between otherwise equal results.

### Ledger

Scores are derived from an append-only `ScoreLedgerEntry`:

```json
{
  "scoreEntryId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d450",
  "eventSessionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d400",
  "unitId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d401",
  "missionId": "ground-truth",
  "entryType": "validation-award",
  "points": 730,
  "dimension": "evidenceAndGrounding",
  "sourceId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d441",
  "reasonCode": "validation-result",
  "createdAt": "2026-09-25T14:00:01Z"
}
```

Entry types are `validation-award`, `advanced-bonus`, `hint-adjustment`,
`instructor-adjustment`, and `correction`. Existing entries are never updated or
deleted; corrections append compensating entries.

Invariants:

- One validation result can award points once.
- A `retry` or `blocked` result awards no points and applies no penalty.
- Revalidation cannot reduce already earned core points unless an instructor
  issues an audited correction for a platform scoring defect.
- Score projections expose base, bonus, adjustment, total, per-mission, and
  per-dimension values.
- Instructor adjustments require a reason and appear in exports.
- Rankings exclude muted or withdrawn units only when the event's versioned
  scoring policy explicitly says so.
- Collective progress is a separate projection and never changes unit scores.

### Tie-breakers

Ties are resolved in this order:

1. Higher required-outcome score.
2. Higher evidence-and-grounding score.
3. Higher reliability score.
4. Fewer level-3 hints.
5. Earlier final passing validation time.
6. Stable lexical ordering of `unitId` for deterministic display only.

Recognition categories are evaluated by separate versioned rules and need not
match the ranking order.

## Instructor command contract

Instructor commands express intent and are validated against current state.
Accepted commands emit domain events; rejected commands are audited but do not
change aggregates.

### Envelope

```json
{
  "schemaVersion": "1.0",
  "commandId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d460",
  "commandType": "mission.pause",
  "eventSessionId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d400",
  "target": {
    "missionId": "connected-city"
  },
  "expectedVersion": 12,
  "reason": "Simulator maintenance",
  "requestedAt": "2026-09-25T14:05:00Z",
  "payload": {}
}
```

The authenticated actor, correlation ID, and idempotency key come from the HTTP
request context and are stored with the command audit record.

### Initial command catalog

| Command type | Required target or payload |
|---|---|
| `event-session.open-lobby` | Registration settings |
| `event-session.start` | Optional effective time |
| `event-session.pause` / `resume` | Reason for pause |
| `event-session.close` | Confirmation phrase and reason |
| `mission.open` / `pause` / `resume` / `close` | Mission ID |
| `hint.publish` | Mission ID, hint level, all units or one unit |
| `incident-modifier.activate` / `deactivate` | Modifier ID and campaign-defined parameters |
| `scoring.pause` / `resume` | Reason |
| `score.adjust` | Unit, mission when applicable, signed points, reason code, explanation |
| `mission.override` | Unit, mission, override outcome, reason |
| `unit.mute` / `unmute` | Unit and reason |
| `unit.mark-ready` | Unit and waived preflight checks |
| `presentation.set-locale` | Supported locale |
| `demonstration.enable` / `disable` | Public projection options |

High-impact commands that close an event, change scores, override completion, or
mute a unit require a nonempty reason. Event closure additionally requires an
exact server-provided confirmation phrase. Commands use optimistic concurrency;
a stale `expectedVersion` returns a conflict with the current version.

## HTTP API contract

### Request rules

- JSON endpoints use `application/json`.
- Every mutation requires `Idempotency-Key` and accepts `X-Correlation-ID`.
- The server returns `X-Correlation-ID` on every response.
- Updates to existing aggregates require `If-Match` with the current ETag or an
  equivalent `expectedVersion` in a command.
- Collection queries use opaque cursor pagination with `limit` capped by the
  server.
- Unknown JSON properties are rejected on commands and mutations.
- Payload and rate limits are enforced before domain processing.

### Initial endpoint surface

| Audience | Method and route | Purpose |
|---|---|---|
| Public | `GET /api/v1/health/live` | Process liveness |
| Public | `GET /api/v1/health/ready` | Required dependency readiness |
| Public | `GET /api/v1/health/event` | Redacted event delivery readiness |
| Registration | `POST /api/v1/registrations` | Exchange event code and unit details for short-lived credentials |
| Unit | `POST /api/v1/auth/refresh` | Rotate an eligible unit token |
| Unit | `GET /api/v1/event-session` | Read the token-scoped event projection |
| Unit | `GET /api/v1/unit` | Read the token-scoped unit projection |
| Unit | `POST /api/v1/unit/readiness` | Record preflight capabilities |
| Unit | `GET /api/v1/missions` | List token-scoped mission availability and progress |
| Unit | `POST /api/v1/missions/{missionId}/start` | Start an available mission |
| Unit | `POST /api/v1/missions/{missionId}/submissions` | Create an immutable submission |
| Unit | `GET /api/v1/submissions/{submissionId}` | Read submission and validation status |
| Unit | `POST /api/v1/missions/{missionId}/hints` | Request the next allowed hint |
| Unit | `GET /api/v1/activity` | Replay token-scoped activity from a cursor |
| Instructor | `POST /api/v1/event-sessions` | Create a draft event session |
| Instructor | `GET /api/v1/event-sessions/{eventSessionId}` | Read the full instructor projection |
| Instructor | `GET /api/v1/event-sessions/{eventSessionId}/units` | List unit progress and connectivity |
| Instructor | `GET /api/v1/event-sessions/{eventSessionId}/scores` | Read score and recognition projections |
| Instructor | `POST /api/v1/event-sessions/{eventSessionId}/commands` | Submit a discriminated instructor command |
| Instructor | `GET /api/v1/event-sessions/{eventSessionId}/audit` | Read paginated command and operational audit entries |
| Instructor | `POST /api/v1/event-sessions/{eventSessionId}/exports` | Request a versioned results export |
| Public display | `GET /api/v1/public/event-session` | Read redacted presentation state |
| Public display | `GET /api/v1/public/activity` | Replay redacted public activity |

The token scope supplies unit and event-session identifiers for participant
routes. Clients cannot select another unit by changing a path or request body.

Creation returns `201 Created` with a `Location` header. Accepted asynchronous
validation and export requests return `202 Accepted` with a status resource.
Successful idempotent replay returns the original status code and body.

### Problem details

Errors use RFC 9457 Problem Details with stable extension members:

```json
{
  "type": "https://mission-control.example/problems/mission-not-available",
  "title": "Mission is not available",
  "status": 409,
  "code": "mission-not-available",
  "messageKey": "errors.mission.notAvailable",
  "messageArgs": {
    "missionId": "connected-city"
  },
  "correlationId": "018f6f4e-7e8f-7b6d-9b3b-9f690c46d470",
  "errors": []
}
```

`title` is a resolved localized summary for humans. Clients branch on `code`,
never localized text. Validation errors use `422` and include bounded field
entries. Authentication failures return `401`; authorization and isolation
failures return `403` without confirming whether another unit's resource
exists. Missing token-scoped resources return `404`.

Expected conflict codes include:

- `aggregate-version-conflict`
- `idempotency-key-reused`
- `event-session-not-active`
- `mission-not-available`
- `mission-already-completed`
- `unit-muted`
- `registration-closed`
- `submission-already-processing`

Unhandled failures return a generic `500 internal-error` problem and log the
correlation ID. Responses never expose stack traces, secrets, tokens, storage
keys, or internal Azure resource identifiers.

## Real-time contract

Real-time channels deliver projections derived from domain events:

- `unit:{unitId}` contains private mission, validation, hint, and score updates.
- `instructor:{eventSessionId}` contains full operational and unit summaries.
- `public:{eventSessionId}` contains only redacted presentation updates.

Every message includes `messageId`, `schemaVersion`, `type`, `occurredAt`,
`cursor`, and `payload`. A client acknowledges progress by retaining the latest
cursor locally. Real-time delivery is at least once; clients deduplicate by
`messageId` and replace local projections by version.

Tokens authorize channel membership server-side. Clients cannot provide an
arbitrary unit or event-session identifier during negotiation. Public messages
exclude unit detail unless an instructor explicitly enables a moderated display
name and public achievement.

SignalR disconnection does not block mutation APIs. Reconnect first attempts
cursor replay and then falls back to a full projection refresh.

## Authorization and isolation invariants

- Every repository query for participant data is scoped by the authenticated
  event session and unit before applying caller-supplied identifiers.
- Instructor access is scoped to authorized event sessions.
- Service identities receive only the repositories and operations required by
  their role.
- Public projections are constructed from an allowlist; they are not full
  objects with fields removed.
- Audit records include actor, action, target, reason, correlation, time, and
  outcome.
- Tokens, event codes, credentials, prompts, source code, and unnecessary
  personal data never appear in domain events, telemetry, exports, or public
  projections.
- Cross-unit access attempts produce security telemetry without leaking the
  target's existence.

## Consequences

### Positive

- API, event, CLI, dashboard, and campaign implementations share one vocabulary
  and lifecycle model.
- Append-only events and score entries make state reconstruction, correction,
  export, and audit behavior explicit.
- Idempotency and optimistic concurrency are part of the contract rather than
  implementation details.
- Validation remains behavior-based and localization-independent.
- Role-specific projections reduce accidental public or cross-unit disclosure.
- Executable JSON Schemas can be derived without coupling domain definitions to
  Fastify, React, or Azure SDK types.

### Trade-offs

- Persisted versions, idempotency records, cursors, and audit records add
  storage and implementation complexity.
- At-least-once delivery requires every consumer to deduplicate messages.
- A generic instructor command endpoint requires robust discriminated-union
  schemas and command-specific authorization.
- Append-only score correction is less convenient than updating totals in
  place, but preserves the event's history.
- The strict separation between machine codes and localized text requires
  message catalog discipline across all applications.

## Alternatives considered

### CRUD-only resources without domain events

CRUD endpoints are simpler initially but do not satisfy audit, replay,
reconnect, projection rebuilding, and real-time traceability requirements.

### Client-calculated scores

Client scoring would reduce server work but cannot protect consistency,
idempotency, or fair competition. All authoritative scoring remains server-side.

### Free-form instructor actions

Arbitrary action names or payloads would make authorization and audit behavior
unreliable. Instructor commands are a closed, versioned discriminated union.

### Exactly-once real-time delivery

Exactly-once delivery across HTTP, storage, and SignalR would add coordination
cost without eliminating client recovery needs. The contract uses durable
idempotency plus at-least-once delivery and deterministic deduplication.

## Follow-up work

- TASK-003 defines machine-validatable campaign, mission, asset, and
  localization schemas.
- TASK-101 implements shared TypeScript and JSON Schema event contracts.
- TASK-104 defines token issuance, rotation, claims, and instructor identity.
- TASK-300 maps this contract to Fastify routes and middleware.
- TASK-303 implements the score ledger and projections.
- TASK-304 implements validator execution, timeouts, retries, and isolation.

Any implementation change that alters the meaning, lifecycle, required fields,
or security boundary in this ADR requires a superseding ADR and compatible
contract version.
