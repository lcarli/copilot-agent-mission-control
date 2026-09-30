# End-to-End Tests

This workspace runs a real loopback HTTP API, the compiled participant CLI in
isolated temporary homes, and a Vite-served Chromium browser.

```powershell
pnpm --filter @mission-control/tests-e2e exec playwright install chromium
pnpm test:workshop
```

The browser journey creates an event, opens registration and Mission 1, joins
with the CLI, distinguishes a passing envelope check from a partial server
evaluation, exercises pause/resume, resubmits corrected evidence, reconnects,
and observes public score/progress updates. It also proves that an API outage
hides stale results and that the public-only page has no instructor controls.

A second scenario submits all five canonical envelopes through the same HTTP
API and verifies evaluation, progression, scoring and idempotent score awards.
Its synthetic fixtures are in the campaign's `test/fixtures`, outside the
participant starters. Those files are templates, not reusable live receipts or
actual human approvals.
Missions 3 and 5 now invoke the simulators through the real CLI executable,
replace placeholder IDs with server-generated receipts and submit those
observations for provenance-aware evaluation. Decision text and approval
fields remain synthetic, not proof of Copilot authoring or human authorization.

A classroom-scale scenario runs the five missions with **50 logical HTTP
participants and one real public browser**. It requires 250 core passes,
550 distinct scoped simulator observations (500 mission receipts and 50
post-plan inventory probes), 100 observed retryable weather failures, and
exactly 250 recovery contributions. Identical tool/submission keys are reused
across units and replayed concurrently, while fresh equivalent submissions
must not add points or recovery. Borrowed receipts are rejected, paused tools
cannot run, reconnects preserve all 50 identities, and an isolated event stays
at its baseline. Public JSON and browser content must exclude credentials,
private names, unit IDs and evidence receipts.

Run that scenario independently after `pnpm build:local`:

```powershell
pnpm --filter @mission-control/tests-e2e exec playwright test local-workshop-scale.spec.ts
```

It asserts p95 below five seconds **in each measured phase**, not only across
the combined request population. Each measured request has a ten-second
timeout. Reported request counts exclude the browser's independent polling
requests; the browser is nevertheless active throughout the workload.
`pnpm test:workshop:load` runs both the original Mission 1 load scenario and
this expanded browser/simulator scenario sequentially.

These scenarios do not validate VS Code/Copilot generation, deployed Azure
adapters, SignalR, 50 separate browser clients, a complete screen-reader audit
or a human-led workshop.
TASK-801 remains open for that intended-event coverage. No credentials,
screenshots, videos or traces are retained by the test runner.

`accessibility.spec.ts` exercises live setup, mission controls, public results
and failure states with axe-core WCAG A/AA checks. It verifies three locales,
both themes, real keyboard navigation, visible focus, narrow-screen reflow and
reduced-motion behavior. Public document language follows the selected locale.
No axe rules are disabled to accommodate the app. This is bounded automated
evidence, not a complete manual accessibility audit or certification.

`durable-workshop.spec.ts` uses the operational hosted builder with synthetic
identity and an atomic, file-backed transaction transport double. It reconstructs
repositories after each mission and verifies stable participant signing,
encrypted replays, failures before commit, lost acknowledgments, conditional
concurrency, hint progression and preserved simulator/recovery state. The
fixture writes only to a generated temporary directory and removes it afterward.
This is offline durability evidence, not a live Cosmos/Entra/SignalR test.
