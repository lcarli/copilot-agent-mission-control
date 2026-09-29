# Operation Lighthouse - Workshop Readiness Handoff

Snapshot: **2026-09-29, local integration and simulator evidence complete**  
Next objective: **connect participant-driven city recovery, then rehearse the participant authoring workflow, excluding videos**.

The main visual and presentation deliverables are complete. That does not mean
the full event integration has been rehearsed or approved for public delivery.
This document preserves the remaining work for a new conversation.

The technical gates below are recorded in the
[presentation production plan, section 10](presentations/powerpoint-plan.md#10-readiness-gates-before-technical-slide-capture).
The local evidence and remaining boundaries are now recorded below. Local
integration is not evidence of deployed-environment or public-event readiness.
Use the [local operating guide](local-workshop.md) and
[participant guide](participant-guide.md) to reproduce this first stage.

## 1. Delivered materials

| Deliverable | Location and status |
| --- | --- |
| Visual identity and logos | [Brand guide](brand/visual-identity.md) and [production exports](brand/exports/). Approved platform and campaign artwork; 12 SVGs and 12 PNGs. |
| Public workshop presentation | [OL-WORKSHOP-en.pptx](../campaigns/operation-lighthouse/presentations/OL-WORKSHOP-en.pptx): 60 slides, 11 sections, editable content and English speaker notes. |
| Private facilitator presentation | [OL-FACILITATOR-en.pptx](../campaigns/operation-lighthouse/presentations/OL-FACILITATOR-en.pptx): 18 slides, 4 sections, coaching, operating cues and contingencies. Do not distribute or project it to participants. |
| Completion-certificate template | [Editable PowerPoint](../campaigns/operation-lighthouse/certificates/OL-CERTIFICATE-TEMPLATE-en.pptx), [PDF](../campaigns/operation-lighthouse/certificates/OL-CERTIFICATE-TEMPLATE-en.pdf) and [PNG preview](../campaigns/operation-lighthouse/certificates/OL-CERTIFICATE-TEMPLATE-en.png). English, A4 landscape, with editable recipient, date and facilitator fields. |
| Rebuild and delivery instructions | [Presentation README](../campaigns/operation-lighthouse/presentations/README.md) and [certificate README](../campaigns/operation-lighthouse/certificates/README.md). Sources are stored alongside the deliverables. |

The certificate files now live in
`campaigns\operation-lighthouse\certificates\`, not `.copilot` or a conversation
folder. Its generator writes directly to that project directory.

## 2. Decisions to preserve

- Production materials remain **English**. Do not regenerate the approved logos
  or redesign the accepted presentations as part of this readiness work.
- Videos are deferred until after the workshop works without them. Do not
  resume or rewrite the historical Flow prompt files during this pass.
- The public agenda is **455 minutes**, including a 60-minute lunch and a
  15-minute break. Active workshop time is 380 minutes; do not casually describe
  the certificate as an eight-hour training credit.
- Certificate eligibility is **full workshop attendance and participation in
  the hands-on activities**, not passing all five missions. It is not an
  official GitHub certification.
- Public and facilitator materials stay separate. Keep answers, credentials
  and participant information out of public files.
- Local evidence-envelope validation is not server-side mission approval.
  Clearly distinguish examples, local checks and actual event results.
- Keep reusable deliverables in the project. Keep personalized certificates,
  participant records and secrets outside source control.

## 3. Priority 1: Make the participant workflow reliable

The source of truth for these recorded gates is the presentation production
plan. Update its status when a gate is actually resolved and demonstrated.

| Gate | Recorded issue or check | Required outcome |
| --- | --- | --- |
| R01 - Mission 1 | **Resolved locally.** Starter and runtime use `signal-in-the-storm`; the contract includes location/services and optional advanced fields. A public worked example passes schema and server evaluation. | Preserve the contract regression and real CLI/browser round trip. |
| R02 - Mission 3 | **Resolved locally.** Canonical `weather`, `shelter`, `transport` operations are callable from the CLI. Validator 1.1.0 verifies scoped receipts, the actual shelter/route and bounded failure recovery. | Rehearse the chosen VS Code agent and its approved tool permissions. |
| R03 - Mission 5 | **Contract and provenance demonstrated locally.** The full schema and CLI/HTTP journey use actual simulator receipts. Validator 1.1.0 checks nested citations and aggregate proposed resource quantities against observed inventory. | Proposed allocations are not executed. Specialist and human-approval claims are not independently verified authorization. |
| R04 - Public projection | **Partial.** Local completion and scores update over HTTP; districts are canonical, absent/disconnected state has no invented results, and other component demos are labeled. City recovery is explicitly a scenario baseline. | Integrate real recovery effects and the intended event transport. |
| R05 - Validation language | **Resolved locally.** CLI output distinguishes envelope checks, submission and evaluated server feedback; failed required rules produce a nonzero exit. | Preserve this distinction in live facilitation. |
| R06 - End-to-end integration | **Partial.** The browser/CLI/HTTP path covers all five missions; tool-based missions use actual CLI simulator calls and server observations rather than fixture trace IDs. Retries, reconnects and event/unit/mission isolation are covered. | Rehearse actual Copilot/specialist authoring and the intended deployed event. City recovery remains pending. |
| R07 - Mission 2 evidence | **Reproducible local scenario delivered.** Reports `incident-004`/`incident-005` and `bulletin-03` replace the placeholder, with source-quality, contradiction and untrusted-instruction teaching outcomes. | Exercise the scenario with participants and confirm learning outcomes. |
| R08 - Copilot authoring workflow | **Documentation checked; hands-on confirmation pending.** The participant guide references current official VS Code setup, custom-agent and MCP documentation. | Confirm the actual account, harness, approved tools and clean participant setup before screenshots or event sign-off. |

The Mission 1 browser/CLI round trip and five-mission HTTP path are established,
including actual simulator calls for Missions 3 and 5. Decision text and human
approval fields in the automated scenario remain synthetic; this is not proof
of a human authoring session or independent specialist execution.

Canonical districts are **Harbor, Old Town, North Hills, East Bank and Civic
Center**. Keep mission names and geography consistent across code, guides and
public examples.

## 4. Priority 2: Consolidate the participant kit and demonstrations

The [local participant guide](participant-guide.md) now consolidates the CLI,
preflight tooling, progressive starters and recovery steps. Exercise it from a
clean participant setup before treating it as the final event kit.

The guide covers:

- Prerequisites, Copilot access, supported VS Code setup and pre-event checks.
- Obtaining the participant package, joining an event and checking connectivity.
- Building the agent, running local checks, submitting evidence and interpreting
  server feedback for each mission.
- Required output artifacts, core versus advanced objectives, and where to find
  help without exposing instructor answers.
- Common setup problems, failed submissions, reconnects and recovery steps.

Mission 1 includes a public worked example; Mission 2 includes reproducible
scenario inputs. Complete synthetic regression envelopes are kept under
`campaigns\operation-lighthouse\test\fixtures`, outside participant starters.
Actual simulator/tool instructions and classroom fallbacks still need rehearsal.

Relevant starting points are
[`apps\participant-cli`](../apps/participant-cli/),
[`campaigns\operation-lighthouse\starters`](../campaigns/operation-lighthouse/starters/)
and the [private presentation instructions](../campaigns/operation-lighthouse/presentations/README.md).

## 5. Priority 3: Complete event-quality evidence

The [product roadmap](../PLAN.md#phase-8--quality-security-and-event-readiness)
still lists TASK-800 through TASK-810 as open.

| Roadmap item | Remaining readiness work |
| --- | --- |
| TASK-800 | Establish the required platform-wide unit and contract coverage. Existing tests in packages and applications should be reused; an open checkbox does not mean there are no tests. |
| TASK-801 | Extend the local instructor/participant scenarios to real authoring, simulator evidence and the intended deployment's failure/recovery paths. |
| TASK-802 | Extend the 50-unit local scenario to the intended APIs, simulators, SignalR and classroom dashboard behavior. |
| TASK-803 | Complete the planned authorization, event isolation, rate-limit, payload-limit and secret-handling validation. |
| TASK-804 | Complete keyboard, contrast, reduced-motion and screen-reader checks, plus applicable caption requirements. |

`tests\e2e` now implements real browser/CLI and five-mission HTTP scenarios.
`tests\load` implements a loopback scenario with exactly 50 units, 457 HTTP
requests, concurrent submissions, reconnects, retries and instructor commands.
The earlier local run measured p95 **1,595 ms** against a local regression limit
of 5,000 ms. This is not a deployed-service SLO or proof of Azure/SignalR capacity.
The 50-unit load scenario still uses Mission 1; it is not simulator-capacity
evidence. TASK-800 through TASK-804 remain open for their full platform-wide scope.

## 6. Priority 4: Reconcile guides, rehearse and run a pilot

| Roadmap item | Action |
| --- | --- |
| TASK-805 - Instructor guide | Reconcile this item with the delivered 18-slide facilitator guide. Check coverage of setup, troubleshooting, timing and recovery before marking it complete; do not start an unrelated replacement guide from zero. |
| TASK-806 - Participant guide | Exercise the delivered local guide from a clean participant setup and complete the intended-environment instructions. |
| TASK-807 - Internal rehearsal | Run the complete workshop without videos. Exercise instructor and participant roles, normal and failure paths, projector readability, actual timing and private/public screen separation. Record issues. |
| TASK-808 - Pilot event | Deliver to a controlled audience of up to 20 participants and collect learning and operational feedback. |
| TASK-809 - Pilot findings | Resolve release-blocking issues and adjust instructions or timing based on evidence. |
| TASK-810 - Public-event readiness | Confirm deployment, content, supported localization, operations, recovery/rollback and the final go/no-go decision. |

Do not mark roadmap items complete merely because presentation files exist.
Conversely, do not disregard the facilitator material already delivered.

The current handoff does not require a second campaign, a marketplace or other
Phase 9 expansion work. Public release/versioning is a separate follow-up after
the event-readiness criteria are satisfied.

## 7. Definition of ready for delivery without videos

- A participant can follow the guide from setup through all five missions.
- Submitted evidence reaches the correct validator and produces explainable
  feedback, scoring and canonical public-state updates.
- Demonstrations have reproducible inputs, expected outcomes and fallback paths.
- The instructor can deliver the agenda and recover from the rehearsed failures.
- The required quality checks and pilot have evidence, with no unresolved
  release-blocking findings.
- Public materials remain participant-safe; recognition and certificate
  issuance follow their actual criteria.

Videos are an enhancement, not a workaround for missing integration or unclear
instructions.

## 8. Suggested opening instruction for the next conversation

> Read `docs\workshop-readiness-handoff.md`, `docs\local-workshop.md` and the
> referenced readiness gates. Continue the non-video preparation from the
> working local HTTP/CLI/browser and server-observed simulator integration.
> Next connect participant-driven city recovery; do not relabel the scenario
> baseline as an achievement. Reuse the existing services, validators and tests.
> Preserve approved artwork, presentations, certificates and unrelated working
> changes. Keep intended deployment, clean VS Code rehearsal and the human pilot
> explicit rather than marking the entire event ready from synthetic fixtures.

## 9. Accepted execution plan: local first

**Local integration stage: complete.** The status below applies to the local
deliverables, not to the full workshop-readiness criteria in Phase 8.

The first execution environment is local, without provisioning cloud resources
or touching an existing event. Preserve the working-tree changes to artwork,
presentations, certificates and historical video materials.

Code inspection at the start of this pass confirmed that the API entry point
registered configuration and health routes only. Connecting the existing domain
services to the CLI and Command Center is therefore a prerequisite, not merely
a documentation correction.

| Step | Status | Work | Completion evidence |
| --- | --- | --- | --- |
| L01 | Complete | Align the Mission 1 starter identifier and output contract. | A synthetic example matches the published schema and actual mission validator; invalid examples still fail. |
| L02 | Complete locally | Compose the existing event, mission, validation and scoring services behind an explicitly local API. | An instructor creates and opens an event; a participant joins, starts Mission 1 and submits evidence over HTTP. Authentication, event scope and duplicate handling are exercised. |
| L03 | Complete locally | Complete participant feedback and connect the public display. | CLI output distinguishes envelope checks from server evaluation; the public view changes from actual evaluated state and exposes only allowlisted fields. No invented achievement data is shown as live. |
| L04 | Complete locally | Extend the verified path through Missions 2-5. | Reproducible decisions and contracts are exercised through the same integration. S01 now supplies actual server-observed tool receipts; instructor solutions remain separate from starters. |
| L05 | Guide delivered | Consolidate the participant guide and local operating instructions. | Setup, authoring references, joining, submissions, feedback and recovery are documented. The clean human VS Code rehearsal remains pending under L08. |
| L06 | Complete locally | Implement local readiness scenarios. | End-to-end, failure/recovery, isolation and 50-participant scenarios produce repeatable evidence, explicitly distinguished from deployed-service load and accessibility evidence. |
| L07 | Complete | Reconcile the readiness records. | Gates and roadmap items are updated only where their complete acceptance criteria have been demonstrated. Remaining limitations are explicit. |
| L08 | Pending | Rehearse, pilot and decide public readiness. | Human-led rehearsal, a controlled pilot of up to 20 participants, deployed-environment checks and a recorded go/no-go decision. These are not replaced by local automated checks. |

The initial local integration is a rehearsal environment, not a production
deployment or a claim that Azure persistence, SignalR delivery, access control
or event-day recovery have been certified. Public release remains a separate
follow-up.

L01-L03 have local implementation and real HTTP/CLI/browser evidence. L04 has
canonical contracts, a reproducible Mission 2 scenario and five server-evaluated
decision packages; S01 adds actual tool calls, but not human Copilot authoring.
L05 has a consolidated local guide; a clean human VS Code rehearsal remains pending. L06 has local
automated scenarios, not the full event-quality program. L08 is not executable
without the human rehearsal/pilot and intended deployment.
L07 has reconciled the handoff, presentation gates and Phase 8 evidence without
checking off the broader event-readiness criteria.

Use `pnpm build:local`, `pnpm start:local`, `pnpm test:workshop` and
`pnpm test:workshop:load` as documented in the local guide. The normal production
server remains unchanged; do not deploy the local in-memory entry point.

## 10. Next technical tasks

| Task | Status | Required outcome |
| --- | --- | --- |
| S01 - Simulator evidence | Complete locally | Authenticated CLI/HTTP operations invoke the existing city simulators. The server snapshots event/unit/mission-scoped observations; validators 1.1.0 reject invented/foreign receipts, verify shelter/route support and bound proposed resources by observed inventory. The five-mission journey uses these actual calls. |
| S02 - City recovery | Pending | Derive public recovery from validated participant decisions without counting retries twice or presenting the scenario baseline as an earned effect. |

## 11. Continuing on another computer

The portable work includes source, lockfile, guides, approved still artwork,
presentations, certificate templates, captions and audio. Heavy local video
drafts are ignored by Git and are not needed for the workshop. Small historical
fallback videos already tracked by earlier commits are unchanged; the removed
opening fallback is no longer falsely marked as an approved distributed asset.
Do not regenerate video assets merely to build or start the local environment.

After cloning or updating `main`, use Node.js 24, pnpm 11.27.0 and PowerShell 7:

```powershell
pnpm install --frozen-lockfile
pnpm build:local
```

Follow `docs\local-workshop.md` to generate a new local instructor token, start
the API and dashboard, and create a fresh rehearsal event. Credentials and event
state are deliberately not transferred between computers. For browser scenarios,
install Chromium using the command in that guide. Resume at S02, not at L01.
