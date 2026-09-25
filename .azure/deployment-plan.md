# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

## 1. Project Overview

**Goal:** Implement TASK-205 with ACR, a Consumption Container Apps
Environment, and externally accessible API/dashboard Container Apps.

**Path:** Add Components

## 2. Requirements

- Azure Container Registry with admin credentials and anonymous pull disabled.
- One shared Container Apps Environment connected to Log Analytics.
- Separate API/dashboard user-assigned identities and ACR pull assignments.
- One minimum replica per app to avoid workshop cold starts; maximum three.
- Bootstrap images until TASK-206 publishes immutable application images.
- Subscription `ME-MngEnvMCAP266581-lramoscostah-3`, region `eastus2`.

## 3. Components Detected

The API and Command Center are currently TypeScript package shells rather than
HTTP applications. TASK-205 therefore provisions functional bootstrap
containers. TASK-300 and TASK-400 implement the final servers; TASK-206 builds,
pushes, and switches to immutable image digests.

## 4. Recipe Selection

**Selected:** Standalone Bicep.

## 5. Architecture

| Resource | Configuration |
|----------|---------------|
| ACR | Basic, admin disabled, anonymous pull disabled, public endpoint |
| Container Apps Environment | Consumption, shared Log Analytics destination |
| API Container App | External HTTPS ingress, single revision, 1-3 replicas |
| Dashboard Container App | External HTTPS ingress, single revision, 1-3 replicas |
| Identities | Existing user-assigned API/dashboard identities |
| Registry RBAC | Each workload identity receives AcrPull at ACR scope |

The bootstrap image is `mcr.microsoft.com/azuredocs/containerapps-helloworld`.
Both apps use port 80 and root-path startup/readiness/liveness probes until
their final runtimes are implemented.

## 6. Provisioning Limit Checklist

Quota CLI exposed no relevant entries. Azure Resource Graph found zero ACR,
Container Apps Environments, or Container Apps in East US 2. Both providers
are registered.

| Resource | Deploy | Limit assessment |
|----------|-------:|------------------|
| Container Apps Environment | 1 | Below regional managed-environment limits |
| Container Apps | 2 | Below environment/application limits |
| ACR Basic registry | 1 | Below subscription/region limits |
| AcrPull role assignments | 2 | Within ARM limits |

## Execution Checklist

- [x] Complete planning and approval
- [x] Generate container runtime module
- [x] Add registry and runtime RBAC
- [x] Configure API and dashboard applications
- [x] Defer Dockerfiles until application runtimes exist
- [x] Document runtime operations
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
| Bicep | `az bicep lint/build/build-params` | Passed | 2026-09-25 |
| Formatting | `pnpm format:check` | Passed | 2026-09-25 |
| Peer dependencies | `pnpm peers check` | Passed | 2026-09-25 |
| Lint | `pnpm lint` | Passed | 2026-09-25 |
| Types | `pnpm typecheck` | Passed | 2026-09-25 |
| Tests | `pnpm test` | Passed | 2026-09-25 |
| Build | `pnpm build` | Passed | 2026-09-25 |
| Diff hygiene | `git diff --check` | Passed | 2026-09-25 |
| ARM validation | `validate-deployment.ps1` | Passed | 2026-09-25 |
| ARM what-if | `validate-deployment.ps1` | 20 creates, 0 modifies, 0 deletes | 2026-09-25 |
| Azure Policy | `az policy assignment list` | No conflicting assignments | 2026-09-25 |

## 8. Role Assignment Verification

- **Status:** Verified
- **API identity:** Key Vault Secrets User at vault scope, Cosmos DB Built-in
  Data Contributor at account scope, Storage Blob Data Contributor at campaign
  container scope, SignalR App Server at service scope, and AcrPull at registry
  scope.
- **Dashboard identity:** AcrPull at registry scope. The bootstrap dashboard
  currently performs no Azure data-plane operations.
- **Scope review:** All assignments target their specific service resource; no
  subscription-level or resource-group-level workload grants are used.
- **Issues:** None.

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | TASK-205 source of truth | Complete |
| `infra/modules/container-runtime.bicep` | ACR, environment, apps, and RBAC | Complete |
| `infra/main.bicep` | Runtime composition and outputs | Complete |
| `infra/main.bicepparam` | Bootstrap image settings | Complete |
| `infra/README.md` | Runtime deployment contract | Complete |

## 10. Next Steps

> Current: Validated; ready for TASK-205 publication

1. Implement and validate the container runtime.
2. Publish and merge TASK-205.
