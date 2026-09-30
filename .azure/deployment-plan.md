# Azure Deployment Plan

> **Status:** In Progress
>
> **Current scope:** Workshop quality and production integration preparation.
> No Azure provisioning or deployment is authorized for this extension.

Generated: 2026-09-25
Preparation extension: 2026-09-29

Sections 1-10 preserve the historical TASK-208 infrastructure validation record.
That evidence does not validate the new workshop runtime. Section 11 records
the current preparation work and its separate approval and validation gates.

## 1. Project Overview

**Goal:** Implement TASK-208 infrastructure validation.

**Path:** Add repeatable local/CI validation and optional deployed smoke tests.

## 2. Requirements

- Build and lint all Bicep entrypoints and parameter files.
- Run static security checks for passwordless and least-privilege invariants.
- Run Azure ARM validation and what-if without deployment.
- Support optional smoke tests against an explicitly named deployed environment.
- Verify app HTTPS endpoints, resource provisioning states, identity attachment,
  passwordless settings, and campaign container privacy.
- Produce an actionable pass/fail summary and nonzero exit code.
- Default context: subscription `4e4f76f7-bfb7-4163-84bd-2a19561451b5`,
  region `canadaeast`.

## 3. Components Detected

- Standalone subscription- and resource-group-scoped Bicep templates.
- Passwordless controls are explicit in the compiled template: ACR admin off,
  Storage Shared Key off, Cosmos/SignalR local auth off, private Blob container,
  RBAC Key Vault, and HTTPS-only Container Apps ingress.
- Deployment and guarded destruction scripts already expose stable environment
  conventions and outputs.
- No GitHub Actions workflows currently validate infrastructure changes.

## 4. Recipe Selection

**Selected:** PowerShell validation orchestrator over Bicep and Azure CLI.

## 5. Architecture

| Validation layer | Decision |
|------------------|----------|
| Offline build | Lint/build both Bicep entrypoints and compile both parameter files in a temporary directory |
| Static security | Assert compiled ARM invariants and reject credential/list-key outputs or broad workload role scopes |
| Azure preflight | Unless `-Offline`, authenticate, validate the subscription deployment, and run JSON what-if |
| Smoke mode | When `-ResourceGroupName` is supplied, require exact managed tags and verify live resource settings |
| Endpoint smoke | Resolve deployment outputs and perform HTTPS GETs against API and dashboard URLs |
| Campaign smoke | Verify private campaign container and at least one seeded campaign archive |
| Summary | Emit named PASS/FAIL/SKIP rows and exit nonzero if any required check fails |
| CI | Add an offline GitHub Actions workflow for infrastructure file changes |

Smoke tests never create, update, or delete resources. They operate only on an
explicitly named existing resource group.

## 6. Execution Checklist

- [x] Complete planning and approval
- [x] Generate infrastructure validation script
- [x] Add static security assertions
- [x] Add optional deployed smoke tests
- [x] Document local and Azure modes
- [x] Run local verification
- [x] Set `Ready for Validation`
- [x] Complete azure-validate workflow
- [x] All validation checks pass
  - [x] Core validation (CLI, authentication, Bicep build, ARM validation, and what-if)
  - [x] Bicep linting
  - [x] Azure Policy validation

## 7. Validation Proof

| Check | Command | Result | Timestamp |
|-------|---------|--------|-----------|
| Offline infrastructure validation | `pnpm validate:infra -- -Offline` | 12 passed, 2 skipped | 2026-09-25 |
| Authenticated infrastructure validation | `pnpm validate:infra` | 14 passed, 1 skipped | 2026-09-25 |
| ARM what-if safety | `scripts/validate-infra.ps1` | 25 analyzed changes, 0 deletes | 2026-09-25 |
| Formatting | `pnpm format:check` | Passed | 2026-09-25 |
| Peer dependencies | `pnpm peers check` | Passed | 2026-09-25 |
| Lint | `pnpm lint` | Passed | 2026-09-25 |
| Types | `pnpm typecheck` | Passed | 2026-09-25 |
| Tests | `pnpm test` | Passed | 2026-09-25 |
| Build | `pnpm build` | Passed | 2026-09-25 |
| Official ARM validation | `validate-deployment.ps1 -Scope sub` | Passed | 2026-09-25 |
| Official ARM what-if | `validate-deployment.ps1 -Scope sub` | 21 creates, 0 modifies, 0 deletes | 2026-09-25 |
| Azure Policy | `az policy assignment list` | No conflicting assignments | 2026-09-25 |

## 8. Role Assignment Verification

- **Status:** Verified; TASK-208 adds no Azure roles.
- **Static coverage:** The validator rejects Owner and generic Contributor role
  definition IDs in the compiled template.
- **Live coverage:** Optional smoke mode reads existing resources with the
  caller's current permissions and does not modify RBAC.
- **Issues:** None.

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `scripts/validate-infra.ps1` | Offline, ARM, and deployed smoke validation | Complete |
| `.github/workflows/infra-validation.yml` | Pull-request offline infrastructure checks | Complete |
| `package.json` | Repository infrastructure validation command | Complete |
| `infra/README.md` | Validation modes and expected outputs | Complete |
| `PLAN.md` | Complete TASK-208 | Complete |

## 10. Next Steps

> Current: Validated; ready for TASK-208 publication

1. Complete the official azure-validate workflow.
2. Publish TASK-208.

## 11. Workshop runtime preparation extension

**Mode:** MODIFY. Preserve the existing repository, accepted architecture,
Bicep templates, PowerShell deployment workflow and approved workshop assets.

**Approved scope:** Complete local technical readiness and prepare the
production integration without provisioning Azure. Work through bounded
deliveries, with a separate commit for each. Human authoring, facilitation,
pilot participation and live-service sign-off must not be synthesized.

**Approved profile:** The user selected the bounded single-API-replica MVP
with durable state and Azure SignalR Serverless. Prepare this profile without
deploying it; multi-replica high availability is not part of this pass.

### Current findings

- The local workshop has complete simulator observations and a versioned
  pedagogical decision-recovery model.
- The normal API entry point still exposes configuration and health routes,
  not the operational workshop routes.
- Runtime repositories, simulator observations, idempotency and recovery
  contributions are currently in memory.
- ADR 0001 selects Container Apps, Cosmos DB, Blob Storage, Key Vault,
  managed identity and Azure SignalR. Do not replace these choices with an
  unrelated stack or initialize the existing project from a template.
- The historical subscription and region above are not approval to provision
  resources for this extension. Any future live work needs a separately
  confirmed destination and authorization.

### Proposed delivery sequence

| Delivery | Outcome | Status |
| --- | --- | --- |
| Expanded local scenarios | Fifty logical units exercise actual simulator calls, evaluated submissions and public dashboard updates, including bounded retries and scope isolation. | Complete locally: 250 core passes, 550 scoped simulator observations and a real public browser; no live Azure evidence claimed. |
| Operational guardrails | Request budgets, safe failure handling and explicit operational limits preserve legitimate classroom traffic. | Pending |
| Accessibility | Automated browser coverage plus a recorded boundary for the remaining human keyboard, projector and screen-reader rehearsal. | Pending |
| Production runtime | Share domain behavior through explicit runtime ports instead of exposing the loopback rehearsal server publicly. | Design proposed below |
| Durable state | Prepare the accepted persistence adapters, restart/idempotency behavior and retention boundaries. | Design proposed below |
| Identity and real-time delivery | Prepare instructor identity and redacted, scoped real-time/reconnect integration without a deployment. | Design proposed below |
| Rehearsal kit and final validation | Reconcile operating guides, prepare reproducible clean-setup rehearsal steps and run applicable offline validation. Keep human and live-service gates open. | Pending |

### Proposed implementation design

| Concern | Proposed approach |
| --- | --- |
| Runtime modes | Keep the existing explicitly loopback-only memory adapter. Add a separately configured hosted composition; it must fail closed when required identity, signing-key or storage configuration is missing, never fall back to the rehearsal adapter. |
| Initial hosted scale | One API replica for the first hosted profile. Retain optimistic concurrency protection for restarts and revision handoffs. Multi-replica throughput and high availability are not claimed by local evidence. |
| Durable state | Use the existing Cosmos `state` container and event-session partition boundary. Commit related state, idempotency and publication records together; respect transaction/item limits instead of storing an unbounded room snapshot in one item. Preserve simulator receipts and decision provenance on restart. |
| Identity | Verify instructor Entra tokens, tenant, audience, lifetime, roles and event ownership. Keep participant credentials short-lived and event scoped; acquire production signing material through the accepted Key Vault/managed-identity boundary. Do not put instructor credentials into the public page. |
| Real time | Keep Azure SignalR, but use Serverless mode and its documented Entra-authenticated REST APIs for the Node backend. Public connections receive only redacted event-specific projections, with revision checks and snapshot recovery. |
| Publication failures | State durability is independent from real-time availability. Retain pending publication for retry and recover current state through the authenticated/public-safe snapshot API; do not claim a failed publication succeeded. |
| Packaging | Build actual API and dashboard images rather than treating the bootstrap hello-world image as workshop readiness. Prepare Bicep/configuration changes without executing a deployment or modifying live RBAC. |
| Evidence | Exercise the same contracts with local adapters and transport doubles, clearly labeled. Live Cosmos/Entra/SignalR, real human authoring and the pilot remain separate gates. |

The current SignalR template uses `Default` mode and the `SignalR App Server`
role. Official service documentation confirms that Default mode requires a
connected hub server; a standalone Node REST publisher does not supply that
server connection. The proposed Node-compatible Serverless negotiation path
requires authentication and REST permissions, documented under the
resource-scoped `SignalR Service Owner` data-plane role.

Alternatives considered: add an ASP.NET hub relay to retain Default mode
(another language/workload), or replace SignalR with another real-time service
(changes the accepted architecture). Neither is needed for the proposed MVP.
Preparing a horizontally scaled, highly available runtime now is also possible,
but expands concurrency/coordination and verification work beyond the bounded
single-replica profile proposed here.

Official references reviewed for the design:

- [SignalR service modes](https://learn.microsoft.com/en-us/azure/azure-signalr/concept-service-mode)
- [SignalR managed-identity permissions](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-howto-authorize-managed-identity)
- [SignalR data-plane REST API](https://learn.microsoft.com/en-us/azure/azure-signalr/signalr-reference-data-plane-rest-api)
- [Cosmos transactional batches](https://learn.microsoft.com/en-us/azure/cosmos-db/transactional-batch)

### Planning gate

- [x] Record the user's preparation-only scope.
- [x] Preserve the accepted architecture and existing infrastructure workflow.
- [x] Inspect existing runtime interfaces and finish the implementation design.
- [x] Confirm the bounded implementation plan before production integration.
- [ ] Research official service/SDK guidance before generating Azure adapters.

### Validation boundary

No new deployment, ARM what-if, Azure resource mutation, role assignment or
subscription selection has been performed. Local fixtures and transport
doubles will be labeled as such; they are not evidence of live Cosmos DB,
Entra ID, SignalR or a human-led workshop.
