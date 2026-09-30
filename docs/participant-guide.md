# Operation Lighthouse participant guide

This guide covers the current **local rehearsal**. It is not yet the final
event-day distribution. Production teaching materials remain English; the
CLI and campaign feedback also support French and Brazilian Portuguese.

## Before the workshop

Install Node.js 24, pnpm 11.27.0, Git, PowerShell 7 and a current stable VS Code.
Sign into VS Code with the GitHub account that has your permitted Copilot access.
Confirm organization policies, model availability and usage allowance with the
facilitator. An installed extension does not prove an account is entitled to use
Copilot or that every agent feature is enabled.

The authoring instructions below follow the official VS Code documentation
reviewed on 2026-09-29:

- [Set up GitHub Copilot](https://code.visualstudio.com/docs/setup/copilot)
- [Create and use custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [Configure MCP servers and tool trust](https://code.visualstudio.com/docs/agent-customization/mcp-servers)

Use only the workshop's synthetic inputs. Do not paste secrets, personal
information or customer data into an agent conversation. Never enable blanket
tool approval merely to get past a workshop error.

## Obtain the starter workspace

For this rehearsal, the facilitator builds the CLI from the repository with
`pnpm install --frozen-lockfile` and `pnpm build:local`, then starts the
[local event environment](local-workshop.md). The local API and participant
CLI must run on the same machine. A shared classroom deployment is a later gate.

From the repository root, copy only participant starters into a separate folder:

```powershell
$cli = Join-Path (Get-Location) 'apps\participant-cli\dist\cli.js'
$workspace = Join-Path $env:LOCALAPPDATA 'MissionControl\lighthouse-starters'
New-Item -ItemType Directory -Path $workspace -Force | Out-Null
Copy-Item '.\campaigns\operation-lighthouse\starters\*' $workspace -Recurse
code $workspace
```

Do not overwrite previous exercise work; use a new folder for a fresh rehearsal.
Do not copy instructor presentations, test fixtures, environment files or
participant credentials into the starter package.

## Join and check connectivity

In the same PowerShell terminal, isolate the rehearsal's participant credentials
from any existing event:

```powershell
$env:MISSION_CONTROL_HOME = Join-Path $env:LOCALAPPDATA 'MissionControl\lighthouse-participant'
node $cli config set --api-url http://127.0.0.1:3000 --locale en
node $cli join --event-code '<code supplied by facilitator>' --name 'Synthetic Unit 01'
node $cli connectivity
node $cli preflight
```

The CLI stores tokens and reconnect credentials under
`$env:MISSION_CONTROL_HOME\.mission-control`. Keep this outside the repository
and never share it. Reuse the same `MISSION_CONTROL_HOME` in later terminals.
Do not use `join` to refresh an existing identity; use `reconnect`.

Before registration, a missing participant token is expected. After joining,
all five connectivity checks must pass. Preflight detects installed tools and
extensions; manually confirm that a new VS Code Copilot chat can answer a
synthetic prompt and select the intended custom agent.

## Author a VS Code custom agent

1. Open the copied starter folder as the VS Code workspace. Select the intended
   session target/harness; available controls and tools depend on it.
2. Run **Chat: New Custom Agent** from the Command Palette. Choose a workspace
   agent, saved under `.github\agents\` with an `.agent.md` extension.
3. Give the agent a bounded purpose in its description and Markdown instructions.
   Describe the permitted inputs, required output contract, uncertainty handling
   and what requires review. Add only tools available and approved in this setup.
4. Save the file, select the agent from the Agent dropdown and attach or reference
   the mission inputs and contract explicitly. Review the generated artifact.
5. Save the structured result as JSON. Do not mistake prose, a screenshot or a
   successful chat response for a submission accepted by the event server.

Do not pin a model name that the account cannot access. For Missions 3-5, the
facilitator must supply and verify the actual tool environment. This local API
does not expose an MCP server; do not create an `mcp.json` entry pointing at the
Mission Control REST API and assume it is MCP-compatible. Official instructions
describe configuration mechanics, not proof that the workshop tools are wired.

## Three distinct checks

| Step | What it proves |
| --- | --- |
| Your tests / `mission test` | Runs `pnpm test` in the current directory with the mission ID in the environment. This requires a test script you have implemented; starters are not pre-solved applications. |
| `mission validate` | Checks the bounded JSON envelope, matching mission ID, schema version and inner evidence object. It does not run the campaign validator. |
| `mission submit`, then `mission status` | Sends evidence to the event server, runs the actual mission validator and returns rule feedback, completion and authoritative scoring. |

Each submission has this outer shape:

```json
{
  "schemaVersion": "1.0",
  "missionId": "signal-in-the-storm",
  "evidence": {}
}
```

Replace the inner object with your mission output. The server passes that inner
object to the validator; do not nest another envelope inside `evidence`.

## Mission 1: Signal in the Storm

Use `mission-1\examples\incident-report.txt` for the public worked example.
The supplied `examples\evidence.json` demonstrates the contract; author your
own response for the facilitator's exercise. Keep `location` and
`affectedServices` along with category, severity and missing information.
Do not fabricate a duplicate ID or infer unsupported facts.

```powershell
node $cli mission start signal-in-the-storm
$evidence = Join-Path $workspace 'mission-1\examples\evidence.json'
node $cli mission validate signal-in-the-storm --evidence $evidence
$submissionKey = [guid]::NewGuid().ToString()
node $cli mission submit signal-in-the-storm --evidence $evidence --idempotency-key $submissionKey
node $cli mission status '<submission ID printed by submit>'
```

The public example passes core requirements without claiming duplicate detection.
The instructor should see completion, anonymous scoring and **pedagogical**
district recovery in the public view. With one registered unit, its validated
`water-pumping` reference changes Harbor from 32% to 38% and the collective
indicator from 58% to 59%. This does not restore the pumping service.

Use supported canonical service IDs: `emergency-operations`,
`port-azure-general`, `water-pumping`, `transit-control` and
`public-safety-radio`. Include only services supported by the report.
The recovery model does not guess districts from free-text locations; an
otherwise approved incident without a canonical service is `unattributed`.

## Missions 2-5: artifacts and progression

The instructor opens each mission. Finish the preceding core requirements before
starting the next. Use the same envelope and commands with the canonical ID.

| Mission ID | Required artifact / core | Advanced work |
| --- | --- | --- |
| `ground-truth` | Facts, assumptions, unknowns, cited evidence IDs, explicit support boundary and next information step. Use the reproducible reports and bulletin in `mission-2\context`. | Explain contradictions, confidence and untrusted instructions. |
| `connected-city` | Successful `weather`, `shelter` and `transport` trace entries, an evidence-grounded shelter/route recommendation, and retryable-failure handling. | Compare alternatives, bound retries and keep the trace concise. |
| `specialist-network` | At least three bounded specialist roles, input/output contracts, valid evidence-preserving handoffs covering every role and an independent approving reviewer. The handoff schema describes one handoff, not the complete submission. | Concurrency, disagreement handling, escalation and telemetry. |
| `restore-the-lighthouse` | Combined assessment, at least five evidence IDs from four successful tool sources, consecutively prioritized actions, valid allocations, two or more handoffs, final review and audit. Follow its full submission schema. | Modifier handling, failure replanning, rejected alternatives, human-approval tracking and efficient calls. |

Never invent tool calls or approval records. Missions 3 and 5 require actual
server-observed tool receipts, not trace-shaped claims. Specialist execution and
human authorization still require facilitator review; approval flags are not
identity verification.

## Calling the local city simulators

After starting Mission 3 or 5, discover the available operations:

```powershell
node $cli mission tools connected-city
```

Save a tool request as `weather-request.json` in your own workspace:

```json
{ "tool": "weather", "operation": "forecast", "arguments": {} }
```

```powershell
node $cli mission tool connected-city --request .\weather-request.json
```

The response contains `evidenceId`, the tool result and its server scope. Keep
the receipt. The first forecast call in each local mission session deliberately
returns a retryable simulator failure and CLI exit code 1; repeat the command
with a **new** idempotency key for an actual retry. Reusing a key is only for
recovering a lost HTTP response and does not execute another call.

Use `shelter` / `list` with `{}` and `transport` / `journey` with
`originDistrictId`, `destinationDistrictId` and `mode`. The catalog supplies
the accepted argument schemas. Select a route and shelter from the returned
data, not a memorized answer. Mission 5 also exposes `grid` / `health`,
`grid` / `constraints`, `resources` / `inventory` and `incidents` / `reports`.

Each `toolTrace` entry contains the exact `tool`, `evidenceId` and `status`
(`success` or `failed`) of a receipt. Cite successful **receipt IDs** in the
recommendation and decision package; business identifiers such as a shelter ID
are not provenance receipts. Receipts cannot be shared across units or missions.
The server checks the actual route, shelter capacity, nested citations and
aggregate resource quantities. Proposed allocations do not yet change city state.

An approved VS Code terminal tool can run these same CLI commands with your
isolated participant home. Do not paste tokens into chat or agent instructions.
This is authenticated REST/CLI integration, not MCP configuration, and still
requires the facilitator's clean authoring rehearsal.

## Interpret server feedback

`submit` prints evaluated feedback automatically. `mission status <submission-id>`
reads it again. The result includes an `outcome`, individual `rules`, and
`missionPoints`, `totalPoints` and `awardedPoints`.

- `passed`: every required rule passed. Advanced failures do not prevent core
  completion.
- `partial`: inspect failed required rules, correct your evidence and resubmit.
- `retry`: the submission could not be assessed; inspect feedback before retrying.
- `blocked`: a platform condition prevents assessment; involve the facilitator.

Non-passing evaluated outcomes return a nonzero CLI exit code. Score improvements
are retained across attempts; duplicate attempts award zero additional points.
Scoring and mission completion are not certificate eligibility.

## Understand the city indicator

The public recovery percentage is a **pedagogical indicator of validated
decisions**, not a score conversion or proof that the city simulators executed
your plan. No inventory is consumed and no shelter, route or electrical sector
changes state when you submit an approved proposal.

Feedback includes `recovery.policyVersion`, the affected `districtIds` and
`status`: `applied`, `unchanged`, `not-applied` or `unattributed`.
There is one contribution per unit/mission. A later approved, attributable plan
replaces its predecessor rather than adding another reward. Failed or
unattributed attempts leave the earlier contribution in place.

Policy `1.0.0` assigns Missions 1-5 weights of **10%, 10%, 20%, 10%, 50%** in the
remaining recovery range of each covered district. All eligible registered
units share the calculation, including units without submissions. Repeated
submissions cannot raise it; a late join or an approved change of plan can lower
or redistribute it. The public screen reports finale readiness only while the
current collective indicator is at least **80%**.

The [local operating guide](local-workshop.md#decision-recovery-policy-100)
documents the complete attribution and calculation rules. Do not add
unsupported services, destinations or approval claims to raise the indicator.
Specialist execution and human authorization still require independent
confirmation.

## Recovery

For an expired token or lost session, run `node $cli reconnect`, followed by
`node $cli connectivity`. This preserves the unit instead of registering again.
Reconnect credentials are bound to the configured API URL. If that URL changes,
or older credentials have no recorded API binding, join the correct event again
rather than forwarding an existing reconnect secret to another server.

For a lost HTTP submission response, rerun the same command with the **same
idempotency key and identical evidence**. After editing the evidence or changing
mission availability, generate a **new** key. The `retry` command is another
submission attempt; it does not retrieve an earlier response unless its key is
explicitly reused.

If a mission is paused/closed or a prerequisite is incomplete, ask the facilitator
to inspect event state and feedback. Do not bypass the server. A restarted local
API has no saved event; the facilitator must create a new one.

For HTTP `429 request-rate-limited` or `503 request-queue-full`, stop the retry
loop and wait for the indicated `Retry-After` interval. Retry with the same
idempotency key and unchanged evidence. Rejoining or refreshing tokens does not
reset a unit's budget. The [local guide](local-workshop.md#request-budgets-and-backpressure)
lists the classroom limits and their single-process scope.

On the public screen, no scores means no evaluated scores, and a disconnected
message means live results are unavailable. Do not substitute demonstration
values or screenshots as if they were participant achievements.

## Recognition

The certificate recognizes **full workshop attendance and hands-on participation**,
not passing all five missions. It is not an official GitHub certification.
The public agenda is 455 minutes including lunch and the break; do not describe
the certificate as an eight-hour training credit.
