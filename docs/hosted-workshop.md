# Hosted workshop preparation

This profile prepares one API replica using the accepted Cosmos DB `state`
container and Azure SignalR Serverless. No Azure resources have been provisioned
or deployed by this preparation pass. Local rehearsal remains a separate,
loopback-only, memory-backed mode.

**Current boundary:** the normal API assembles managed identity, pinned Key
Vault signing material, the immutable Blob campaign descriptor, durable Cosmos
repositories, Entra instructor authorization and public-only SignalR delivery.
Missing configuration or unavailable startup dependencies fail closed; there is
no memory or random-signing fallback. Packaging and live-service verification
remain separate deliveries. The file transport used by offline tests is not a
production storage option.

## Required runtime configuration

The hosted entry point reads these environment variables at startup. Resource
URLs target Azure public-cloud HTTPS endpoints, without embedded credentials,
SAS tokens, alternate ports or query parameters. This entry point references
existing resources; it does not create them.

| Variable | Required value |
| --- | --- |
| `WORKSHOP_RUNTIME` | `hosted` |
| `AZURE_CLIENT_ID` | User-assigned managed identity **client ID**, not its principal ID |
| `ENTRA_TENANT_ID` | Single permitted tenant UUID |
| `ENTRA_API_CLIENT_ID` | API application UUID; the v2 access-token audience |
| `ENTRA_SPA_CLIENT_ID` | Separate dashboard SPA application UUID; the permitted `azp` |
| `DASHBOARD_ORIGIN` | Exact externally served dashboard HTTPS origin |
| `KEY_VAULT_URI` | Vault HTTPS origin |
| `UNIT_SIGNING_SECRET_NAME` | Existing Key Vault secret containing 32 cryptographically random bytes, encoded as canonical base64 |
| `UNIT_SIGNING_SECRET_VERSION` | Explicit 32-character secret version; never `latest` |
| `COSMOS_ENDPOINT` | Cosmos account HTTPS endpoint |
| `COSMOS_DATABASE` / `COSMOS_STATE_CONTAINER` | Existing database and `/eventSessionId`-partitioned state container |
| `CAMPAIGN_RUNTIME_BLOB_URL` | Private, immutable JSON descriptor under the `campaigns` Blob container |
| `CAMPAIGN_RUNTIME_SHA256` | Lowercase SHA-256 of the exact descriptor bytes |
| `SIGNALR_SERVICE_URI` | Serverless SignalR HTTPS origin |

Signing material is retrieved with `ManagedIdentityCredential`, never a
developer-credential fallback chain. Missing, disabled, not-yet-valid, expired,
wrong-version or malformed secrets stop startup. Expiration is also checked
while running. The in-memory key probe is not a continuous Key Vault
revocation check; changing secret permissions/enablement after startup needs an
operational revocation/restart procedure.

The Blob loader checks length (at most 1,000,000 bytes), downloads conditionally
against the observed ETag, verifies the digest and decodes all five localized
mission contracts. Mission order and validator versions must match the installed
allowlist. No downloaded JavaScript or archive is executed. New events pin the
artifact digest; a different configured artifact cannot silently reinterpret
their participant operations or public snapshots.

## Instructor setup and browser session

The following is a **future authorized setup checklist**, not evidence that
registrations, consent, roles or secrets already exist:

1. Create separate single-tenant API and SPA Entra registrations. Set the API's
   `api.requestedAccessTokenVersion` to `2`, expose delegated `Workshop.Access`
   under `api://<API-client-ID>`, and grant/admin-consent that permission to the
   SPA. Do not enable an implicit flow or place a client secret in the SPA.
2. Define API user app-role values `instructor`, `event-admin` and
   `platform-admin`; assign only the necessary roles through its enterprise
   application. Event creators need `event-admin`. `instructor` can manage an
   event it owns but cannot create one. There is no co-facilitator event-sharing
   interface in this delivery.
3. Register exactly `<DASHBOARD_ORIGIN>/auth.html` as a SPA redirect URI. Serve
   the dashboard and `/api` proxy at that same origin. The bundled bridge page
   deliberately contains no application UI, router or app initialization.
4. Configure tenant Conditional Access/MFA and review consent with the
   administrator. Provision the managed identity's resource-scoped permissions
   and the pinned signing secret through an approved process, without placing
   secret values in source control, command history or deployment output.
5. Verify login, consent/MFA, token renewal, role denial, ownership denial and
   logout against the actual tenant before a hosted rehearsal.

The API verifies RS256 signature, tenant-specific issuer/JWKS, audience, token
lifetime, tenant, authorized SPA, delegated scope and recognized roles. ID
tokens, app-only tokens and mutable names are not instructor credentials.
Ownership is stored as `createdInTenant` plus immutable `createdBy` (`oid`).
Platform administrators can manage other owners' events **within the configured
tenant only**. Legacy events without attributable tenant ownership are not
silently adopted.

The dashboard initializes MSAL only in the instructor view. Sign-in is an
explicit popup action; subsequent requests use silent access-token acquisition.
No account is selected automatically from a cache. Tokens and pending actions
stay in memory, not browser persistent storage or application URLs. The public
page neither initializes instructor sign-in nor sends instructor authorization.
Logout clears this dashboard's account/private state, not the user's unrelated
Microsoft application sessions. Token revocation/role changes follow Entra token
lifetime and tenant policy; continuous-access revocation is not certified here.

On a lost reply, 429 or 5xx, **Retry the same action** retains the exact JSON
body, command ID/timestamp and idempotency key while acquiring a fresh access
token. Another mutation is blocked until that action resolves. Do not reload,
change views or sign out while it is uncertain. Logout/account changes clear
pending private state intentionally; if the tab is lost, reconcile the
owner/event and durable creation/replay records before issuing a replacement
creation or command. There is no browser-persistent recovery secret.

Microsoft popup sign-in is the preparation assumption selected when the user
was unavailable for the UI choice; it was not separately confirmed by the user.

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

The SignalR publication record is coalesced to the newest pending revision for
an event. A worker reads the same redacted coherent projection as the HTTP
endpoint, publishes it and acknowledges only the publication ETag it observed.
A newer mutation cannot be cleared by an older acknowledgment. Failures are
logged without payloads/credentials and remain pending; shutdown stops/drains
publication before closing Cosmos. Repeated delivery is permitted and safe.

Each public event has its own derived hub. Negotiation verifies event existence,
applies a 120/minute IP admission budget and obtains a five-minute client token
using `:generateToken`, managed identity and REST API version `2024-12-01`.
Publishing uses `:send` with only the validated public projection. Configure
Serverless mode and the current `SignalR REST API Owner` role, whose actions
include client-token generation. Validate actual RBAC and allowed browser origins
against the deployed resource; the older role overview is not live proof.

The browser uses the SignalR JavaScript client, connects before snapshot
reconciliation, rejects foreign/private/stale projections and polls every two
seconds even while connected. HTTP failure clears displayed results; a
real-time-only failure leaves fresh HTTP snapshots usable. SignalR loss degrades
event health, not core API readiness. An accepted transaction or service HTTP
202 is not acknowledgment that a projector rendered it.

SignalR's browser protocol may put its **short-lived, public-only** connection
token in the service WebSocket URL. That token contains no instructor session
and grants no private hub. Do not record WebSocket URLs/tokens in proxy or client
logs. Instructor credentials never enter these URLs.

Offline evidence:

```powershell
pnpm build:local
pnpm --filter @mission-control/api test
pnpm --filter @mission-control/command-center test
pnpm --filter @mission-control/tests-e2e exec playwright test durable-workshop.spec.ts
pnpm --filter @mission-control/tests-e2e exec playwright test hosted-workshop.spec.ts
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
- [Entra claims validation](https://learn.microsoft.com/en-us/entra/identity-platform/claims-validation)
- [MSAL initialization and redirect bridge](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/initialization)
- [MSAL cache behavior](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/caching)
- [SignalR REST API](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-reference-data-plane-rest-api)
- [Current SignalR REST API Owner permissions](https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles/web-and-mobile#signalr-rest-api-owner)
