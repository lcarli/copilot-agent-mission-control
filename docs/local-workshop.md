# Local workshop rehearsal

This is a loopback-only integration environment for Operation Lighthouse.
It connects the existing event, mission, validation, hint and scoring services
to real HTTP clients. It is not a production deployment or a public-event
readiness sign-off.

## Boundaries

- The API binds to `127.0.0.1` and rejects non-loopback callers. Do not expose
  it through a tunnel, port forward or shared reverse proxy.
- Event data, unit sessions, submissions, scores, decision contributions and
  command audit are in memory. Restarting the process clears them. Do not use
  real participant data.
- The instructor token is supplied through an environment variable and kept
  only in the private browser tab. It is not an Entra authentication adapter.
- The supported local scoring mode is guided: 1,000 possible points per
  mission, versioned dimension weights, no hint deduction, and positive
  per-dimension improvements only. Repeated equivalent submissions cannot farm
  points. Core completion requires all required rules, not all advanced rules.
- Public updates use HTTP polling, not SignalR. Activity means an authenticated
  request or registration within 90 seconds, not an open socket.
- Public city recovery is a **pedagogical decision-coverage indicator**, not
  executed city operations or a conversion of points. Policy `1.0.0` starts
  from the scenario baseline and applies approved, attributable decisions.
  The public screen identifies the source, policy, eligible-unit count,
  contribution count and current finale threshold.
- Missions 3 and 5 require server-observed simulator receipts scoped to the
  authenticated event/unit/mission. Proposed allocations are not executed;
  specialist execution and human-approval flags are not proof of actual
  orchestration or human authorization.

## Start from the repository root

Use Node.js 24, pnpm 11.27.0 and PowerShell 7.

```powershell
pnpm install --frozen-lockfile
pnpm build:local
```

`build:local` compiles the API, CLI and their workspace dependencies in dependency
order. It intentionally does not rebuild or approve presentation/media assets.
Run the campaign's normal build and asset checks separately for delivery.

In terminal 1:

```powershell
$env:MISSION_CONTROL_LOCAL_INSTRUCTOR_TOKEN = [Convert]::ToHexString(
    [Security.Cryptography.RandomNumberGenerator]::GetBytes(32)
)
$env:MISSION_CONTROL_LOCAL_INSTRUCTOR_TOKEN
pnpm start:local
```

Copy the generated token only into the private instructor connection field.
Do not record this terminal, put the token in a URL, commit it, or share it with
participants. The API listens on `http://127.0.0.1:3000`.

In terminal 2:

```powershell
pnpm --filter @mission-control/command-center dev
```

Open the URL printed by Vite. Its `/api` proxy targets the local API on port 3000.
The browser and API must run on the same machine for this first rehearsal.
Changing `PORT` also requires changing the development proxy; leave the default
for these instructions.

## Instructor round trip

1. On **Event setup**, enter the local instructor token and create an event.
   Keep the event session ID and registration code in a private event note
   outside source control. The registration code is shown at creation only.
2. Select **Open lobby**, then **Start event**, then **Open mission** for
   **Signal in the Storm**.
3. Open the **public-only display** link in a separate tab or projector window.
   That page has no navigation to instructor controls and receives no
   instructor token. Never project the private setup tab.
4. Follow the [participant guide](participant-guide.md) in a separate terminal.
   A successful submission changes mission completion and the anonymous unit
   ranking in the public page. An approved, attributable decision also updates
   the pedagogical district indicator; inspect `recovery.status` separately
   from the score.
5. Exercise pause/resume and a partial submission. Verify the CLI shows an
   explicit server error or failed required rules, then correct and resubmit.
6. Close the current mission and open the next mission. Per-unit prerequisites
   are enforced by the server. A paused or closed mission cannot accept new
   submissions.
7. To close the event, provide a reason and type `CLOSE LOCAL EVENT`. Closing is
   explicit; restarting the API is not a durable recovery mechanism.

The other dashboard tabs are retained as clearly labeled component
demonstrations. Their example controls are not instructor operations. Use the
real local controls in **Event setup**.

## API contract used by the local adapter

Instructor requests require `Authorization: Bearer <local-instructor-token>`.
Participant requests use the issued unit token; event and unit scope are never
accepted from the participant submission body. Every mutation requires an
`Idempotency-Key`. Reusing a key and equivalent body replays the original
response; a different body returns `409 idempotency-key-reused`.

| Route | Local behavior |
| --- | --- |
| `POST /api/v1/event-sessions` | Create an Operation Lighthouse event using campaign ID, default locale and supported locales. |
| `GET /api/v1/event-sessions/{id}` | Instructor-only event and mission versions/progress. |
| `POST /api/v1/event-sessions/{id}/commands` | Open/start/close event or open/pause/resume/close mission with optimistic versions. |
| `GET /api/v1/event-sessions/{id}/audit` | Instructor-only accepted/rejected lifecycle command records. |
| `POST /api/v1/registrations` | Join with event code, synthetic name and locale. |
| `POST /api/v1/auth/refresh` | Reconnect the same unit with its stored reconnect secret. |
| `GET /api/v1/event-session`, `/unit`, `/missions` | Unit-token-scoped connectivity and state. |
| `POST /api/v1/missions/{id}/start` | Start an open mission with completed prerequisites. |
| `GET /api/v1/missions/{id}/tools` | List allowed simulator operations and argument schemas for the mission. |
| `POST /api/v1/missions/{id}/tools` | Invoke an allowed read operation and record its scoped success/failure receipt. Requires an active, started mission and idempotency key. |
| `POST /api/v1/missions/{id}/submissions` | Unwrap `evidence`, invoke the versioned validator, apply score improvements and an eligible decision contribution, then return the submission ID. |
| `GET /api/v1/submissions/{id}` | Read only the requesting unit's evaluation, rule results, scoring and decision-recovery feedback. |
| `POST /api/v1/missions/{id}/hints` | Deliver the next localized hint for an active mission. |
| `GET /api/v1/public/event-session?eventSessionId={id}` | Allowlisted public projection with anonymous unit labels and explicit source metadata. |

The command envelope uses `schemaVersion`, `commandId`, `commandType`,
`eventSessionId`, `expectedVersion`, `requestedAt`, `target` and `payload`.
Mission commands put `missionId` in `target`; event closure additionally
requires `reason` and `payload.confirmationPhrase`. Other planned instructor
commands, exports, public activity replay and MCP endpoints are not implemented
in this adapter.

Simulator sessions are isolated by event, unit and mission. The existing
deterministic city classes supply the results; the adapter does not accept
client-selected scope, arbitrary operations or simulator writes. Each session
starts weather at the 10:00 step, with one retryable forecast failure. Replaying
an HTTP key returns the original receipt; a new invocation creates new evidence.
Submissions snapshot the server log, never a log supplied inside the envelope.
Validators 1.1.0 reject fabricated references and verify the selected
shelter/route and aggregate resource quantities against the observed data.

## Decision recovery: policy 1.0.0

The selected local model is explicitly **pedagogical**, not operational
simulation. The shared campaign implementation in
[`recovery.ts`](../campaigns/operation-lighthouse/src/recovery.ts) is used by
both the local API and the campaign dry run. The dry run no longer adds five
percentage points for each passed mission.

Only an actual validator outcome of `passed` can contribute. Advanced failures
do not prevent core completion or contribution. Partial submissions can earn
points without changing recovery. Client-supplied percentages, claimed tool
receipts and unknown geographic references do not create recovery effects.

| Mission | Weight in each covered district's remaining range | District attribution |
| --- | --- | --- |
| 1 - Signal in the Storm | 10% | Districts of canonical `affectedServices` in the city catalog. Free-text locations are not guessed. |
| 2 - Ground Truth | 10% | All five districts: city-wide grounding readiness. |
| 3 - Connected City | 20% | The recommended shelter's district and endpoints of the supported routes. The validator first verifies the actual scoped simulator receipts. |
| 4 - Specialist Network | 10% | All five districts: coordination-plan readiness, not independently verified specialist execution. |
| 5 - Restore the Lighthouse | 50% | Distinct proposed allocation destinations, after validation against observed inventory. More allocations to the same district do not multiply coverage. |

These weights are not score weights or direct percentage-point awards. For
each district `d`, with baseline `B[d]`, eligible-unit count `N` and the sum
`W[d]` of applicable mission weights across those units:

```text
district[d] = B[d] + floor((100 - B[d]) * W[d] / (100 * N))
collective = floor(sum(district[d]) / 5)
```

With no eligible units, retain the baseline: overall **58%**, and district
values **32, 51, 86, 48, 73** in canonical order. Each unit can contribute at
most once per mission to each district, so the indicator cannot exceed 100%.
The first four missions account for at most half of the remaining range;
even complete coverage cannot reach the 80% finale threshold without Mission 5.

The current local rules are:

- The latest approved, attributable decision **replaces** the earlier decision
  for the same event/unit/mission. New submission IDs, transport replays and
  repeated destination IDs do not stack contributions. Replanning can move
  coverage between districts or lower the collective indicator.
- A rejected attempt does not erase the previous contribution. An approved
  incident with no canonical service reference returns `unattributed`, makes
  no change and preserves any earlier attributable decision.
- All registered units except `muted` and `withdrawn` share the denominator,
  matching ranking eligibility **before** zero-score units are hidden from the
  leaderboard. Late joins count immediately. Activity timers and disconnects
  do not remove units; reconnecting does not create a new unit.
- `finaleUnlocked` means the **current snapshot** reaches at least **80%** with
  an eligible unit. It is reversible after replanning or late registration,
  not a latched celebration, video trigger or certificate requirement.
- No allocation is executed, inventory consumed, shelter admission performed,
  route reopened or grid sector restored. Simulator service states and the
  immutable scenario seed remain unchanged.

Submission feedback adds `recovery.policyVersion`, `recovery.districtIds` and
one of these `recovery.status` values:

| Status | Meaning |
| --- | --- |
| `applied` | A first contribution or a replacement with different district coverage. |
| `unchanged` | The approved decision has the same district coverage as its predecessor. |
| `not-applied` | The current submission did not pass all required rules. Prior contributions are retained. |
| `unattributed` | The approved decision has no canonical district attribution. Prior contributions are retained. |

The public projection exposes aggregate counts, district baselines and the
policy version, never unit IDs, submission IDs or raw evidence. It retains
`recoverySource: "scenario-baseline"` until there is an eligible contribution,
then reports `"validated-decisions"`.

With one unit, the Mission 1 worked example changes Harbor from **32% to 38%**
and the collective indicator from **58% to 59%**. The five-mission synthetic
journey reaches district values **100, 95, 91, 58, 78** and a collective **84%**.
A second unit joining without contributions changes that collective value to
**71%** and clears finale readiness. These are reproducible model outputs, not
evidence of physical restoration or actual Copilot authoring.

## Reproducible local evidence

```powershell
pnpm --filter @mission-control/tests-e2e exec playwright install chromium
pnpm test:workshop
pnpm test:workshop:load
```

The browser journey uses the real CLI executable and isolated temporary
credential directories. The five-mission journey uses synthetic decision fixtures
under `campaigns\operation-lighthouse\test\fixtures\`; do not include those
in the participant distribution. Its tool-based missions replace placeholder
IDs with receipts from actual CLI/HTTP simulator calls before submission.
It also drives the public browser through district updates, the 80% finale
threshold and late-join recalculation, verifies that retries do not add
contributions, and checks that proposed allocations leave inventory unchanged.
Browser traces, screenshots and videos are disabled to avoid retaining
credentials from the private page.

The load scenario uses 50 units and a local p95 regression threshold of five
seconds, including submissions, reconnects, duplicate retries and instructor
pause/resume. It also requires exactly 50 decision contributions after retries
and reconnects, without inflating the 59% Mission 1 collective indicator.
It does not prove deployed-service capacity, SignalR reconnect
behavior or 50 classroom browsers.

## Recovery and remaining gates

| Symptom | Action |
| --- | --- |
| HTTP 401 / expired participant token | Run `reconnect` using the same participant home; it preserves unit identity. |
| `mission-not-available` | Check instructor mission state. Resume/open the mission rather than bypassing authorization. |
| `mission-prerequisite-incomplete` | Inspect prior server feedback and complete the required core rules. |
| Lost submission response | Reuse the saved idempotency key with the identical evidence. Use a new key after changing evidence. |
| Version conflict | Refresh the instructor event and repeat the intended action using the current version. |
| Public connection failure | Results are hidden, not frozen as live. Restore the API; polling retrieves a fresh snapshot. |
| API restart | Create a new event and rejoin; the old credentials and event code are no longer usable. |
| Browser runner reports a missing executable | Install Chromium with the documented Playwright command; do not treat a skipped browser journey as a passing one. |

Still required: real specialist/human-approval provenance, intended deployment
authentication/persistence/SignalR, complete
security and accessibility checks, a clean VS Code authoring rehearsal, the
human-led workshop and the controlled pilot. Keep TASK-800 through TASK-810 open
until their full acceptance criteria are evidenced.
