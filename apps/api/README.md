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
