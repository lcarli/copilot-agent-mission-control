# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

---

## 1. Project Overview

**Goal:** Implement TASK-200 by creating the standalone, resource-group-scoped
Bicep foundation used by the later Azure infrastructure tasks. This task adds
orchestration, parameters, deterministic naming, and common tags only; it does
not deploy Azure resources.

**Path:** Modernize Existing

The repository already defines Azure Container Apps as its target platform and
contains an `infra/` placeholder, but it does not yet contain deployable Azure
configuration.

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production workshop platform |
| Scale | Small: up to 50 concurrent participants |
| Budget | Balanced, with disposable per-event environments |
| Subscription | `ME-MngEnvMCAP266581-lramoscostah-3` (`4e4f76f7-bfb7-4163-84bd-2a19561451b5`) |
| Location | `eastus2` default parameter value; configurable at deployment |
| Compliance | No task-specific regulated-data or residency requirement |

The subscription and location are recorded to make validation reproducible.
TASK-200 does not connect to or modify the subscription. Deployment tasks must
reconfirm the target context before provisioning.

### Policy Constraints

Not applicable to TASK-200 because it creates local Bicep source only and
provisions no Azure resources. Policy assignments must be checked before the
first provisioning task.

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| Mission Control API | API | Node.js, TypeScript, Fastify target | `apps/api` |
| Command Center | Frontend | React/Vite target | `apps/command-center` |
| Participant CLI | CLI | Node.js, TypeScript, Commander target | `apps/participant-cli` |
| Shared capabilities | Libraries | TypeScript packages | `packages` |
| Azure infrastructure | Infrastructure | Bicep and PowerShell 7 | `infra` |

---

## 4. Recipe Selection

**Selected:** Bicep

**Rationale:** ADR 0001 requires resource-group-scoped Bicep and PowerShell 7.
The roadmap separately assigns one-command orchestration to TASK-206, so
TASK-200 should establish standalone Bicep contracts without introducing AZD
or deployment scripts prematurely.

---

## 5. Architecture

**Stack:** Containers

TASK-200 establishes only the composition contract. Capability resources remain
owned by their dedicated roadmap tasks.

### Future Service Mapping

| Component | Azure Service | Roadmap task |
|-----------|---------------|--------------|
| Monitoring | Log Analytics and Application Insights | TASK-201 |
| Identity and secrets | Managed Identity and Key Vault | TASK-202 |
| Data and campaigns | Cosmos DB and Blob Storage | TASK-203 |
| Real-time updates | Azure SignalR Service | TASK-204 |
| API and dashboard | Azure Container Apps and Container Registry | TASK-205 |

### TASK-200 Foundation

| Capability | Implementation |
|------------|----------------|
| Deployment scope | Resource group |
| Environment parameters | Name, location, workload, owner, and optional tags |
| Naming | Central module with deterministic, Azure-compliant names |
| Tags | Central module with required and caller-supplied tags |
| Extensibility | Capability modules added by TASK-201 through TASK-205 |

### Role Assignment Verification

- **Status:** Verified; not applicable to this foundation-only task
- **Identities checked:** None provisioned by TASK-200
- **Roles confirmed:** None defined by TASK-200
- **Issues:** Identity and least-privilege data-plane assignments are owned by
  TASK-202 and must be reviewed when those resources are introduced

---

## 6. Provisioning Limit Checklist

TASK-200 provisions no Azure resources and consumes no subscription quota.

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| None | 0 | 0 | Not applicable | Local Bicep source generation and build validation only |

**Status:** All resources within limits; no quota-bearing resources are part of
TASK-200.

---

## 7. Execution Checklist

### Phase 1: Planning

- [x] Analyze workspace
- [x] Gather requirements from the accepted roadmap and architecture ADR
- [x] Record the available subscription and configurable default location
- [x] Prepare resource inventory
- [x] Establish that TASK-200 consumes no quota
- [x] Scan codebase
- [x] Select standalone Bicep recipe
- [x] Plan foundation architecture
- [x] User approved completion of all remaining roadmap tasks

### Phase 2: Execution

- [x] Research Bicep composition and validation guidance
- [x] Generate resource-group-scoped Bicep foundation
- [x] Add naming and tagging modules
- [x] Add parameter examples and infrastructure documentation
- [x] Build and lint Bicep
- [x] Update plan status to `Ready for Validation`

### Phase 3: Validation

- [x] Invoke azure-validate skill
- [x] All validation checks pass
  - [x] Core validation: Azure CLI, authentication, Bicep build, resource-group validation, and what-if
  - [x] Bicep linting
  - [x] Azure Policy validation
- [x] Update plan status to `Validated`
- [x] Record validation proof below

### Phase 4: Deployment

- [ ] Deferred to TASK-206; TASK-200 performs no deployment

---

## 8. Validation Proof

| Check | Command Run | Result | Timestamp |
|-------|-------------|--------|-----------|
| Bicep lint and local build | `az bicep lint --file infra/main.bicep`; `az bicep build`; `az bicep build-params` | Pass | 2026-09-25T11:48:54-04:00 |
| Azure preflight | `validate-deployment.ps1 -Scope group -ResourceGroup rg-cyberdeck` | Pass: CLI, auth, build, validate, and what-if; 0 creates, modifies, or deletes | 2026-09-25T11:50:52-04:00 |
| Subscription policies | `az policy assignment list --scope /subscriptions/4e4f76f7-bfb7-4163-84bd-2a19561451b5` | Pass: two Defender assignments; no TASK-200 conflict | 2026-09-25T11:49:33-04:00 |
| Monorepo regression | `pnpm format:check && pnpm peers check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` | Pass | 2026-09-25T11:48:54-04:00 |

**Validated by:** azure-validate workflow
**Validation timestamp:** 2026-09-25T11:51:37-04:00

---

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | Preparation and validation source of truth | Complete |
| `infra/main.bicep` | Resource-group-scoped orchestration entry point | Complete |
| `infra/main.bicepparam` | Safe example deployment parameters | Complete |
| `infra/modules/naming.bicep` | Deterministic Azure resource names | Complete |
| `infra/modules/tags.bicep` | Required and caller-supplied common tags | Complete |
| `infra/README.md` | Foundation usage and extension contract | Complete |

---

## 10. Next Steps

> Current: TASK-200 validated; ready for commit and pull request

1. Generate and validate the Bicep foundation.
2. Hand the result to `azure-validate`.
3. Commit, publish, review, and merge TASK-200 before starting TASK-201.
