# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

---

## 1. Project Overview

**Goal:** Implement TASK-201 by provisioning one Log Analytics workspace and
one workspace-based Application Insights resource through the existing
resource-group-scoped Bicep orchestration.

**Path:** Add Components

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production workshop platform |
| Scale | Small: up to 50 concurrent participants |
| Budget | Balanced with explicit ingestion cost control |
| Subscription | `ME-MngEnvMCAP266581-lramoscostah-3` (`4e4f76f7-bfb7-4163-84bd-2a19561451b5`) |
| Location | `eastus2`, configurable through the foundation |
| Hosting | Node.js applications on Azure Container Apps |
| Retention | 30 days by default, configurable from 30 to 730 days |
| Daily ingestion cap | 1 GB by default; `-1` disables the cap explicitly |

### Policy Constraints

The subscription has two enforced Microsoft Defender assignments:

- ASC DataProtection
- ASC OpenSourceRelationalDatabasesProtection

Neither assignment restricts Log Analytics or Application Insights creation.
No location, naming, tag, or public-network deny policy was found at subscription
scope.

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| Bicep orchestration | Infrastructure | Resource-group-scoped Bicep | `infra/main.bicep` |
| Shared naming | Infrastructure module | Bicep | `infra/modules/naming.bicep` |
| Shared tags | Infrastructure module | Bicep | `infra/modules/tags.bicep` |
| Mission Control API | API | Node.js/TypeScript; Container Apps target | `apps/api` |
| Command Center | Frontend | React/Vite; Container Apps target | `apps/command-center` |

---

## 4. Recipe Selection

**Selected:** Bicep

**Rationale:** TASK-200 established standalone resource-group-scoped Bicep.
TASK-201 extends that contract with a focused local capability module.

---

## 5. Architecture

**Stack:** Containers with Azure Monitor observability

| Component | Azure Service | Configuration |
|-----------|---------------|---------------|
| Central logs | Log Analytics workspace | `PerGB2018`, 30-day retention, resource-context access, configurable daily cap |
| Application telemetry | Application Insights | Workspace-based `web` component linked to the Log Analytics workspace |

The workspace is shared by the later Container Apps environment and both
application workloads. Application code instrumentation is intentionally
deferred to the API/runtime tasks; this task exposes the Application Insights
connection string for later composition.

Public ingestion and query endpoints remain enabled because private networking
is outside the current roadmap scope. Local authentication remains enabled
because Azure Container Apps workspace integration uses the workspace customer
ID and shared key. No shared key is emitted by this module.

### Outputs

- Log Analytics resource ID and customer ID
- Application Insights resource ID and connection string

### Role Assignment Verification

- **Status:** Verified; no identities or role assignments are introduced
- **Future work:** TASK-202 owns managed identities and least-privilege RBAC

---

## 6. Provisioning Limit Checklist

The Microsoft Quota API returned no quota resources for
`Microsoft.OperationalInsights` or `Microsoft.Insights` in `eastus2`. Azure
Resource Graph found zero existing workspaces/components in the subscription
and region. Both providers are registered and advertise `East US 2`.

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| `Microsoft.OperationalInsights/workspaces` | 1 | 1 | No provider quota exposed | `az quota` unsupported for this type; region/provider verified |
| `Microsoft.Insights/components` | 1 | 1 | No provider quota exposed | `az quota` unsupported for this type; region/provider verified |

**Status:** All resources within documented service and ARM limits.

---

## 7. Execution Checklist

### Phase 1: Planning

- [x] Analyze workspace
- [x] Gather requirements
- [x] Confirm available Azure context
- [x] Prepare resource inventory
- [x] Validate limits through quota CLI and official service documentation
- [x] Scan codebase
- [x] Select Bicep recipe
- [x] Plan monitoring architecture
- [x] User approved completion of all remaining roadmap tasks

### Phase 2: Execution

- [x] Generate monitoring Bicep module
- [x] Wire module into orchestration
- [x] Add parameters, outputs, and documentation
- [x] Run local Bicep and monorepo verification
- [x] Update status to `Ready for Validation`

### Phase 3: Validation

- [x] Invoke azure-validate
- [x] All validation checks pass
  - [x] Core validation: CLI, authentication, Bicep build, resource-group validation, and what-if
  - [x] Bicep linting
  - [x] Azure Policy validation
- [x] Update status to `Validated`
- [x] Record validation proof

### Phase 4: Deployment

- [ ] Deferred to TASK-206

---

## 8. Validation Proof

| Check | Command Run | Result | Timestamp |
|-------|-------------|--------|-----------|
| Bicep lint and build | `az bicep lint`; `az bicep build`; `az bicep build-params` | Pass | 2026-09-25T11:54:55-04:00 |
| Azure preflight | `validate-deployment.ps1 -Scope group -ResourceGroup rg-cyberdeck` | Pass: 3 creates, 0 modifies, 0 deletes | 2026-09-25T11:57:16-04:00 |
| Quota and policy | `check-quota.ps1`, Azure Resource Graph, provider and policy queries | Pass: providers available, zero existing resources, no conflicting policy | 2026-09-25T11:53:15-04:00 |
| Monorepo regression | `pnpm format:check && pnpm peers check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` | Pass | 2026-09-25T11:55:50-04:00 |

**Validated by:** azure-validate workflow
**Validation timestamp:** 2026-09-25T11:58:05-04:00

---

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | TASK-201 preparation and validation record | Complete |
| `infra/modules/monitoring.bicep` | Log Analytics and Application Insights | Complete |
| `infra/main.bicep` | Monitoring parameters, module composition, and outputs | Complete |
| `infra/main.bicepparam` | Development monitoring defaults | Complete |
| `infra/README.md` | Monitoring configuration and output contract | Complete |

---

## 10. Next Steps

> Current: TASK-201 validated; ready for commit and pull request

1. Implement the monitoring module and orchestration wiring.
2. Validate locally and through the azure-validate workflow.
3. Publish and merge TASK-201 before starting TASK-202.
