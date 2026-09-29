# Load Tests

`pnpm test:workshop:load` starts a disposable loopback API and exercises exactly
50 registered units, simultaneous mission starts and submissions, paused
submission rejection, a reconnect wave, instructor pause/resume and concurrent
duplicate retries. It checks all 50 final scores and the public projection.

The local regression threshold is p95 below 5 seconds across the scenario's
HTTP requests; each request also has a 10-second timeout. These are local
regression limits, not approved event-service SLOs. The runner reports measured
request count and p95 without retaining credentials or participant records.

TASK-802 remains open for the intended deployed environment, simulator calls,
SignalR delivery/replay and 50 real dashboard clients. This local scenario does
not replace that k6 profile or prove event-day capacity.

k6 scenarios for 50 participants, concurrent submissions, reconnect waves, and
instructor commands belong in this workspace.
