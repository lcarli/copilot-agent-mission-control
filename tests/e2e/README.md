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

These scenarios do not validate VS Code/Copilot generation, deployed Azure
adapters, SignalR, a complete screen-reader audit or a human-led workshop.
TASK-801 remains open for that intended-event coverage. No credentials,
screenshots, videos or traces are retained by the test runner.
