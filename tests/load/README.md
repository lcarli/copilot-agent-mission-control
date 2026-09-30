# Load Tests

`pnpm test:workshop:load` runs two disposable loopback scenarios sequentially.
Chromium must be available for the browser stage; install it using
`pnpm --filter @mission-control/tests-e2e exec playwright install chromium`.

The first scenario exercises exactly
50 registered units, simultaneous mission starts and submissions, paused
submission rejection, a reconnect wave, instructor pause/resume and concurrent
duplicate retries. It checks all 50 final scores and the public projection.

The local regression threshold is p95 below 5 seconds across the scenario's
HTTP requests; each request also has a 10-second timeout. These are local
regression limits, not approved event-service SLOs. The runner reports measured
request count and p95 without retaining credentials or participant records.

The second scenario, in `tests\e2e\test\local-workshop-scale.spec.ts`, covers all
five missions with 50 logical HTTP participants and one real public browser.
It exercises actual scoped simulator receipts, planned tool failures and
recovery, concurrent idempotent replays, foreign-receipt rejection, unchanged
inventory, reconnects, district recovery and finale readiness. Its p95 limit
applies separately to each measured phase. See the [end-to-end test guide](../e2e/README.md).

TASK-802 remains open for the intended deployed environment, SignalR
delivery/replay and 50 real dashboard clients. These local scenarios do not
replace that k6 profile or prove event-day capacity.

k6 scenarios for 50 participants, concurrent submissions, reconnect waves, and
instructor commands belong in this workspace.
