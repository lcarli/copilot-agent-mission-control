# Hosted workshop preparation

This profile prepares one API replica using the accepted Cosmos DB `state`
container and Azure SignalR Serverless. No Azure resources have been provisioned
or deployed by this preparation pass. Local rehearsal remains a separate,
loopback-only, memory-backed mode.

**Current boundary:** durable repositories and the shared runtime are
implemented; hosted identity, real-time delivery and executable configuration
are the next delivery. The normal API does not yet advertise workshop readiness.
The file transport used by offline tests is not a production storage option.

## Durable transaction boundary

Each event uses its `eventSessionId` as the Cosmos logical partition. Event
metadata, units, mission lifecycle/progress, submissions, validation outcomes,
score-award records, hints, simulator receipts, recovery decisions, audit entries
and idempotency replies are separate versioned documents. An event is not
serialized into one ever-growing snapshot item.

All business writes run through `DurableWorkshopStore.mutate`. Repositories
stage writes in an asynchronous request context; they cannot write outside a
transaction or cross into another event's partition. One Cosmos
`container.items.batch` conditionally advances the event head ETag and commits
the staged state, encrypted replay response and pending publication together.
Bulk operations are not used for this atomic boundary.

A failed business operation discards partial changes, retaining only its
rejection audit and replayable 4xx outcome. Storage failures and concurrency
conflicts return 503 with `Retry-After`; retry the **same key and body**. An
unknown commit acknowledgment is not proof that nothing committed: replay
resolves the durable result without repeating scores or simulator calls.

Concurrent duplicate event creation first allocates an opaque event identifier
in the `workshop-directory` partition with a conditional create. This small
routing record is not an accepted event. The subsequent event-partition batch
is the business commit. A restart can finish the same allocation, and an
overlapping revision cannot allocate a second event for that key. Creation
scope includes the verified tenant and instructor.

Read snapshots compare the event head before and after their reads and retry
up to three times if it changes. This protects coherent projections during a
revision overlap; it is not a claim of multi-replica high availability.

## Identity, provenance and limits

The same stable signing key must be supplied after restart. Participant tokens
remain event/unit scoped and short-lived. Separate HKDF-derived keys protect
AES-GCM replay responses and keyed event-code lookup digests. Lookup still
requires the original scrypt verifier; the raw event code is not an index.
Do not change signing material or its pinned version mid-event without an
explicit migration/revocation procedure.

Simulator restoration replays stored, scoped read operations and checks that
the saved results and sequence match the deterministic simulator. It does not
execute proposed resource allocations. Recovery restores the latest validated
decision per unit/mission and uses the same pedagogical policy as local mode.
Keep the same reviewed campaign/simulator/recovery versions during an event;
this delivery does not implement automatic schema or policy migrations.

| Boundary | Prepared limit |
| --- | --- |
| Operations in one transaction, including metadata/replay/publication | 100 |
| Serialized application transaction | 1,800,000 bytes |
| One application document | 1,500,000 bytes |
| Documents materialized by one query | 10,000 |
| Simulator receipts per event/unit/mission | 1,000 |
| Snapshot attempts after concurrent changes | 3 |

These byte limits leave headroom below the Cosmos 2 MB request/item boundary.
Oversized transactions return 413 before any writes. Capacity limits fail
explicitly; data and replay records are not silently evicted. Existing scoped
HTTP budgets and bounded pending queues still apply.

Recent participant activity remains an ephemeral heartbeat indicator, not a
durable socket count. It can reset after an API restart while units, reconnect
verifiers, scores and decisions remain intact.

## Retention and live-service gates

Container-wide automatic TTL is rejected by the readiness probe. Do not expire
individual score, receipt, event, routing or replay documents independently:
partial expiration can invalidate evidence or allow an old operation to run
again. Event archival, authorized export/deletion and backup/restore procedures
must be agreed before public hosting. There is no automatic retention cleanup
or live backup/restore certification in this delivery.

The initial SignalR publication record is coalesced to the newest pending
revision for an event. Delivery/acknowledgment is a separate upcoming adapter.
An accepted business transaction therefore does not claim that a projector
already received the update.

Offline evidence:

```powershell
pnpm build:local
pnpm --filter @mission-control/api test
pnpm --filter @mission-control/tests-e2e exec playwright test durable-workshop.spec.ts
```

The five-mission scenario reconstructs API repositories and signing services
from an on-disk **transaction transport double**, including commit failures,
lost acknowledgments, overlapping runtimes, coherent read retries, private
replays, hint progression and simulator failure history. Separate SDK-boundary
tests exercise batch response handling, ETags, scope/schema validation and
exact limits. Neither is a live Cosmos, Entra, SignalR or Azure latency test.

Official storage references:

- [Cosmos transactions and limits](https://learn.microsoft.com/en-us/azure/cosmos-db/transactional-batch)
- [JavaScript transactional batch API](https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/items?view=azure-node-latest)
- [Conditional replacement](https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/replaceoperationinput?view=azure-node-latest)
- [Token-credential client configuration](https://learn.microsoft.com/en-us/javascript/api/@azure/cosmos/cosmosclientoptions?view=azure-node-latest)
