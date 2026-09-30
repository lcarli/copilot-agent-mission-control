# Operation Lighthouse - Workshop Readiness Handoff

Snapshot: **2026-09-30, local integration complete; hosted adapters exercised offline and Linux images verified in CI**

Next objective: **complete the approved local-quality and production-preparation deliveries, without Azure provisioning; keep human rehearsal explicit**.

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
- The accepted S02 recovery model is a **pedagogical indicator based on
  validated decisions**, not executed simulator actions or a points conversion.
  Keep this distinction visible in the public display and facilitation.
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
| R04 - Public projection | **Resolved locally; hosted transport prepared offline.** Canonical recovery remains separate from points. The SignalR browser client rejects foreign/stale frames and reconciles HTTP snapshots; HTTP failure hides results. | Rehearse the projector and verify actual SignalR permissions, CORS and delivery. Do not present decision coverage as executed city operations. |
| R05 - Validation language | **Resolved locally.** CLI output distinguishes envelope checks, submission and evaluated server feedback; failed required rules produce a nonzero exit. | Preserve this distinction in live facilitation. |
| R06 - End-to-end integration | **Partial.** The five-mission HTTP journey uses actual CLI receipts and drives public recovery/finale/late-join behavior. Durable reconstruction and the hosted browser path are exercised with external-service doubles. | Rehearse actual Copilot/specialist authoring and verify persistence, identity and real-time delivery against the intended deployment. |
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
| TASK-801 | Extend the local instructor/participant scenarios to clean VS Code/Copilot authoring and the intended deployment's failure/recovery paths. |
| TASK-802 | Extend the 50-unit local scenario to the intended APIs, simulators, SignalR and classroom dashboard behavior. |
| TASK-803 | Complete the planned authorization, event isolation, rate-limit, payload-limit and secret-handling validation. |
| TASK-804 | Complete keyboard, contrast, reduced-motion and screen-reader checks, plus applicable caption requirements. |

`tests\e2e` implements real browser/CLI and five-mission HTTP scenarios.
The load command now runs the original 50-unit Mission 1 scenario and an
expanded five-mission scenario with 50 logical HTTP units and one real public
browser. The expanded run produced **250 core passes**, **550 scoped simulator
observations**, **100 planned retryable failures**, and **250 recovery
contributions**. Its **2,729 measured driver requests** exclude browser polling;
the highest phase p95 was **2,670 ms**, below the 5,000 ms local regression
limit. Phase-specific limits include registration and reconnects.

This is not a deployed-service SLO or proof of Azure/SignalR capacity, 50 real
browser clients or human authoring. TASK-800 through TASK-804 remain open for
their full platform-wide scope.

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
> working local HTTP/CLI/browser, server-observed simulator integration and
> versioned decision-recovery model. Next rehearse actual participant authoring
> from a clean VS Code/Copilot setup. Preserve the distinction between the
> pedagogical indicator and executed simulator actions. Reuse the existing
> services, validators and tests.
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
`pnpm test:workshop:load` as documented in the local guide. The normal server
now assembles the hosted adapters and requires explicit configuration plus
usable startup dependencies; do not deploy the local in-memory entry point.

## 10. Next technical tasks

| Task | Status | Required outcome |
| --- | --- | --- |
| S01 - Simulator evidence | Complete locally | Authenticated CLI/HTTP operations invoke the existing city simulators. The server snapshots event/unit/mission-scoped observations; validators 1.1.0 reject invented/foreign receipts, verify shelter/route support and bound proposed resources by observed inventory. The five-mission journey uses these actual calls. |
| S02 - City recovery | Complete locally | Accepted pedagogical model, policy `1.0.0`: approved decisions update attributed districts and the collective indicator; one replaceable contribution per event/unit/mission prevents farming. API feedback and the public browser expose the source, policy, denominator and current 80% finale threshold. |

S02 does **not** execute allocations or mutate simulator service states.
The one-unit synthetic journey reaches **84%** from a **58%** baseline; a late
second unit with no contributions recalculates it to **71%**. Replanning can
redistribute coverage, and finale readiness is deliberately reversible.
Advanced human-approval evidence remains advanced, not a new core requirement.
See [the complete policy](local-workshop.md#decision-recovery-policy-100).

The next step is R08 and L08: a clean, human-led VS Code/Copilot authoring
rehearsal using the participant guide. It requires the actual participant
account, approved tools and facilitator observation; synthetic fixtures do not
complete it. Intended deployment and the broader quality/pilot gates remain open.

### Approved continuation: sequential technical deliveries

The user authorized local-quality work and production integration preparation,
with a separate commit per delivery and **no Azure provisioning or deployment**.
The accepted first hosted profile uses one API replica, durable state and
Azure SignalR Serverless for the existing Node backend. Multi-replica high
availability is not claimed. The implementation plan and official-service
references are recorded in
[the preparation extension](../.azure/deployment-plan.md#11-workshop-runtime-preparation-extension).

| Step | Status | Bounded deliverable |
| --- | --- | --- |
| S03 - Classroom-scale local scenarios | Complete locally | Fifty logical units complete all five missions alongside a real public browser. Actual scoped receipts, planned failures, phase latency, concurrent replays, borrowed-receipt rejection, reconnects, inventory preservation and public-data isolation are exercised. |
| S04 - Operational guardrails | Complete locally | Fixed-window budgets by IP, authentication entry, verified unit/event and instructor; bounded queues and tracking tables; explicit 429/503 with Retry-After. The 50-unit five-mission workload remains within budget. These are single-process controls, not distributed protection. |
| S05 - Accessibility | Complete for the local automated scope | Axe WCAG A/AA rules cover real setup/mission/public/error states in three locales and both themes. Keyboard, focus, narrow reflow and reduced motion are exercised; language metadata, progress labels and contrast were corrected using existing theme tokens. Manual screen-reader/projector and full-event checks remain open. |
| S06 - Runtime composition | Complete for the shared composition | Local and hosted builders share repository, state, asynchronous identity, transaction and health ports. Local access remains loopback-only; the hosted builder rejects a local runtime. S08 supplies normal-server hosted assembly. Existing HTTP/browser/CLI behavior is preserved. |
| S07 - Durable state | Complete for adapter/offline scope | Cosmos SDK adapter and versioned per-event documents commit state, encrypted idempotency and pending publication with a head ETag. Five-mission reconstruction, lost acknowledgments, rollback and concurrent revisions are covered by an on-disk transaction double and SDK-boundary tests. Live Cosmos, retention/restore operations and Azure latency remain open. |
| S08 - Identity and real time | Complete for adapter/offline scope | Single-tenant Entra ownership/roles, explicit memory-only MSAL sign-in, pinned Key Vault signing and Blob descriptor, scoped SignalR, conditional durable publication and exact uncertain-action retries. The real browser exercises synthetic identity and SignalR protocol frames; live Entra/MFA/consent/Cosmos/Blob/Key Vault/SignalR verification remains open. |
| S08b - Hosted packaging | Complete for image/offline scope | Non-root API/dashboard Linux images, isolated production dependencies, compiled static proxy, exact descriptor generation, typed single-replica/Serverless Bicep and guarded bootstrap/artifact/promotion stages. [Container run 36670155593](https://github.com/lcarli/copilot-agent-mission-control/actions/runs/36670155593) passed for `a350020`; the lockfile correction preserves versions/integrities. No Azure publication or deployment was performed. |
| S09 - Rehearsal operations | Pending | Reconcile the operating guides and make clean-setup authoring, full rehearsal and pilot steps executable by the facilitator. |
| S10 - Preparation validation | Pending | Record applicable offline evidence and keep live-service and human gates open. |

These technical deliveries do not replace R08/L08. The S02 commit has already
been published; subsequent commits must preserve the excluded video drafts
and the approved visual/presentation materials.

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
state in local rehearsal are deliberately not transferred between computers. For browser scenarios,
install Chromium using the command in that guide. S01 and S02 are complete
locally; resume at the clean authoring rehearsal, not at L01.
