# Mission Control API

Workspace for the Fastify API, validation workers, campaign engine, and MVP
simulator modules.

Run the executable API after building:

```powershell
pnpm --filter @mission-control/api build
pnpm --filter @mission-control/api start
```

The foundation exposes `/api/v1/config`, `/api/v1/health/live`,
`/api/v1/health/ready`, and `/api/v1/health/event`. Responses carry
`x-correlation-id`; errors use RFC 9457 Problem Details without stack traces or
internal resource identifiers.

Operational routes are composed once in `src\workshop.ts`. The runtime supplies
domain repositories, unit signing, asynchronous instructor authorization,
submission/observation/recovery state, request transactions and health probes.
Domain services do not depend on Fastify or an Azure SDK.

`buildLocalWorkshopApp` explicitly selects the in-memory adapters and enforces
loopback access even if a caller supplies a public host configuration. Its
random signing material and event state do not survive restart. Use
`pnpm start:local` and the [local guide](../../docs/local-workshop.md).

`buildHostedWorkshopApp` requires a hosted runtime and dependency probes; it
rejects the local adapter rather than relabeling it as production. Hosted
adapter assembly is a subsequent delivery. Until it is wired, the normal
server's readiness/event probes return 503 instead of advertising an
operational workshop. Liveness still reports process health.

`/api/v1/workshop` describes the actual runtime; `/api/v1/local` is retained
only for local compatibility. The public schema reserves `hosted-event`
separately from `local-event`; this does not enable a hosted deployment or
remove the dashboard's current local-only integration boundary.
