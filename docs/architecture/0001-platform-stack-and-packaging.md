# ADR 0001: Platform Stack, Repository Tooling, and Packaging

- **Status:** Accepted
- **Date:** 2026-09-25
- **Decision owners:** Copilot Agent Mission Control maintainers
- **Roadmap:** TASK-001

## Context

Copilot Agent Mission Control needs a stack that supports a real-time instructor
dashboard, an event and validation API, a participant CLI, reusable campaign
packages, and one-command Azure deployment. The initial release must serve up to
50 concurrent participants, support `en`, `fr`, and `pt-BR`, and remain simple
enough to operate during a public workshop.

The product plan intentionally left the application stack, monorepo tooling,
local development model, dashboard host, and deployment packaging undecided.
Those choices must be stable before the repository is scaffolded and contracts
begin to depend on framework-specific types.

## Decision drivers

- Share contracts, validation schemas, and localization types across the API,
  dashboard, CLI, and campaign tooling.
- Keep campaign and public API formats technology-neutral JSON.
- Minimize the number of languages and build systems contributors must install.
- Provide fast local feedback without requiring an Azure subscription.
- Preserve production-like integration testing for Azure-specific adapters.
- Use managed Azure services and disposable infrastructure for event delivery.
- Keep the MVP operationally simpler than a microservice or Kubernetes design.
- Produce deterministic, versioned artifacts that can be promoted unchanged.

## Decision

### Application stack

The platform will use **strict TypeScript on the active Node.js LTS release** as
the primary application language.

| Surface | Selected technology | Responsibility |
|---|---|---|
| Mission Control API | Fastify on Node.js | HTTP APIs, authentication boundaries, event ingestion, mission lifecycle, scoring, and health endpoints |
| Validation and simulators | TypeScript modules hosted by the API process for the MVP | Versioned validators and deterministic campaign simulator endpoints |
| Command Center | React with Vite | Instructor workflows, public presentation mode, localization, and SignalR-driven views |
| Participant CLI | Node.js CLI using Commander | Registration, diagnostics, mission workflow, validation, submission, and localized output |
| Runtime validation | JSON Schema with TypeBox | Technology-neutral JSON contracts with generated TypeScript types and Fastify-compatible validation |
| Real-time client | Azure SignalR Service JavaScript client | Live event, score, health, and presentation updates |
| Azure data access | Official Azure SDKs for JavaScript | Cosmos DB, Blob Storage, Key Vault, identity, and SignalR management integration |
| Infrastructure | Bicep and PowerShell 7 | Resource-group-scoped Azure provisioning and cross-platform operational scripts |

The API will use explicit domain, application, and infrastructure boundaries.
Domain packages must not import Fastify, Azure SDKs, React, or CLI libraries.
Adapters will implement interfaces owned by the application layer so tests can
replace Azure dependencies without changing domain behavior.

Validators will inspect structured submissions, evidence, and recorded tool
interactions. They will not execute arbitrary participant source code.
Simulator modules remain isolated behind contracts so a module can move to a
separate Container App later without changing participant-facing APIs.

### Repository tooling

The repository will be a **pnpm workspace monorepo** orchestrated by
**Turborepo**.

- The root `package.json` will pin the package manager and Node.js engine.
- `pnpm-lock.yaml` is the single JavaScript dependency lock file.
- Shared TypeScript configuration will enable strict type checking.
- ESLint will enforce correctness rules; Prettier will own formatting.
- Vitest will cover unit and contract tests.
- Playwright will cover browser and end-to-end instructor journeys.
- k6 will execute the event load profile.
- Markdownlint will validate maintained Markdown documentation.
- GitHub Actions will run install, lint, type-check, test, build, campaign
  validation, and infrastructure validation jobs.

Turborepo is limited to task orchestration and caching. Package boundaries and
dependencies remain standard pnpm workspace relationships so packages can be
built without Turborepo-specific runtime behavior.

Every shared package exposes a documented public entry point. Applications must
not import another package's internal source paths. Contract packages publish
JSON Schema artifacts as well as TypeScript declarations.

### Local development

The default local workflow will run application processes on the host with
pnpm and start only required backing services through Docker Compose.

The scaffolded repository will provide these commands:

```text
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Local development uses:

- Azurite for Blob Storage behavior.
- The Azure Cosmos DB emulator for persistence integration when supported by
  the developer environment.
- File-backed campaign packages for the normal inner loop.
- An in-process real-time adapter with the same application interface as the
  Azure SignalR adapter.
- Environment variables loaded from an ignored local file for non-secret
  settings.
- Azure Developer CLI or Azure CLI credentials only for tests explicitly
  targeting deployed Azure resources.

The domain and application test suites require neither Docker nor Azure.
Integration tests that require an emulator are separately selectable and skip
with an explicit diagnostic when the prerequisite is unavailable. Tests against
real Azure services run only in a disposable development environment.

The in-process real-time adapter is not a behavioral substitute for Azure
SignalR. Contract tests must run against both adapters, and deployment smoke
tests must prove connection, publish, reconnect, and state replay behavior.

### Deployment and distribution packaging

The MVP will use **Azure Container Apps for both application workloads** rather
than combining Container Apps with Azure Static Web Apps.

1. `mission-control-api` is a Linux OCI image containing the API, campaign
   engine, validation workers, and simulator modules.
2. `command-center` is a Linux OCI image that serves the compiled React assets
   from a minimal unprivileged web server.
3. Both images are built as multi-stage images, run as non-root users, expose
   health endpoints, and are tagged with an immutable commit SHA and a release
   version.
4. Images are pushed to Azure Container Registry and deployed to Azure
   Container Apps by Bicep and `scripts/deploy.ps1`.
5. The exact image digest, not a mutable tag, is promoted between environments.

Using Container Apps for the dashboard keeps one deployment, identity,
observability, revision, and rollback model. Static Web Apps can be reconsidered
if global static delivery, preview environments, or independent dashboard
release cadence becomes more valuable than operational uniformity.

The participant CLI is distributed as a versioned npm package and an npm
package tarball attached to GitHub releases. Event starter repositories pin a
compatible CLI major version. Standalone executable packaging is deferred until
event testing demonstrates that requiring Node.js is a material setup barrier.

Campaigns are packaged independently from application images as versioned
`.tgz` archives containing:

- A campaign manifest and schema version.
- Mission, simulator, validator-configuration, and localization data.
- An asset manifest with file checksums and provenance metadata.
- No executable participant-provided code or secrets.

Deployment uploads the selected campaign archive to Blob Storage and records
its immutable checksum. The Operation Lighthouse development campaign may be
included in source control for local use, but production containers do not
embed the active event campaign. This allows a reviewed campaign version to be
selected without rebuilding application images.

### Versioning and compatibility

- Applications and shared packages use semantic versioning.
- Public APIs are versioned in the URL and event envelopes carry a schema
  version.
- Campaign packs declare the supported platform and contract version ranges.
- Breaking contract changes require a new major schema version and an explicit
  migration or compatibility path.
- Container images, campaign archives, and the participant CLI are built once
  and promoted without rebuilding.

## Consequences

### Positive

- TypeScript contracts and localization keys can be shared across every
  participant-facing and instructor-facing application.
- One package manager and one primary test stack reduce contributor setup.
- Fastify and TypeBox support schema-first request validation without coupling
  the published JSON contracts to framework types.
- Container Apps provides a uniform deployment and rollback model for the API
  and dashboard.
- Campaign releases are independent, immutable, and auditable.
- Azure adapters can evolve without leaking cloud SDK types into domain logic.

### Trade-offs

- The API process contains several logical components, so resource isolation is
  coarser than a microservice design.
- The local real-time adapter cannot reproduce every Azure SignalR behavior;
  deployed integration and smoke tests are mandatory.
- Containerizing static dashboard assets costs more and may have higher global
  latency than a dedicated static hosting service.
- Node.js is a prerequisite for the initial participant CLI distribution.
- Turborepo adds configuration beyond plain workspace scripts and must not
  become a source of hidden package coupling.

## Alternatives considered

### .NET for the API with TypeScript for web and CLI

.NET provides strong Azure integration and mature service tooling, but it would
introduce a second application language and duplicate contract-generation
workflows. The initial scale and validator model do not justify that additional
complexity.

### Next.js for the Command Center

The dashboard is an authenticated client application backed by the Mission
Control API and does not require server-side rendering or search indexing.
React with Vite has a smaller runtime and deployment surface for this use case.

### npm or Yarn workspaces

Both can support the repository. pnpm was selected for strict dependency
boundaries, efficient installation, workspace filtering, and deterministic
monorepo behavior.

### Nx

Nx offers deeper generators and dependency analysis. Turborepo plus explicit
workspace packages is sufficient for the planned repository and imposes less
framework-specific structure before the monorepo exists.

### Azure Static Web Apps for the dashboard

Static Web Apps is a valid future option, but it creates a separate deployment
and authentication surface. Container Apps is preferred for the MVP's
one-command, event-scoped operations.

### Separate services for each validator and simulator

Independent services provide stronger isolation but increase image count,
deployment time, health coordination, and event-day failure modes. The selected
modular monolith preserves extraction boundaries while minimizing MVP
operations.

## Follow-up decisions

This ADR does not select resource SKUs, participant credential details, Entra
application provisioning, retention periods, or CI/CD release approvals. Those
decisions require their own ADRs when the corresponding infrastructure,
authentication, and release roadmap tasks begin.

Revisit this decision if load tests cannot meet the three-second dashboard
update target, validation workloads require independent scaling or isolation,
or participant setup data shows that the Node.js CLI prerequisite is
unacceptable.
