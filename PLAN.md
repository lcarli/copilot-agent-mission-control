# Copilot Agent Mission Control

## Detailed Product and Delivery Plan

**Repository:** `lcarli/copilot-agent-mission-control`  
**Initial campaign:** Operation Lighthouse  
**Target format:** Full-day, instructor-led public workshop  
**Initial capacity:** Up to 50 concurrent participants  
**Supported languages:** English (`en`), French (`fr`), and Brazilian Portuguese (`pt-BR`)  
**Primary authoring environment:** Visual Studio Code with GitHub Copilot  
**Cloud platform:** Microsoft Azure  

---

## 1. Product Vision

Copilot Agent Mission Control is a reusable platform for immersive, mission-based workshops in which participants learn to create GitHub Copilot agents in Visual Studio Code.

Instead of following isolated labs, participants enter a fictional but realistic operational scenario. They create progressively more capable agents to investigate incidents, use tools, collect evidence, collaborate with specialist agents, and resolve a final crisis.

Every participant or team interacts with a shared live environment. Their agents send structured events to Mission Control, changing the state of the fictional world and updating an instructor dashboard in real time.

The platform must support multiple campaign universes. Each campaign supplies its own story, missions, simulators, validators, localized content, and media assets while reusing the same core platform.

### Product principles

1. **Story drives learning.** Every technical activity must have a narrative purpose.
2. **Progressive independence.** Early missions provide guidance; later missions remove scaffolding.
3. **Behavior over implementation.** Validation should focus on observable agent behavior rather than one required SDK or code structure.
4. **Shared spectacle.** Participant actions must produce visible effects in the instructor dashboard.
5. **Inclusive competition.** Reliability, evidence, and collaboration matter more than raw speed.
6. **Multilingual by design.** English, French, and Brazilian Portuguese are first-class languages.
7. **One-command operations.** An instructor must be able to provision and remove the Azure environment with minimal effort.
8. **Reusable campaigns.** New stories must not require rebuilding the core platform.
9. **Safe failure.** A participant error must not disrupt the event for other participants.
10. **Disposable infrastructure.** Event environments should be easy to create, observe, and delete.

---

## 2. Target Audiences

The platform supports mixed experience levels without splitting the room into unrelated workshops.

### Beginner

- Has basic programming and Visual Studio Code familiarity.
- May use GitHub Copilot but has not created an agent.
- Completes core objectives with starter code, examples, and guided instructions.

### Intermediate

- Has experience with APIs, automation, or GitHub Copilot.
- Completes core objectives and selected advanced objectives.
- Designs instructions, tool usage, validation, and error handling.

### Advanced

- Has created agents, tools, MCP servers, or AI applications.
- Completes advanced objectives and optional incident modifiers.
- Designs specialist agents, handoffs, orchestration, observability, and resilience.

### Participation unit

The platform uses the neutral term **unit** for either:

- An individual participant.
- A pair.
- A team of three or four participants.

This allows individual and team participation in the same event.

---

## 3. Workshop Success Criteria

At the end of the full-day experience:

- At least 85% of active units complete Missions 1 through 3.
- At least 60% complete Mission 4.
- At least 40% complete the core objective of Mission 5.
- Every active unit sends at least one validated event to Mission Control.
- Participants can explain the difference between instructions, context, tools, skills, specialist agents, and orchestration.
- Participants can identify why an agent answer is or is not grounded in evidence.
- The instructor can operate the event without direct access to Azure Portal during normal delivery.
- Dashboard updates appear within three seconds under expected load.
- The platform supports 50 concurrent participants without cross-unit data leakage.
- All participant-facing and instructor-facing campaign content is available in `en`, `fr`, and `pt-BR`.

---

## 4. Campaign Model

A **campaign pack** is a versioned package containing:

- Campaign metadata.
- Story timeline.
- Mission definitions.
- Localized content.
- Simulated service data.
- Validation rules.
- Dashboard scene configuration.
- Instructor controls and incident modifiers.
- Asset manifest.
- Generative AI prompts for every required media asset.

The platform must load a campaign without requiring changes to core application code.

### Planned campaign universes

| Campaign | Status | Scenario | Primary learning strengths |
|---|---|---|---|
| Operation Lighthouse | Initial release | Coastal emergency response | Instructions, tools, evidence, multi-agent coordination |
| Project Chronos | Future | Critical archive migration and integrity investigation | Retrieval, grounding, contradiction detection, auditability |

---

## 5. Initial Campaign: Operation Lighthouse

### 5.1 Setting

**Port Azure** is a fictional coastal city preparing for a severe storm. Weather conditions deteriorate faster than forecast. Power instability, transport disruption, overloaded emergency channels, and contradictory sensor readings make manual coordination increasingly difficult.

Participants join the temporary **Lighthouse Response Unit**, supporting the city's Emergency Operations Center. Their objective is to build agents that convert fragmented information into reliable, explainable, and coordinated action.

The city is fictional to avoid political, geographic, and organizational associations. Operational processes and data should still feel realistic.

### 5.2 Narrative roles

| Role | Purpose |
|---|---|
| Mission Commander | Instructor persona and primary narrator |
| Maya Chen, Operations Lead | Provides mission briefs and operational constraints |
| Jules Martin, Field Coordinator | Reports changing conditions from the city |
| Aurora, City Operations System | Platform voice for alerts, validation, and status |
| Lighthouse Units | Participants and teams |

Names must remain stable across languages. Dialogue and pronunciation guidance are localized.

### 5.3 City systems

The campaign simulates:

- Weather observations and forecasts.
- Electrical grid sectors.
- Emergency shelters and capacity.
- Road closures and transport routes.
- Citizen and field-team incident reports.
- Emergency resource inventory.
- Public communication channels.

Simulators must expose deterministic scenarios and controlled variation. They must not depend on live public services during the workshop.

---

## 6. Full-Day Agenda

| Segment | Duration | Outcome |
|---|---:|---|
| Opening cinematic and mission briefing | 15 min | Establish scenario and urgency |
| Environment setup and unit registration | 15 min | Every unit connects to Mission Control |
| Mission 1: Signal in the Storm | 50 min | Create a basic structured-response agent |
| Debrief 1 | 15 min | Discuss roles, instructions, and output contracts |
| Mission 2: Ground Truth | 55 min | Add context, evidence, and uncertainty handling |
| Lunch | 60 min | — |
| Mission 3: Connected City | 60 min | Connect tools or MCP services |
| Break | 15 min | — |
| Mission 4: Specialist Network | 65 min | Build specialist agents and handoffs |
| Mission 5: Restore the Lighthouse | 75 min | Orchestrate a coordinated response |
| Demonstrations, awards, and finale | 30 min | Reflect, recognize, and close the story |

The instructor may shorten Missions 4 and 5 or disable advanced objectives if setup delays occur.

---

## 7. Mission Design

### 7.1 Mission 1 — Signal in the Storm

**Narrative problem:** Emergency channels contain unstructured, duplicated, incomplete, and emotional messages. Operators cannot prioritize them quickly enough.

**Learning objective:** Create a basic agent with a clear role, instructions, and structured output.

**Core requirements:**

- Accept an incident report.
- Classify the incident category.
- Assign a severity level.
- Extract location and affected services.
- Identify missing critical information.
- Return valid structured output.

**Advanced objectives:**

- Detect probable duplicates.
- Explain severity without inventing facts.
- Support input in all three campaign languages.

**Scaffolding:**

- Working sample agent.
- Explicit TODO markers.
- Output schema.
- Example inputs and expected shapes.

**Dashboard effect:** Valid incidents appear on the city map as status markers.

### 7.2 Mission 2 — Ground Truth

**Narrative problem:** Conflicting reports are causing unnecessary dispatches. The response center needs evidence-aware recommendations.

**Learning objective:** Use instructions, supplied context, evidence, and uncertainty boundaries.

**Core requirements:**

- Compare an incident report with a supplied operational bulletin.
- Separate facts, assumptions, and unknowns.
- Cite evidence identifiers.
- Refuse to make an unsupported operational conclusion.
- Recommend the next information-gathering step.

**Advanced objectives:**

- Resolve contradictions using source priority rules.
- Produce a confidence score with an explanation.
- Detect prompt content that attempts to override mission instructions.

**Scaffolding:**

- Starter structure and tests.
- Context files.
- No completed instruction set.

**Dashboard effect:** Verified incidents replace unverified markers and improve the communications integrity meter.

### 7.3 Mission 3 — Connected City

**Narrative problem:** Static bulletins are no longer sufficient. Units must consult city systems to identify safe shelters and viable routes.

**Learning objective:** Connect and use tools or MCP services safely.

**Core requirements:**

- Query weather conditions.
- Query shelter capacity.
- Query road or transport status.
- Recommend a shelter and route based on returned evidence.
- Handle an unavailable or invalid tool response.

**Advanced objectives:**

- Compare multiple routes.
- Retry transient failures with limits.
- Avoid unnecessary tool calls.
- Record a concise tool-use trace.

**Scaffolding:**

- Tool contracts and service documentation.
- Authentication configuration.
- No completed agent implementation.

**Dashboard effect:** Recommended evacuation flows animate on the city map. Shelter utilization changes when actions are validated.

### 7.4 Mission 4 — Specialist Network

**Narrative problem:** Conditions now exceed the capacity of one general-purpose agent. Weather, infrastructure, logistics, and communications decisions must be coordinated.

**Learning objective:** Design specialist agents with bounded responsibilities and explicit handoffs.

**Core requirements:**

- Create at least three specialist roles.
- Define input and output boundaries for each specialist.
- Route work to the correct specialist.
- Preserve evidence across handoffs.
- Add a reviewer or verifier before operational approval.

**Advanced objectives:**

- Run independent analyses concurrently.
- Detect disagreement between specialists.
- Escalate unresolved conflicts to a human decision.
- Capture latency and tool usage by specialist.

**Scaffolding:**

- Role requirements.
- Handoff event contract.
- No prescribed architecture.

**Dashboard effect:** A live topology shows active specialists, handoffs, disagreements, and verified decisions.

### 7.5 Mission 5 — Restore the Lighthouse

**Narrative problem:** A major grid failure disables critical communications while a new storm surge warning arrives. The city has limited generators, transport capacity, and shelter space.

**Learning objective:** Build an orchestrated multi-agent response that remains grounded, resilient, and explainable.

**Core requirements:**

- Assess the combined incident.
- Gather current evidence from multiple tools.
- Produce a prioritized response plan.
- Allocate constrained resources.
- Route specialist work.
- Validate the final plan.
- Submit an auditable decision package.

**Advanced objectives:**

- React to an instructor-triggered incident modifier.
- Re-plan after a tool becomes unavailable.
- Minimize cost or tool calls without reducing safety.
- Explain rejected alternatives.
- Request human approval for high-impact actions.

**Scaffolding:**

- Incident brief.
- Success criteria.
- Submission contract.
- No starter implementation.

**Dashboard effect:** The city recovery sequence reflects validated decisions from all units. The event finale unlocks when the room reaches a collective recovery threshold.

---

## 8. Progressive Learning Model

| Mission | Guidance level | Participant responsibility |
|---|---|---|
| 1 | High | Complete and adapt a working starter |
| 2 | Medium-high | Design instructions and evidence behavior |
| 3 | Medium | Integrate tools from contracts |
| 4 | Low | Design specialist boundaries and handoffs |
| 5 | Minimal | Design and implement the complete solution |

Every mission supports:

- **Core objectives** for all participants.
- **Advanced objectives** for experienced participants.
- **Hints level 1:** conceptual direction.
- **Hints level 2:** implementation direction.
- **Hints level 3:** partial example or diagnostic guidance.
- **Instructor override:** mark an infrastructure-blocked unit as eligible to continue.

Hints may reduce bonus points but must never prevent completion.

---

## 9. Participant Experience

### 9.1 Before the event

Participants receive:

- Prerequisite checklist.
- Visual Studio Code installation guidance.
- GitHub Copilot access requirements.
- Repository access instructions.
- Optional preflight validation script.

### 9.2 At registration

Participants:

1. Open the participant repository in Visual Studio Code.
2. Select a language.
3. Join or create a unit.
4. Enter the event code.
5. Receive a short-lived unit token.
6. Run a connectivity check.
7. See their unit appear in Mission Control.

### 9.3 During missions

Participants use a local CLI or VS Code task to:

- Start a mission.
- Run local tests.
- Validate a submission.
- Submit mission results.
- Request a hint.
- View localized feedback.
- Reconnect after network interruption.

The initial release should avoid requiring each participant to own an Azure subscription.

---

## 10. Instructor Experience

### 10.1 Instructor setup

The instructor:

1. Runs the deployment command.
2. Receives dashboard, API, and setup URLs.
3. Opens the instructor setup page.
4. Selects campaign, language, schedule, and scoring mode.
5. Generates the event code.
6. Runs the preflight check.
7. Opens the lobby.

### 10.2 Command Center capabilities

- Open, pause, resume, and close missions.
- Display the active briefing.
- Change the presentation language without changing participant language.
- Monitor unit connectivity and progress.
- Trigger hints globally or for one unit.
- Trigger incident modifiers.
- Pause scoring.
- Correct or annotate a score.
- Mute abusive or malfunctioning units.
- Enable demonstration mode.
- View platform health.
- Export event results.
- End the event and lock submissions.

### 10.3 Live dashboard views

- Port Azure city map.
- Service health meters.
- Mission timeline.
- Unit progress grid.
- Event activity feed.
- Specialist-agent topology.
- Collective recovery meter.
- Achievements and recognition.
- Infrastructure health panel.

The public display must not expose tokens, participant email addresses, prompts, source code, or sensitive telemetry.

---

## 11. Scoring and Recognition

### 11.1 Scoring dimensions

| Dimension | Suggested weight |
|---|---:|
| Required outcome completion | 40% |
| Evidence and grounding | 20% |
| Reliability and error handling | 15% |
| Explainability and auditability | 15% |
| Efficiency and optional objectives | 10% |

Speed is used only as a tie-breaker.

### 11.2 Submission outcomes

- `passed`: all core requirements succeed.
- `partial`: meaningful progress, with specific unmet requirements.
- `retry`: malformed, unsupported, or temporarily untestable submission.
- `blocked`: confirmed platform or infrastructure issue; no scoring penalty.

### 11.3 Recognition categories

- Most Reliable Agent.
- Best Evidence Use.
- Best Multi-Agent Design.
- Best Recovery from Failure.
- Best Beginner Journey.
- Most Creative Valid Solution.
- Strongest Collaboration.

The event should include a collective success condition in addition to individual rankings.

---

## 12. Validation Architecture

Validation must evaluate behavior without requiring one exact implementation.

### 12.1 Validation layers

1. **Schema validation:** required fields and data types.
2. **Behavior validation:** required decisions and actions.
3. **Evidence validation:** cited identifiers exist and support the conclusion.
4. **Tool validation:** required systems were used correctly.
5. **Resilience validation:** known failures are handled safely.
6. **Orchestration validation:** required roles and handoffs occurred.
7. **Narrative state validation:** actions are legal in the current campaign state.

### 12.2 Validator requirements

- Deterministic where possible.
- Versioned with the campaign.
- Idempotent for repeated submissions.
- Isolated by event and unit.
- Localized feedback separated from validation logic.
- No hidden dependency on live third-party services.
- Capable of producing a concise validation trace for instructors.

### 12.3 Anti-cheating design

The workshop prioritizes learning rather than adversarial enforcement. Reasonable controls include:

- Per-event scenario seeds.
- Multiple equivalent data variants.
- Validation based on evidence identifiers.
- Short-lived unit credentials.
- Server-side scoring.
- No final answer stored in participant starter files.

---

## 13. Technical Architecture

### 13.1 Recommended Azure services

| Capability | Azure service |
|---|---|
| Core API and validators | Azure Container Apps |
| Instructor dashboard | Azure Container Apps or Azure Static Web Apps with linked backend |
| Real-time updates | Azure SignalR Service |
| Operational state | Azure Cosmos DB for NoSQL |
| Campaign packages and media | Azure Blob Storage |
| Container images | Azure Container Registry |
| Secrets | Azure Key Vault |
| Identity between services | Managed Identities |
| Telemetry | Application Insights |
| Central logs | Log Analytics Workspace |

Azure Kubernetes Service is intentionally excluded from the MVP because its operational overhead is not justified for a 50-participant event.

### 13.2 Logical components

#### Mission Control API

- Authenticates units and instructors.
- Enforces event and unit isolation.
- Receives participant events.
- Coordinates mission state.
- Invokes validators.
- Updates scores.
- Publishes real-time events.

#### Campaign Engine

- Loads and validates campaign packs.
- Controls mission availability.
- Applies incident modifiers.
- Maintains narrative state.
- Resolves localized content keys.

#### Validation Workers

- Execute versioned mission validation.
- Apply timeouts and resource limits.
- Produce structured results.
- Never execute arbitrary participant source code in the MVP.

#### Simulator Services

- Weather.
- Grid.
- Shelters.
- Transport.
- Incident intake.
- Resource inventory.

The MVP may host simulators in one service with isolated modules. They can be separated later if scale or campaign development requires it.

#### Real-Time Gateway

- Publishes unit progress.
- Publishes city state changes.
- Publishes instructor commands.
- Supports reconnect and state replay.

#### Command Center UI

- Instructor controls.
- Public presentation views.
- Event monitoring.
- Localization.
- Accessible visualizations.

### 13.3 Data flow

1. A unit authenticates with an event code and short-lived token.
2. The unit starts a mission.
3. The local agent interacts with campaign simulators through authenticated APIs or MCP tools.
4. The unit submits structured evidence and results.
5. The API stores the submission and invokes the correct validator version.
6. The validator emits a result.
7. The scoring engine updates unit and collective state.
8. SignalR sends updates to dashboards.
9. The instructor may trigger a command or incident modifier.
10. Connected clients receive the changed mission state.

### 13.4 Reliability requirements

- Every mutating request includes an idempotency key.
- Repeated events do not award duplicate points.
- SignalR disconnection falls back to periodic state refresh.
- Dashboard clients can rebuild state from the API.
- Simulator failures generate a mission pause option.
- Unit failures cannot affect other units.
- Instructor commands are audited.
- Platform-wide circuit breakers prevent cascading failures.

---

## 14. Azure Infrastructure and One-Command Deployment

### 14.1 Infrastructure structure

```text
infra/
├── main.bicep
├── main.dev.bicepparam
├── main.event.bicepparam
└── modules/
    ├── container-apps.bicep
    ├── container-registry.bicep
    ├── cosmos-db.bicep
    ├── identity-rbac.bicep
    ├── key-vault.bicep
    ├── monitoring.bicep
    ├── signalr.bicep
    └── storage.bicep
```

### 14.2 Operational scripts

```text
scripts/
├── deploy.ps1
├── destroy.ps1
├── preflight.ps1
├── seed-campaign.ps1
└── smoke-test.ps1
```

### 14.3 `deploy.ps1` responsibilities

1. Verify Azure CLI and Bicep availability.
2. Verify authentication and subscription selection.
3. Validate parameter values.
4. Create or select the resource group.
5. Run `az deployment group what-if`.
6. Require confirmation unless `-Confirm:$false` is explicitly used.
7. Deploy `infra/main.bicep`.
8. Build or reference versioned application images.
9. Push images to Azure Container Registry.
10. Deploy Container App revisions.
11. Upload the selected campaign pack.
12. Run smoke tests.
13. Print dashboard, API, setup, and health URLs.
14. Write a non-secret deployment summary locally.

### 14.4 `destroy.ps1` responsibilities

- Resolve the exact resource group created for the event.
- Show affected resources.
- Require explicit confirmation.
- Delete only the event resource group.
- Never use wildcard deletion.
- Confirm deletion status.

### 14.5 Bicep requirements

- Resource-group scope for the MVP.
- Modules by logical capability.
- Descriptions on all parameters.
- Secure parameters for secrets.
- Managed Identity for service-to-service access.
- No secrets in outputs.
- Minimal RBAC assignments.
- Configurable region and resource prefix.
- Tags for product, campaign, environment, event, owner, and expiry.
- Outputs for non-secret endpoints and resource identifiers.
- Successful `az bicep build`.
- Successful deployment `what-if`.

### 14.6 Initial sizing

The first sizing target is 50 concurrent participants. The design should:

- Use consumption-oriented Container Apps profiles where practical.
- Scale API and dashboard replicas from a small minimum.
- Cap maximum replicas to prevent unexpected event cost.
- Use a low-cost Cosmos DB configuration suitable for event workloads.
- Use a SignalR tier that supports expected concurrent connections with margin.
- Retain operational logs for a limited, configurable period.

Exact SKUs must be confirmed during infrastructure implementation using current Azure service availability and pricing.

---

## 15. Security and Privacy

### 15.1 Identity

- Instructor access uses Microsoft Entra ID where practical.
- Participant units use short-lived event-scoped credentials.
- Azure resources use Managed Identities.
- No service credentials are committed to the repository.

### 15.2 Authorization

- Instructor and participant roles are distinct.
- A unit can access only its own detailed state.
- Public dashboards receive a redacted event stream.
- Campaign administration requires an instructor role.
- RBAC assignments follow least privilege.

### 15.3 Data minimization

The platform should not require participant names or email addresses. A display name may be optional and moderated.

Do not store:

- GitHub Copilot prompts unless explicitly enabled for a controlled study.
- Participant source code.
- Personal access tokens.
- Azure credentials.
- Unnecessary personal data.

### 15.4 Abuse and operational controls

- Request-rate limits by event and unit.
- Payload size limits.
- Schema validation before processing.
- Instructor ability to mute a unit.
- Safe rendering of unit names and messages.
- Audit log for instructor actions.
- Configurable data retention and event cleanup.

---

## 16. Localization

### 16.1 Supported locales

- `en`: English.
- `fr`: French.
- `pt-BR`: Brazilian Portuguese.

English keys and identifiers are canonical. English source text is not embedded directly in application components.

### 16.2 Localized content

The following must be localized:

- Campaign title and synopsis.
- Mission briefs and objectives.
- Participant instructions.
- Hints.
- Validator feedback.
- System and error messages.
- Dashboard labels.
- Instructor guide.
- Narration scripts.
- Captions and subtitles.
- Awards and closing messages.

### 16.3 Example structure

```text
campaigns/operation-lighthouse/
├── campaign.yaml
├── missions/
├── simulators/
├── validators/
├── assets/
└── locales/
    ├── en.json
    ├── fr.json
    └── pt-BR.json
```

### 16.4 Localization quality

- Use professional, natural language rather than literal translation.
- Maintain a campaign glossary for technical and narrative terms.
- Validate placeholders and message keys automatically.
- Test UI expansion, especially French and Portuguese.
- Keep generated images and videos free of baked-in text.
- Apply text, captions, and labels through the platform.
- Provide subtitles for all narrated video.

---

## 17. Media Asset Production

Media will be generated with an external AI system. The repository must contain a descriptive generation prompt for every requested asset before that asset is produced.

### 17.1 Asset manifest fields

Each asset record must include:

- Asset ID.
- Campaign and scene.
- Narrative purpose.
- Media type.
- Required variants.
- Language requirements.
- Target duration.
- Resolution and aspect ratio.
- Visual or audio continuity references.
- Full generation prompt.
- Negative prompt or prohibited elements.
- Script or spoken text.
- Pronunciation notes.
- Caption file requirements.
- File format and maximum size.
- Licensing and provenance notes.
- Review status.

### 17.2 Prompt requirements

Every generative prompt must describe, when applicable:

- Environment and period.
- Characters, role, age range, appearance, and wardrobe.
- Composition and subject placement.
- Camera angle, lens, depth of field, and movement.
- Lighting, weather, color palette, and atmosphere.
- Physical action and emotional tone.
- Interface elements or props.
- Sound design and music direction.
- Voice characteristics, pacing, and emotion.
- Continuity with previous and following assets.
- Exact duration and output format.
- Accessibility requirements.
- Elements that must not appear.
- A requirement to avoid generated text, logos, and watermarks unless explicitly approved.

### 17.3 Prompt template

```yaml
assetId: OL-OPENING-VIDEO-001
purpose: ""
mediaType: video
sceneContext: ""
continuity: ""
output:
  durationSeconds: 0
  aspectRatio: "16:9"
  resolution: "1920x1080"
  frameRate: 24
creativeDirection:
  style: ""
  composition: ""
  camera: ""
  lighting: ""
  palette: ""
  weather: ""
  action: ""
  emotion: ""
audioDirection:
  ambience: ""
  soundEffects: ""
  music: ""
localization:
  narrationRequired: true
  languages:
    - en
    - fr
    - pt-BR
generationPrompt: |
  A complete, standalone, highly descriptive prompt goes here.
negativePrompt: |
  Generated text, unreadable signage, real company logos, watermarks,
  distorted anatomy, unsafe emergency behavior, identifiable real people.
```

### 17.4 Initial Operation Lighthouse asset list

| Asset ID | Asset | Purpose |
|---|---|---|
| OL-OPENING-VIDEO-001 | Opening cinematic | Introduce Port Azure and the incoming storm |
| OL-COMMANDER-AVATAR-001 | Mission Commander portrait | Instructor and briefing identity |
| OL-MAYA-AVATAR-001 | Operations Lead portrait | Mission briefings |
| OL-JULES-AVATAR-001 | Field Coordinator portrait | Field updates |
| OL-CITY-MAP-001 | Port Azure base map | Main dashboard visualization |
| OL-CITY-DISTRICTS-001 | District overlays | Service and incident status |
| OL-MISSION-01-BRIEF-001 | Mission 1 briefing video | Launch Signal in the Storm |
| OL-MISSION-02-BRIEF-001 | Mission 2 briefing video | Launch Ground Truth |
| OL-MISSION-03-BRIEF-001 | Mission 3 briefing video | Launch Connected City |
| OL-MISSION-04-BRIEF-001 | Mission 4 briefing video | Launch Specialist Network |
| OL-MISSION-05-BRIEF-001 | Mission 5 briefing video | Launch Restore the Lighthouse |
| OL-ALERT-STING-001 | Alert audio cue | Instructor-triggered incidents |
| OL-SUCCESS-STING-001 | Mission success audio cue | Validated completion |
| OL-DASHBOARD-AMBIENCE-001 | Ambient sound loop | Low-volume command center atmosphere |
| OL-FINALE-VIDEO-001 | Recovery finale | Close the campaign |
| OL-AWARD-BACKGROUNDS-001 | Award visual set | Recognition ceremony |

Each asset task must add or update its manifest entry and generation prompt.

---

## 18. Campaign Pack Contract

### 18.1 Campaign metadata

```yaml
id: operation-lighthouse
version: 1.0.0
defaultLocale: en
supportedLocales:
  - en
  - fr
  - pt-BR
minimumPlatformVersion: 0.1.0
capacity:
  recommendedParticipants: 50
missions:
  - signal-in-the-storm
  - ground-truth
  - connected-city
  - specialist-network
  - restore-the-lighthouse
```

### 18.2 Mission contract

Each mission definition must include:

- ID and version.
- Prerequisite missions.
- Time recommendation.
- Localized content keys.
- Core and advanced objectives.
- Required event types.
- Available tools.
- Validator reference and version.
- Hint levels.
- Score configuration.
- Dashboard effects.
- Instructor modifiers.
- Failure and pause behavior.

### 18.3 Event envelope

```json
{
  "eventId": "uuid",
  "eventType": "mission.submitted",
  "schemaVersion": "1.0",
  "eventSessionId": "event-session-id",
  "unitId": "unit-id",
  "missionId": "connected-city",
  "occurredAt": "2026-01-01T12:00:00Z",
  "idempotencyKey": "unit-generated-key",
  "correlationId": "correlation-id",
  "payload": {}
}
```

---

## 19. Observability and Operations

### 19.1 Required telemetry

- API latency and error rate.
- Active units.
- SignalR connection count.
- Mission submission count.
- Validator duration and failures.
- Simulator latency and failures.
- Cosmos DB request and throttling metrics.
- Container replica count.
- Instructor command audit events.

### 19.2 Correlation

Every operational event should include:

- Event session ID.
- Unit ID where applicable.
- Mission ID where applicable.
- Correlation ID.
- Component name.
- Campaign version.

Telemetry must exclude secrets, prompts, participant source code, and unnecessary personal data.

### 19.3 Health model

- `/health/live`: process is running.
- `/health/ready`: dependencies required for normal traffic are available.
- `/health/event`: campaign, simulators, validators, and real-time components are ready for an event.

The instructor dashboard should summarize health without requiring Azure Portal access.

---

## 20. Testing Strategy

### 20.1 Automated tests

- Unit tests for campaign parsing.
- Unit tests for scoring.
- Unit tests for every validator rule.
- Contract tests for participant events.
- Contract tests for simulator tools.
- Localization key parity tests.
- API authorization and unit-isolation tests.
- Idempotency tests.
- SignalR reconnect tests.
- Bicep build validation.
- Deployment smoke tests.

### 20.2 End-to-end tests

- Instructor creates an event.
- Unit registers and reconnects.
- Unit completes every mission through a known valid path.
- Invalid submissions return localized feedback.
- Instructor triggers an incident modifier.
- Dashboard reconstructs state after restart.
- Event results export successfully.
- Event closes and rejects new submissions.

### 20.3 Load tests

The MVP load profile must simulate:

- 50 participants connected.
- At least 20 simultaneous mission submissions.
- Bursts of tool requests.
- Dashboard and public display clients.
- SignalR reconnect waves.
- Instructor incident activation during participant activity.

### 20.4 Campaign dry run

Every campaign release must include an automated dry run proving that:

- All missions can be opened.
- All tools respond with valid scenario data.
- Every mission has at least one valid completion path.
- Every validator produces expected outcomes.
- Dashboard effects are emitted.
- All localization keys exist.
- All referenced assets exist.

---

## 21. Accessibility

- Keyboard-operable instructor dashboard.
- Sufficient contrast and non-color status indicators.
- Reduced-motion mode.
- Captions and transcripts for video and audio.
- Screen-reader labels for controls and status.
- Large-screen presentation mode.
- Avoid audio-only mission-critical information.
- Do not rely on a single map visualization for essential status.

---

## 22. Repository Structure

```text
.
├── PLAN.md
├── README.md
├── CONTRIBUTING.md
├── SECURITY.md
├── apps/
│   ├── api/
│   ├── command-center/
│   └── participant-cli/
├── campaigns/
│   └── operation-lighthouse/
├── docs/
│   ├── architecture/
│   ├── instructor/
│   └── participant/
├── infra/
│   ├── main.bicep
│   ├── main.dev.bicepparam
│   ├── main.event.bicepparam
│   └── modules/
├── packages/
│   ├── campaign-contracts/
│   ├── event-contracts/
│   └── localization/
├── scripts/
└── tests/
    ├── contract/
    ├── e2e/
    └── load/
```

The implementation stack will be selected in a dedicated architecture task. The contracts and campaign model should remain technology-neutral where practical.

---

## 23. Delivery Workflow

### 23.1 One branch and commit per roadmap task

Every roadmap task must be delivered independently.

1. Select one unchecked roadmap task.
2. Create a branch from the latest `main`.
3. Use the branch format `task/<task-id>-<short-description>`.
4. Implement only that task and directly required supporting changes.
5. Validate the task acceptance criteria.
6. Change the roadmap checkbox from `[ ]` to `[x]` in the same branch.
7. Commit the implementation and roadmap update together.
8. Push the branch.
9. Open a pull request.
10. Merge only after required validation succeeds.

If a task requires multiple commits during development, squash it to one task commit before merge unless preserving commits has a clear review benefit.

### 23.2 Commit format

```text
<type>: <task outcome>

<optional concise explanation>

Roadmap: <TASK-ID>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### 23.3 Task completion rule

A task is complete only when:

- Its acceptance criteria are satisfied.
- Relevant tests or validation pass.
- Documentation is updated.
- Its roadmap checkbox is marked `[x]`.
- The change is committed on its dedicated task branch.
- The branch is pushed to GitHub.

---

## 24. Roadmap

### Phase 0 — Product Definition

- [x] **TASK-000 — Create detailed product and delivery plan.** Define the vision, campaign, architecture, localization, assets, testing, delivery workflow, and roadmap.
- [x] **TASK-001 — Define architecture decision record.** Select the application stack, repository tooling, local development approach, and deployment packaging.
- [x] **TASK-002 — Define domain and API contracts.** Specify events, units, sessions, missions, scoring, validation, and instructor commands.
- [x] **TASK-003 — Define campaign JSON/YAML schemas.** Create machine-validatable campaign, mission, asset, and localization schemas.
- [x] **TASK-004 — Create contribution and security guidance.** Add contributing, code of conduct, security, branching, and pull-request documentation.

### Phase 1 — Platform Foundation

- [x] **TASK-100 — Scaffold the monorepo.** Create application, package, campaign, test, and infrastructure workspaces.
- [x] **TASK-101 — Implement shared event contracts.** Add typed event envelopes, schema validation, and versioning.
- [x] **TASK-102 — Implement campaign loader.** Load, validate, and version campaign packs.
- [x] **TASK-103 — Implement localization foundation.** Resolve `en`, `fr`, and `pt-BR` resources with fallback and parity tests.
- [x] **TASK-104 — Implement authentication model.** Add event codes, short-lived unit tokens, and instructor authorization.
- [x] **TASK-105 — Implement event and unit management.** Create, join, reconnect, close, and isolate event units.

### Phase 2 — Azure Infrastructure

- [x] **TASK-200 — Create Bicep foundation.** Add resource-group-scoped orchestration, parameters, naming, and tags.
- [x] **TASK-201 — Provision monitoring resources.** Add Log Analytics and workspace-based Application Insights.
- [x] **TASK-202 — Provision identity and secrets.** Add Managed Identities, Key Vault, and least-privilege RBAC.
- [x] **TASK-203 — Provision data and campaign storage.** Add Cosmos DB and Blob Storage.
- [x] **TASK-204 — Provision real-time messaging.** Add Azure SignalR Service and application configuration.
- [x] **TASK-205 — Provision container runtime.** Add Azure Container Registry, Container Apps environment, and applications.
- [x] **TASK-206 — Implement one-command deployment.** Add preflight, what-if, deployment, image publishing, campaign seeding, and output summary.
- [x] **TASK-207 — Implement safe environment destruction.** Add exact-scope cleanup with confirmation and status checks.
- [x] **TASK-208 — Add infrastructure validation.** Build Bicep, run linting and security checks, and perform deployment smoke tests.

### Phase 3 — Mission Control Core

- [x] **TASK-300 — Implement Mission Control API foundation.** Add health, configuration, errors, correlation, and API versioning.
- [x] **TASK-301 — Implement mission lifecycle.** Open, start, pause, resume, and close missions.
- [x] **TASK-302 — Implement event ingestion.** Validate, authorize, deduplicate, store, and publish participant events.
- [x] **TASK-303 — Implement scoring engine.** Calculate core, advanced, reliability, evidence, and tie-breaker scores.
- [x] **TASK-304 — Implement validation worker model.** Run versioned validators with timeouts and structured results.
- [x] **TASK-305 — Implement hint system.** Deliver progressive hints and record hint usage.
- [x] **TASK-306 — Implement instructor commands.** Support modifiers, overrides, score corrections, muting, and event closure.
- [x] **TASK-307 — Implement result export.** Export event, unit, mission, score, and recognition summaries.

### Phase 4 — Command Center

- [x] **TASK-400 — Create dashboard shell and design system.** Add responsive layout, themes, accessibility, and localization.
- [x] **TASK-401 — Implement instructor setup flow.** Select campaign, languages, schedule, scoring, and event code.
- [x] **TASK-402 — Implement lobby and connectivity view.** Show units, readiness, and platform health.
- [x] **TASK-403 — Implement live city map.** Render districts, incidents, services, routes, and recovery effects.
- [ ] **TASK-404 — Implement mission control panel.** Add timeline, mission controls, hints, and incident modifiers.
- [ ] **TASK-405 — Implement unit progress and scoring views.** Show progress, validation status, achievements, and rankings.
- [ ] **TASK-406 — Implement specialist topology view.** Visualize agents, tools, handoffs, reviews, and disagreements.
- [ ] **TASK-407 — Implement public presentation mode.** Create a redacted, large-screen, multilingual display.
- [ ] **TASK-408 — Implement reconnect and state replay.** Recover dashboard state after disconnect or restart.

### Phase 5 — Participant Toolkit

- [ ] **TASK-500 — Create participant CLI foundation.** Add configuration, authentication, localization, and diagnostics.
- [ ] **TASK-501 — Implement registration and connectivity check.** Join an event and verify required endpoints.
- [ ] **TASK-502 — Implement mission workflow commands.** Start, test, validate, submit, retry, and request hints.
- [ ] **TASK-503 — Create Visual Studio Code tasks.** Provide discoverable commands without requiring CLI memorization.
- [ ] **TASK-504 — Create progressive starter structure.** Support decreasing scaffolding across missions.
- [ ] **TASK-505 — Create participant preflight script.** Validate prerequisites before event day.

### Phase 6 — Operation Lighthouse Campaign

- [ ] **TASK-600 — Create Port Azure world model.** Define districts, services, shelters, routes, grid sectors, and recovery state.
- [ ] **TASK-601 — Create campaign narrative and glossary.** Finalize characters, terminology, timeline, and localization guidance.
- [ ] **TASK-602 — Implement weather simulator.** Provide deterministic observations, forecasts, and failures.
- [ ] **TASK-603 — Implement grid simulator.** Provide sector health, outages, and restoration constraints.
- [ ] **TASK-604 — Implement shelter simulator.** Provide capacity, resources, status, and controlled changes.
- [ ] **TASK-605 — Implement transport simulator.** Provide closures, routes, travel constraints, and updates.
- [ ] **TASK-606 — Implement incident intake simulator.** Provide multilingual reports, duplicates, missing data, and contradictions.
- [ ] **TASK-607 — Implement resource inventory simulator.** Provide constrained generators, vehicles, supplies, and teams.
- [ ] **TASK-610 — Build Mission 1 content and validator.** Deliver Signal in the Storm in all supported languages.
- [ ] **TASK-611 — Build Mission 2 content and validator.** Deliver Ground Truth in all supported languages.
- [ ] **TASK-612 — Build Mission 3 content and validator.** Deliver Connected City in all supported languages.
- [ ] **TASK-613 — Build Mission 4 content and validator.** Deliver Specialist Network in all supported languages.
- [ ] **TASK-614 — Build Mission 5 content and validator.** Deliver Restore the Lighthouse in all supported languages.
- [ ] **TASK-615 — Build instructor incident modifiers.** Add safe, documented scenario changes for live facilitation.
- [ ] **TASK-616 — Build campaign dry run.** Prove every mission and narrative transition end to end.

### Phase 7 — Media and Localization

- [ ] **TASK-700 — Create asset manifest tooling.** Validate metadata, prompts, variants, provenance, and file references.
- [ ] **TASK-701 — Write opening cinematic asset prompt.** Add the complete generation prompt and localized narration scripts.
- [ ] **TASK-702 — Write character asset prompts.** Add consistent prompts for Mission Commander, Maya, and Jules.
- [ ] **TASK-703 — Write Port Azure map prompts.** Add map, district, weather, service, and status visual prompts.
- [ ] **TASK-704 — Write mission briefing prompts.** Add five briefing video prompt packages and localized scripts.
- [ ] **TASK-705 — Write audio asset prompts.** Add alerts, success cues, ambience, music, and voice direction.
- [ ] **TASK-706 — Write finale and awards prompts.** Add recovery finale and recognition visual prompt packages.
- [ ] **TASK-707 — Integrate reviewed media assets.** Add approved files, captions, metadata, and provenance.
- [ ] **TASK-710 — Complete English content review.** Review clarity, consistency, accessibility, and glossary use.
- [ ] **TASK-711 — Complete French localization.** Translate and review all participant, instructor, UI, and media content.
- [ ] **TASK-712 — Complete Brazilian Portuguese localization.** Translate and review all participant, instructor, UI, and media content.
- [ ] **TASK-713 — Run localization parity tests.** Verify keys, placeholders, layout expansion, captions, and asset variants.

### Phase 8 — Quality, Security, and Event Readiness

- [ ] **TASK-800 — Add platform unit and contract test suites.** Cover domain, API, campaigns, events, and localization.
- [ ] **TASK-801 — Add end-to-end event tests.** Cover instructor and participant journeys.
- [ ] **TASK-802 — Add 50-participant load test.** Validate APIs, simulators, submissions, SignalR, and dashboard behavior.
- [ ] **TASK-803 — Add security validation.** Test authorization, isolation, rate limits, payload limits, and secret handling.
- [ ] **TASK-804 — Add accessibility validation.** Test keyboard access, contrast, reduced motion, captions, and screen readers.
- [ ] **TASK-805 — Create instructor guide.** Document setup, delivery, troubleshooting, timing, and recovery procedures.
- [ ] **TASK-806 — Create participant guide.** Document prerequisites, setup, commands, concepts, and troubleshooting.
- [ ] **TASK-807 — Run internal rehearsal.** Deliver the complete event with test participants and record issues.
- [ ] **TASK-808 — Run pilot event.** Deliver to a controlled external audience of up to 20 participants.
- [ ] **TASK-809 — Close pilot findings.** Resolve release-blocking feedback and update campaign timing.
- [ ] **TASK-810 — Certify public-event readiness.** Verify deployment, content, assets, localization, operations, and rollback.

### Phase 9 — Public Release and Expansion

- [ ] **TASK-900 — Publish version 1.0.** Tag the release and publish deployment and facilitation documentation.
- [ ] **TASK-901 — Create reusable campaign authoring guide.** Document how to build independent campaign packs.
- [ ] **TASK-902 — Define Project Chronos campaign.** Produce the second campaign design using the shared platform.
- [ ] **TASK-903 — Add post-event analytics.** Provide privacy-safe learning and operational summaries.
- [ ] **TASK-904 — Add campaign marketplace model.** Define discovery, validation, compatibility, and contribution rules.

---

## 25. MVP Scope

The MVP is complete when it can:

- Deploy to Azure with one instructor command.
- Support one event with 50 participants.
- Register individuals and teams as units.
- Run all five Operation Lighthouse missions.
- Validate and score submissions.
- Display real-time city and progress updates.
- Allow the instructor to control missions and incident modifiers.
- Operate in English, French, and Brazilian Portuguese.
- Recover from participant and dashboard reconnections.
- Export event results.
- Remove the Azure environment safely.

The MVP does not require:

- Arbitrary participant code execution in the cloud.
- AKS.
- A public campaign marketplace.
- Live integration with municipal or emergency services.
- Participant Azure subscriptions.
- Automatic judging by an unconstrained language model.
- Mobile-native applications.

---

## 26. Major Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Participant setup consumes event time | High | Preflight script, starter repository, connectivity test, guided Mission 1 |
| GitHub Copilot capabilities vary by environment | High | Define behavior-based contracts and verify prerequisites before the event |
| Real-time dashboard becomes a distraction | Medium | Use clear instructor modes and limit nonessential animation |
| Competition discourages beginners | High | Collective success, category awards, progressive hints, speed only as tie-breaker |
| AI outputs are nondeterministic | High | Validate structure, evidence, tool use, and bounded outcomes |
| Generated assets lack continuity | Medium | Asset manifest, continuity references, prompt standards, review gates |
| Localization drifts between releases | High | Canonical keys, glossary, parity tests, independent language review |
| Azure deployment is slow or fails on event day | High | Pre-deploy, smoke test, health dashboard, documented fallback environment |
| A unit floods the platform | Medium | Rate limits, quotas, payload limits, idempotency |
| Event costs exceed expectations | Medium | Consumption services, replica caps, tags, expiry, destruction script |
| Public display exposes sensitive data | High | Redacted event stream and explicit public-view contract |

---

## 27. Open Decisions

These decisions are intentionally deferred to dedicated roadmap tasks:

- Application language and web framework.
- Monorepo package manager and build tooling.
- Container Apps versus Static Web Apps for the dashboard.
- Exact SignalR, Cosmos DB, and Container Apps SKUs.
- Participant authentication implementation details.
- GitHub Copilot agent configuration and supported extension mechanisms.
- MCP server packaging approach.
- Exact CI/CD provider and release workflow.
- Whether instructor authentication requires a pre-created Entra application.
- Whether campaign packages are stored only in Blob Storage or also bundled in application releases.

Each decision must be recorded in an architecture decision record before implementation depends on it.

---

## 28. Definition of Product Success

Copilot Agent Mission Control succeeds when an instructor can deploy the platform, welcome a mixed-skill audience, and run a compelling full-day story in which participants visibly progress from a simple agent to a reliable multi-agent system.

The experience should make agent engineering concepts memorable because participants used them to solve an unfolding problem together, not because they merely copied a sequence of code samples.
