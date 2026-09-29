# Operation Lighthouse - PowerPoint production plan

Status: **both PowerPoint files produced; event rehearsal and live-demo readiness gates remain open**  
Selected structure: **two decks: public workshop + private facilitator guide**  
Language: **English throughout**  
Production order: **brand kit -> presentations -> rehearsal -> videos**

This is the production blueprint for the full-day workshop, not a presentation
about making a trailer. Participants learn to build increasingly capable agents
in VS Code while contributing to a shared simulated response in Port Azure.

The presentations must work without video. Video production happens last,
after the learning flow, slide content, timing and live-demo boundaries are
settled. Existing video prototypes are not dependencies for this work.

## 1. Deliverables and boundaries

| Deliverable | Audience | Purpose | Size |
| --- | --- | --- | --- |
| `OL-WORKSHOP-en.pptx` | Participants; projected in the room | Story, teaching, mission launches, lab instructions, debriefs and closure | 60 slides in 11 sections |
| `OL-FACILITATOR-en.pptx` | Instructor and support staff only | Delivery schedule, demo cues, coaching, contingencies and operational gates | 18 reference slides |

The files and their editable generation sources are in
`campaigns\operation-lighthouse\presentations\`.
See the [presentation delivery instructions](../../campaigns/operation-lighthouse/presentations/README.md)
for download links, public/private usage, navigation and rebuilding.
Producing the files does not close the operational readiness gates in section 10.

Use one shared visual theme across the two files. Keep each public section
independently navigable, but do not maintain seven separate mission decks.
That would add file switching and increase content drift.

The facilitator deck is not a participant appendix and must not be projected.
Do not rely on hidden slides to protect answer keys. Never place real tokens,
passwords, participant contact information or private telemetry in either file,
including speaker notes.

No application theme migration, mission-code fix, new video or translated deck
is included in this presentation deliverable.

## 2. The experience we are designing

**Participants are the protagonists. Their agents are how they affect the
world.** Maya, Jules, Aurora and the Mission Commander provide context and
constraints; they do not solve the missions on participants' behalf.

The narrative is not "a storm gets worse for an hour." It is a sequence of
capability gaps that participants learn to close:

| Situation in Port Azure | Learning transition | Evidence of learning |
| --- | --- | --- |
| Reports arrive as unstructured noise | Give an agent a role, rules and an output contract | A structured incident assessment |
| Reports disagree | Ground claims and preserve uncertainty | Facts, assumptions, unknowns and cited evidence |
| Static context becomes stale | Consult tools and handle failure | A supported route/shelter recommendation and a tool trace |
| One agent owns too much | Define specialists and explicit handoffs | Bounded roles, preserved evidence and independent review |
| Incidents and constraints overlap | Orchestrate a response and audit decisions | A prioritized, reviewed recovery package |

Every mission follows the same recognizable rhythm:

**Situation -> capability -> small demonstration -> build -> evidence ->
debrief -> visible consequence.**

Early demonstrations expose the mechanics without supplying a complete
solution. Scaffolding decreases across the five missions. Core objectives
remain achievable by beginners; advanced objectives extend the same problem
rather than creating a competing workshop.

### Six building blocks to distinguish

| Building block | Teaching definition | First explicit treatment |
| --- | --- | --- |
| Instructions | Standing role, boundaries and response requirements | P04, P12 |
| Context | Task information and evidence supplied for a decision | P20, P22 |
| Tools | Explicit interfaces for obtaining data or performing an allowed action | P30-P33 |
| Skills | Reusable procedural guidance for a recurring task; not the same as a tool or a specialist persona | P30, P58 |
| Specialist agents | Bounded responsibilities with declared inputs and outputs | P39-P41 |
| Orchestration | Coordination of work, dependencies, review and recovery | P48-P53 |

These are conceptual definitions, not a promise about a particular extension's
current UI. Verify the supported VS Code/GitHub Copilot authoring workflow
before producing screenshots or step-by-step click instructions.

The TypeScript starters are scaffolding, not a claim that passing a mission
requires one SDK, programming language or agent architecture.

## 3. Timing and navigation

The agenda below preserves [PLAN.md, section 6](../../PLAN.md).
It totals **455 minutes: 7 hours 35 minutes**, including a 60-minute lunch
and a 15-minute break. Active workshop time is **380 minutes**.

An illustrative 09:00 start would finish at 16:35. Use the actual event start
time when authoring return-time slides; do not bake a guessed schedule into
the reusable master.

| Section | Slides | Duration | Teaching outcome |
| --- | --- | ---: | --- |
| Opening and recruitment | P01-P06 | 15 min | Understand the mission and the learning journey |
| Setup and registration | P07-P10 | 15 min | Connect a unit and understand the feedback loop |
| Mission 1: Signal in the Storm | P11-P17 | 50 min | Produce structured incident assessments |
| Debrief 1 | P18-P20 | 15 min | Separate an output contract from evidence quality |
| Mission 2: Ground Truth | P21-P27 | 55 min | Make evidence-bounded recommendations |
| Lunch | P28 | 60 min | Pause without losing the narrative thread |
| Mission 3: Connected City | P29-P36 | 60 min | Use tools with supported decisions and safe failures |
| Break | P37 | 15 min | Reset before specialist design |
| Mission 4: Specialist Network | P38-P45 | 65 min | Preserve evidence across bounded specialist work |
| Mission 5: Restore the Lighthouse | P46-P53 | 75 min | Submit a coordinated, auditable recovery package |
| Demonstrations, recognition and finale | P54-P60 | 30 min | Explain what was learned and transfer it to real work |

Sixty slides do not mean sixty lecture slides. Five lab-hold slides account
for 176 minutes; other slides support pair discussions, live demonstrations
and submission review. Keep lab instructions visible while participants work.

Slide times are delivery budgets, not automatic slide-advance settings.
Use native PowerPoint sections, stable IDs in notes and a clearly marked
return point after each live-demo switch. The instructor can reuse P01 as an
untimed lobby screen before the scheduled opening.

## 4. Visual and editorial system

Follow the [visual identity guide](../brand/visual-identity.md). Use logos from
`docs\brand\exports\`, not screenshots or earlier generative drafts.

| Element | Direction |
| --- | --- |
| Canvas | 16:9 widescreen; shared slide master |
| Brand hierarchy | Operation Lighthouse leads campaign moments; Mission Control is the platform endorsement |
| Dark scenes | Control Navy `#102A43`, white type and the appropriate reversed logo |
| Teaching scenes | Warm Paper `#F7F4EF`, navy type, restrained teal or amber emphasis |
| Primary typography | IBM Plex Sans; semibold headings and clear body text |
| Technical labels | IBM Plex Mono; never a full terminal screenshot as the only explanation |
| Projection sizes | Titles 36-44 pt; body generally 24-28 pt; important diagram labels at least 20 pt |
| Spacing | At least 0.5 in outer margins and deliberate 0.3-0.5 in content gaps |
| Narrative photography | The selected characters and Port Azure references; reuse identities rather than generating new people |
| Teaching graphics | Editable shapes, diagrams and annotations rather than image-generated text |
| Motion | Static-first; simple fades only when they clarify progression; no essential animation |
| Status | Label or shape plus color; never color or sound alone |

The initial delivered files use **Segoe UI and Consolas** as local production
fallbacks because IBM Plex and Aptos were unavailable in the authoring
environment. The brand typography remains the target for future editions.
Approved logo lettering is unchanged; fonts are not embedded in the decks.

Use one recurring visual idea: **separate signals becoming a reviewed
decision**. Change the composition to suit the learning task rather than
repeating one dashboard layout on every slide.

Do not add decorative lines under titles, glossy 3D logos, mission patches,
neon circuitry or military framing. Do not add both logos at equal visual
weight to every slide.

### Reusable slide layouts

| Layout | Use | Key constraint |
| --- | --- | --- |
| Campaign poster | Opening, mission transitions, closure | One message and one dominant image or symbol |
| Operational briefing | Situation, stakes and mission objective | Separate narrative context from the scored requirement |
| Concept diagram | Instructions, tool flow, handoffs and orchestration | Editable labels and one clear reading order |
| Evidence comparison | Facts versus claims, failed versus improved output | Show the difference; do not fill the slide with JSON |
| Demo cue | Transition to VS Code or the public display | State what the audience should observe |
| Mission canvas | Hands-on work | Objective, inputs, core deliverable, how to submit, optional stretch |
| Debrief | Reflection and peer explanation | A question and a concrete artifact, not a wall of conclusions |
| Recognition | Evidence, reliability, collaboration and recovery | Recognize behaviors rather than just rank or speed |

Every slide gets a meaningful visual element. That may be a small contract
diagram or evidence comparison; it does not have to be a decorative photo.

## 5. Public workshop deck: slide-by-slide blueprint

The titles below are intended English slide titles. The content column
specifies what must be authored, not a paragraph to paste verbatim onto the
slide. Keep detailed explanations in appropriate speaker notes or lab files.

### Opening and recruitment - 15 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P01 | Operation Lighthouse | 1 | Campaign poster and platform endorsement. Welcome participants as Lighthouse Units. A still image works now; a future opening clip may occupy this same minute. |
| P02 | A city full of signals. A shortage of certainty. | 2 | Introduce Port Azure's storm, interrupted services and conflicting information. Use a canonical city map with three restrained incident callouts, not disaster spectacle. |
| P03 | Your unit changes what happens next | 2 | Show the loop from participant to agent to validated decision to shared world. Introduce the instructor, Maya, Jules and Aurora as supporting roles. |
| P04 | What makes an agent useful here? | 3 | Explain input, instructions, context, optional tools, output and review with one compact diagram. Distinguish the agent from the city simulator and validation service. |
| P05 | Five missions. Increasing independence. | 4 | Show the five capability steps and shrinking scaffolding. Ask participants which step is new to them; experienced participants see the advanced track. |
| P06 | Evidence before action | 3 | Establish reliability, explainability, collaboration and human judgment. Show core versus advanced objectives and make clear that speed is not the central measure of success. |

### Setup and registration - 15 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P07 | Ready your workspace | 3 | Show a concise VS Code, Copilot access, repository and preflight checklist. Link to the prepared lab instructions instead of teaching installation from a projected terminal. |
| P08 | Join Mission Control | 4 | Configure the event endpoint, select English for this delivery and join a unit. Use safe example values; enter real credentials privately. |
| P09 | Find your unit | 4 | Demonstrate connectivity and the unit's presence on the verified public display. Registration is not mission success; label any rehearsal snapshot as a demonstration. |
| P10 | Build. Test. Validate. Submit. | 4 | Explain the participant command loop with a small flow diagram. Distinguish local evidence-envelope validation from the server's mission evaluation and feedback. |

### Mission 1: Signal in the Storm - 50 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P11 | Mission 1: Signal in the Storm | 2 | Maya's briefing: turn an incomplete incident report into a usable assessment. Use a static character/incident composition and a single mission objective. |
| P12 | Give the agent a job and a boundary | 4 | Contrast a vague request with a bounded role, input, output and "do not invent" rule. Highlight the changed instructions, not a complete solution. |
| P13 | Make the response inspectable | 3 | Show category, severity, location, affected services and missing information as a contract diagram. Use a reconciled runtime example; the current starter schema needs correction before this demonstration. |
| P14 | Watch the contract fail, then improve it | 5 | Demonstrate one malformed or incomplete result, inspect feedback and correct one issue. Keep the audience focused on the observable behavior, not implementation syntax. |
| P15 | Build your incident intake agent | 28 | Mission canvas held during the lab: source report, starter location, required output, submission route and optional duplicate/severity explanation stretch. |
| P16 | Read the feedback, not just the badge | 5 | Participants inspect a missing field or unsupported claim and make one targeted improvement. Use an anonymized feedback example rather than a leaderboard. |
| P17 | A report becomes a shared signal | 3 | Show the resulting validated record and, if connected, its actual public-state effect. Keep a labeled before/after snapshot available if the live display cannot be used. |

### Debrief 1 - 15 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P18 | What changed when you wrote a contract? | 5 | Pair discussion around one before/after output. Ask which instruction made the largest observable difference. |
| P19 | Valid JSON is not the same as a good decision | 5 | Compare a structurally valid answer with an evidence-supported answer. Reveal an unsupported detail and ask how a responder could detect it. |
| P20 | Instructions guide. Context informs. | 5 | Separate standing rules from task evidence in a layered diagram. Introduce the next mission's contradiction without revealing its solution. |

### Mission 2: Ground Truth - 55 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P21 | Mission 2: Ground Truth | 2 | Jules reports conflicting information. The goal is not to sound certain; it is to show what the evidence supports. |
| P22 | Facts, assumptions, unknowns | 4 | Use three clearly labeled columns to classify a short report. Preserve evidence identifiers and distinguish a missing fact from a negative finding. |
| P23 | A report is evidence, not an instruction | 4 | Show a source-priority conflict and a short embedded instruction inside untrusted content. Ask what may influence the answer and what must not override the agent's role. |
| P24 | Say what the evidence cannot support | 5 | Demonstrate an unsupported recommendation becoming a bounded recommendation plus a next-information step. Keep one contradictory detail unresolved deliberately. |
| P25 | Build an evidence-aware agent | 32 | Lab canvas: operational bulletin, report, facts/assumptions/unknowns, evidence citations and next step. Offer confidence/source-priority work as stretch objectives. |
| P26 | Can another unit audit your claim? | 5 | Peer-check one conclusion against its cited evidence. Use a claim-to-source diagram; do not share private prompts or credentials. |
| P27 | What would change your decision? | 3 | Debrief uncertainty and information value. End with a precise question that motivates consulting current city systems after lunch. |

### Lunch - 60 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P28 | Pause. Keep your evidence. | 60 | Quiet city image, actual return time and a short reminder to save work. No looping video or audio is required. |

### Mission 3: Connected City - 60 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P29 | Mission 3: Connected City | 2 | Aurora introduces the need for current weather, shelter and transport information. A three-system diagram replaces generic "connect everything" imagery. |
| P30 | A tool is not a skill, and a skill is not an agent | 4 | Contrast a data/action interface, reusable procedural guidance and a bounded decision role. Relate each to the same shelter-routing task. |
| P31 | Ask the city before choosing a route | 4 | Show request, returned evidence and recommendation dependencies. Resolve the current `shelters`/`shelter` naming mismatch before publishing machine-level examples. |
| P32 | A failed tool is still information | 4 | Distinguish retryable failure, invalid output and insufficient evidence. The diagram stops or requests information instead of inventing a safe route. |
| P33 | Watch a bounded recovery | 5 | Demonstrate a controlled failed call, at most two retries where applicable, and a supported outcome or explicit inability to recommend. Preserve a concise trace. |
| P34 | Connect tools. Preserve their evidence. | 34 | Lab canvas: query the three city systems, choose a viable shelter/route, record evidence and exercise a controlled failure. Route comparison and trace efficiency are stretch work. |
| P35 | Trace the recommendation backward | 4 | Inspect a recommendation, evidence IDs and tool results in reverse order. A live call alone is not proof that its result supports the answer. |
| P36 | The route is a conclusion, not a guess | 3 | Debrief the constraint that ruled out an alternative. Show only actual validated world effects, or an explicitly labeled example. |

### Break - 15 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P37 | Return ready to delegate | 15 | A calm command-center still, the actual return time and a reminder to preserve tool/evidence interfaces for the next mission. |

### Mission 4: Specialist Network - 65 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P38 | Mission 4: Specialist Network | 2 | Maya frames the coordination problem: one agent now owns too many decision domains. |
| P39 | Divide responsibility, not just prompts | 4 | Sketch at least three bounded specialist roles. Show responsibility, input and output; distinguish a role name from an enforceable boundary. |
| P40 | A handoff is a contract | 4 | Visualize `sourceRole`, `targetRole`, `evidenceIds` and `payload`. Trace one evidence identifier across a sender and recipient. |
| P41 | Review is not self-approval | 4 | Add an independent reviewer. Show proposer and reviewer separately, with disagreement and human escalation as explicit branches. |
| P42 | Watch evidence survive a handoff | 5 | Demonstrate one lost-evidence defect and a corrected handoff. Show the topology only if its data is connected or clearly marked as a demonstration. |
| P43 | Build your specialist network | 38 | Lab canvas: three or more roles, bounded contracts, explicit routing, preserved evidence and independent review. Offer concurrent analysis and disagreement handling as stretch work. |
| P44 | Follow one decision across the network | 5 | Units explain one complete path and identify who reviewed it. Use an evidence trail rather than an impressive but unexplained graph. |
| P45 | More agents require clearer boundaries | 3 | Debrief overhead, ownership and review. Prepare participants to choose only the specialists the final incident actually needs. |

### Mission 5: Restore the Lighthouse - 75 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P46 | Mission 5: Restore the Lighthouse | 3 | The Mission Commander introduces overlapping grid, communications and storm-surge problems. Make the recovery objective explicit without prescribing the architecture. |
| P47 | Resources are finite. Priorities matter. | 4 | Show the current scenario's resource and destination constraints. Use canonical simulator values, not invented generator counts or capacities. |
| P48 | Coordinate the response, not just the agents | 5 | Diagram evidence collection, dependencies, specialist work, allocation, independent review and submission. Contrast orchestration with an unordered collection of answers. |
| P49 | Build a decision package someone can challenge | 4 | Show the auditable package: assessment, evidence, actions, allocations, handoffs, review and audit metadata. Explain high-impact approval without silently changing core versus advanced scoring. |
| P50 | Restore essential services | 44 | Open-ended lab canvas: brief, constraints, success criteria and submission contract. No starter solution or fixed multi-agent topology is supplied. |
| P51 | When the situation changes | 5 | Run an instructor-approved modifier only when the room is ready; otherwise inspect a hypothetical change. Keep re-planning stretch work from becoming an unannounced core requirement. |
| P52 | Submit what others can verify | 5 | Review the final package, separate missing evidence from formatting problems and submit. Keep server feedback and independent review visible as distinct checks. |
| P53 | Recovery is a collective result | 5 | Inspect the actual recovery state and remaining risks. Trigger the recovery finale only when the event's condition is met; otherwise acknowledge partial recovery honestly. |

### Demonstrations, recognition and finale - 30 minutes

| ID | English slide title | Minutes | Content and visual treatment |
| --- | --- | ---: | --- |
| P54 | What your units changed | 3 | Show an anonymized evidence-backed progress snapshot. Do not substitute preloaded demonstration numbers for participant outcomes. |
| P55 | Show the decision, not the whole codebase | 10 | Three short unit demonstrations plus transitions: problem, evidence, decision, review. Hold one structured demonstration canvas on screen. |
| P56 | Different implementations. Shared standards. | 4 | Compare two legitimate approaches by behavior and tradeoffs. Avoid presenting the instructor's architecture as the only correct answer. |
| P57 | Recognize how the work was done | 4 | Recognize evidence, reliability, collaboration and safe recovery using the brand's award language and shapes. Do not make speed the principal award. |
| P58 | Six building blocks. One operating model. | 4 | Revisit instructions, context, tools, skills, specialists and orchestration. Ask participants to connect each block to an artifact they built. |
| P59 | Take the practice beyond Port Azure | 3 | Give links to the public lab material, repository and a concrete next exercise. Invite a short reflection on where evidence and review matter in participants' work. |
| P60 | Keep the lighthouse in view | 2 | Close with the campaign identity and a human-centered message. Use a static conclusion now; a later finale clip replaces part of this budget, never extends it. |

## 6. Private facilitator deck

This is an operational reference, not another 18-slide talk added to the
agenda. Its content is available before the event and on the instructor's
private display during delivery.

| ID | English slide title | Operator purpose and content |
| --- | --- | --- |
| I01 | Facilitator only | File boundary, roles and projection rules. Explain which public deck sections to use; include no real secrets. |
| I02 | The day at a glance | The 455-minute schedule, public slide ranges, core outcomes and demonstration switches. |
| I03 | Preflight the room | Projector, font rendering, VS Code, participant package, network, audio-off delivery and support responsibilities. |
| I04 | Go / no-go before projection | Readiness gates from section 10; distinguish a verified integration from a placeholder UI or a successful unit test. |
| I05 | Control the show | Section navigation, lab holds, return points after demos, public versus private screens, pause/resume and visible change announcements. |
| I06 | Registration triage | Config, registration, authentication and connectivity checks. A blocked unit gets help or a stated fallback, not an invented successful connection. |
| I07 | Coach Mission 1 | Correct contract after reconciliation, likely missing-field errors, a small teaching demonstration and three levels of hints. Reference P11-P20. |
| I08 | Coach Mission 2 | Evidence priorities, fact/assumption/unknown examples, unsupported conclusions and untrusted instructions. Reference P21-P27. |
| I09 | Coach Mission 3 | Canonical tool names, controlled failure fixture, bounded retries, evidence trace and valid alternatives. Reference P29-P36. |
| I10 | Coach Mission 4 | Responsibility boundaries, explicit handoffs, independent reviewer and when concurrency is genuinely useful. Reference P38-P45. |
| I11 | Coach Mission 5 | Current resource constraints, auditable plan structure, reviewer expectations and core/advanced boundary. Reference P46-P53. |
| I12 | Support mixed experience levels | Conceptual hint -> implementation direction -> partial diagnostic example. Keep beginners on the core path and offer meaningful stretch work without public stigma. |
| I13 | Introduce a change deliberately | Approved incident-modifier catalog, applicability, announcement, reset plan and a decision not to inject when readiness is insufficient. |
| I14 | Recover a failed demonstration | One bounded diagnosis window, a clearly labeled snapshot/fixture fallback and a return-to-slide cue. Do not present fallback output as live validated work. |
| I15 | Recover the schedule | Compress optional demonstrations or advanced branches first. Preserve core build time, review and closure; announce any revised expectations. |
| I16 | Evaluate and recognize | Actual configured scoring, qualitative recognition and the planning targets of 85% for M1-M3, 60% for M4 and 40% for M5 core. Targets are goals, not claimed results. |
| I17 | Decide how the story closes | Distinguish achieved recovery from partial recovery. Acknowledge remaining work; never fabricate a finale unlock or score. |
| I18 | Close and reset the event | End submissions through the verified operator workflow, export only appropriate results, handle local artifacts safely and prepare the next delivery. |

### Notes model

Public slide notes contain the learning point, a short spoken transition,
the audience question, the demonstration cue and the source reference.
They must remain safe to distribute with the participant deck.

Facilitator notes add timing cues, anticipated answers, common failure modes,
hint progression, operator actions, contingency steps and the return slide.
Keep any answer-bearing examples in this file rather than the public deck.

Each technical slide must identify its source contract or fixture in notes.
A descriptive screenshot with no reproducible source is insufficient for a
step-by-step lab instruction.

## 7. Demonstration plan

| Demo | Public slides | What participants should observe | Prepared fallback |
| --- | --- | --- | --- |
| D01: Join and locate a unit | P08-P10 | Configuration, registration, connectivity and the public record are different steps | Redacted connection sequence labeled "Demonstration"; resume live work after support resolves the issue |
| D02: Contract feedback | P14 | A specific defect leads to specific feedback and a targeted correction | A paired malformed/corrected fixture with the actual validator response |
| D03: Evidence boundary | P24 | An unsupported conclusion becomes an explicit boundary and next-information request | One report, bulletin and annotated output pair |
| D04: Tool recovery | P33 | A controlled failure is recorded and recovery is bounded | A saved, credential-free tool trace with its scenario/version label |
| D05: Evidence handoff | P42 | The recipient receives source evidence and a separate reviewer assesses the decision | An editable sequence diagram and matching handoff artifact |
| D06: Coordinated recovery | P51-P53 | Changed evidence, re-planning, review, submission and actual recovery state | A labeled scenario walkthrough, with no claim of a live finale unlock |

Prepare the successful path and one useful failure path for each demo.
Do not create a long pre-recorded technical video as a prerequisite: static
evidence, a short live demonstration and a diagram are enough for the first
deck rehearsal.

### Participant command surface

The current CLI declares these command families in
[`program.ts`](../../apps/participant-cli/src/program.ts):

```text
mission-control config set --api-url <event-api-url> --locale en
mission-control join --event-code <event-code> --name <unit-name> --locale en
mission-control connectivity
mission-control diagnose
mission-control mission start <mission-id>
mission-control mission test <mission-id>
mission-control mission validate <mission-id> --evidence <path>
mission-control mission submit <mission-id> --evidence <path>
mission-control mission hint <mission-id>
```

This is an authoring reference, not a tested installation/runbook for a released
participant package. Confirm executable packaging, working directory, local
test setup and event configuration before putting runnable commands on slides.
The repository package is private; do not invent a public npm installation step.

`mission validate` currently checks the evidence envelope locally. It is not
equivalent to running the server's mission validator or receiving a passed
mission result. P10 and the demonstration narration must preserve that distinction.

## 8. Asset plan

| Asset | Availability and next action |
| --- | --- |
| Platform and campaign logos | Ready in `docs\brand\exports\`; use the appropriate light/dark or monochrome file |
| Brand-kit overview | Ready in `docs\brand\brand-kit-preview.png`; use for authoring reference, not as a slide-sized logo |
| Port Azure base map | Existing presentation PNG is available under campaign media; check its labels and geography against `src\world.ts` before use |
| Commander, Maya and Jules | Existing campaign portraits are available. Compare them with the selected Flow references and choose one consistent set; do not mix generations casually |
| Additional command-center/harbor stills | Reuse approved references when locally available; export selected Flow-only images before embedding. Do not assume a Flow asset name is a local file |
| Technical diagrams | Create as editable PowerPoint shapes from the actual contracts; no generative diagram text |
| VS Code and public-display captures | Capture only after the readiness gates are resolved; redact and label real versus demonstration state |
| Recognition visuals | Existing award backgrounds are available. Adapt only if they fit the current palette and remain readable |
| Videos | Deferred. Every intended video location has a complete still/text alternative |

Do not ask an image generator to reproduce brand lettering, a terminal window,
a schema or a map's canonical labels. Compose those elements as editable text
and graphics.

## 9. Video slots - reserved, not commissioned

This section defines integration boundaries only. It is not a storyboard or
a request to generate clips now.

| Future insertion point | Reserved budget | First-deck treatment |
| --- | --- | --- |
| P01 opening | Up to 60 seconds, within the 15-minute opening | Campaign poster plus instructor introduction |
| P11/P21/P29/P38/P46 mission introductions | Optional; duration decided after slide rehearsal and contained in each briefing budget | Character still plus a concise spoken mission brief |
| P60 conclusion | Within the two-minute closing slide budget | Static final composition and instructor conclusion |

Do not produce five briefing videos automatically just because slots exist.
After rehearsing the decks, decide which moments benefit from video and which
are better delivered live.

The user-selected opening target remains 60 seconds. Plan its final shot list,
dialogue, captions and editing only after the presentation structure is stable.
Do not resume the older mandatory-frame-pair workflow as a prerequisite.

## 10. Readiness gates before technical slide capture

These gates were recorded before technical capture. The status below was
updated on 2026-09-29 after the local readiness pass; it does not certify a
deployed workshop or actual Copilot/tool authoring. See the
[local rehearsal guide](../local-workshop.md) and
[readiness handoff](../workshop-readiness-handoff.md).

| Gate | Current evidence | Required outcome before demo capture |
| --- | --- | --- |
| R01: Mission 1 identity and contract | **Resolved locally:** `signal-in-the-storm` is canonical; location/services and optional advanced fields are in the starter contract. A published worked example passes schema and actual HTTP evaluation. | Preserve the example and CLI/browser regression; do not use the retired starter ID. |
| R02: Mission 3 tool naming | **Resolved locally:** canonical operations are available through authenticated CLI/HTTP calls. Validator 1.1.0 checks server receipts and the observed shelter/route rather than trusting trace-shaped data. | Rehearse the actual VS Code agent and approved terminal/tool access before capture. |
| R03: Mission 5 package boundaries | **Local contract and provenance demonstrated:** the full schema reaches the validator; the five-mission journey replaces template IDs with actual simulator receipts. Validator 1.1.0 checks nested citations and aggregate quantities against observed inventory. | Keep decision fixtures outside participant starters. Proposed allocations are not applied; approval flags do not prove human authorization. |
| R04: Public-display data | **Partial:** no default fake achievement projection. The local public-only page polls canonical event completion and scores, hides unavailable results, and labels city recovery as scenario-baseline data. Other unconnected component views are labeled demonstrations. | Wire real city recovery and the intended public transport; baseline recovery is not a participant effect. |
| R05: Validation language | **Resolved locally:** `mission validate` explicitly says envelope-only; `submit` and `mission status` show server evaluation, required/advanced rule feedback and scores. | Preserve the three-step explanation in the teaching material. |
| R06: End-to-end readiness | **Partial:** real local instructor browser -> CLI -> evaluation -> public browser is exercised; all five missions include actual simulator calls where required, pause/resume, reconnect, duplicate retries and scope isolation. Decision text remains a synthetic fixture. | Rehearse real Copilot/specialist authoring and the intended deployed event. City recovery, persistence and SignalR remain incomplete. |
| R07: Scenario evidence | **Local scenario delivered:** `incident-004`, `incident-005` and `bulletin-03` form the reproducible East Bank underpass scenario with source-quality, uncertainty and untrusted-instruction learning outcomes. | Exercise with the facilitator and participants before final demonstration capture. |
| R08: Authoring workflow | **Documentation verified; hands-on confirmation pending:** the participant guide cites official VS Code setup, custom-agent and MCP documentation reviewed on 2026-09-29. Preflight distinguishes extension presence from account/feature access. | Confirm the actual account, session target, tools and clean VS Code authoring steps before screenshots. |

Canonical city districts in the current world model are **Harbor, Old Town,
North Hills, East Bank and Civic Center**. Do not carry unrelated default
dashboard districts into the presentation map.

The current Mission 5 content lists explicit high-impact human-approval tracking
as an advanced objective. Teach the safety rationale, but do not silently
change the scored core when writing the slides.

## 11. Production sequence and acceptance

### Phase 1: Complete the visual shell

Create the shared theme and the two PowerPoint files. Build representative
poster, briefing, concept, evidence-comparison, lab-hold and recognition slides.
Use the real logos and editable text. Resolve visual direction before
duplicating the template across the entire outline.

### Phase 2: Author the public learning journey

Populate P01-P60 with concise English copy, canonical names and visual
explanations. Use complete still-based briefings. Add participant-safe speaker
notes, source links and section navigation.

Resolve the applicable readiness gates before inserting exact contracts,
command screenshots or claims of live validated effects. Placeholder visuals
must remain clearly labeled during authoring and must not ship as real results.

### Phase 3: Author facilitator operations

Populate I01-I18 with coaching, anticipated answers, hint ladders, demo
artifacts, recovery procedures and public-slide return points. Rehearse the
instructor workflow on a separate screen; do not mix private content into the
public presentation file.

### Phase 4: Rehearse without video

Confirm that participants can follow every instruction without audio or
animation. Exercise normal and failure demo paths, check actual room timing
and inspect the deck at the intended projector size.

Render the slides, inspect layout and reading order, fix identified issues
and render the affected slides again. Check that long titles, code snippets,
labels and footer/source notes do not collide or become too small.

The two presentation files are ready for video integration only when:

- The 455-minute agenda remains coherent, including work periods and breaks.
- All five mission objectives map to the correct contract and participant artifact.
- Core/advanced distinctions and the six building-block definitions are clear.
- Every demonstration has an agreed data source, expected outcome and honest fallback.
- Public slides and notes contain no private answers or sensitive event data.
- Public screenshots show canonical content and clearly distinguish live from example state.
- Fonts, colors, links, diagram labels and small-size logos render correctly.
- The instructor can deliver the whole workshop using still images and live explanation.

### Phase 5: Produce videos last

Only after the presentations pass that rehearsal, decide which reserved slots
need video. Then produce the storyboards, required image ingredients, dialogue,
clips, captions and final edits. Integrate them without adding time to the
agreed agenda and retain the still-based fallback for every slot.

## 12. Source register

| Source | Use in this plan |
| --- | --- |
| [Product plan](../../PLAN.md) | Audience, full-day agenda, mission progression, success targets and platform principles |
| [Visual identity](../brand/visual-identity.md) | Palette, typography, logos, hierarchy and production exports |
| [Campaign narrative](../../campaigns/operation-lighthouse/src/narrative.ts) | Stable characters, campaign beats and terminology |
| [World model](../../campaigns/operation-lighthouse/src/world.ts) | Canonical districts, services, shelters, routes and recovery model |
| [Mission 1](../../campaigns/operation-lighthouse/src/missions/mission-1.ts) | Structured assessment objectives and runtime validator |
| [Mission 2](../../campaigns/operation-lighthouse/src/missions/mission-2.ts) | Evidence, uncertainty and untrusted instructions |
| [Mission 3](../../campaigns/operation-lighthouse/src/missions/mission-3.ts) | Tool names, failure handling and evidence trace |
| [Mission 4](../../campaigns/operation-lighthouse/src/missions/mission-4.ts) | Specialist roles, handoffs and independent review |
| [Mission 5](../../campaigns/operation-lighthouse/src/missions/mission-5.ts) | Coordinated recovery and auditable package |
| [Starter inventory](../../campaigns/operation-lighthouse/starters/starter-manifest.json) | Scaffolding progression and existing starter paths |
| [Participant CLI commands](../../apps/participant-cli/src/program.ts) | Declared command surface |
| [Participant workflow](../../apps/participant-cli/src/workflow.ts) | Local envelope validation and submission behavior |
| [Public presentation component](../../apps/command-center/src/PublicPresentationView.tsx) | Public-state shape and default demonstration data |
| [Command Center shell](../../apps/command-center/src/App.tsx) | Current display composition and demo-wiring caveat |
| [English campaign media catalog](../../campaigns/operation-lighthouse/media/localization/en.json) | Narrative intent, mission language, pronunciation and accessibility |
| [Campaign media manifest](../../campaigns/operation-lighthouse/media/asset-manifest.json) | Existing asset inventory and production records |

This plan is the presentation-production reference. Historical Flow guides
remain production history; they do not override the deck-first, video-last
sequence selected here.
