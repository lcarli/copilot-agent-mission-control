# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

## 1. Project Overview

**Goal:** Implement TASK-204 with passwordless Azure SignalR Service and
centralized diagnostics.

**Path:** Add Components

## 2. Requirements

- Up to 50 participants plus instructor/dashboard connections.
- Default service mode with the Mission Control API as the hub server.
- Microsoft Entra authentication only; no SignalR access keys.
- Existing Log Analytics workspace receives connectivity and HTTP logs.
- Subscription: `ME-MngEnvMCAP266581-lramoscostah-3`; location `eastus2`.

`Microsoft.SignalRService` is not yet registered in the subscription. Provider
registration is required for validation and is also added to TASK-206 preflight.

## 3. Components Detected

| Component | Integration |
|-----------|-------------|
| Mission Control API identity | SignalR App Server role |
| Command Center | SignalR client through API negotiation |
| Log Analytics | SignalR diagnostics destination |

## 4. Recipe Selection

**Selected:** Bicep.

## 5. Architecture

| Setting | Value |
|---------|-------|
| Resource | Azure SignalR Service |
| SKU | `Standard_S1`, capacity 1 (1,000 connections) |
| Service mode | Default |
| Authentication | Microsoft Entra only (`disableLocalAuth: true`) |
| RBAC | API identity -> SignalR App Server at service scope |
| Logging | Connectivity and HTTP request diagnostics to Log Analytics |
| Network | Public client/server connectivity; no private-network roadmap task |

No access keys or connection strings are emitted. Applications receive the
service hostname and use managed identity for server authorization.

## 6. Provisioning Limit Checklist

Quota CLI returned no SignalR quota entries. There are zero SignalR resources in
East US 2. One Standard unit supports 1,000 concurrent connections, exceeding
the 50-participant requirement.

| Resource | Deploy | Capacity |
|----------|-------:|----------|
| SignalR Standard units | 1 | 1,000 connections |
| Diagnostic settings | 1 | Below five-per-resource limit |
| Role assignments | 1 | Within ARM limits |

## 7. Execution Checklist

- [x] Complete planning and approval
- [x] Register provider for validation
- [x] Generate SignalR module and RBAC
- [x] Wire configuration and outputs
- [x] Document real-time contract
- [x] Run local verification
- [x] Set `Ready for Validation`
- [x] Invoke azure-validate
- [x] All validation checks pass
  - [x] Core validation: CLI, authentication, Bicep build, resource-group validation, and what-if
  - [x] Bicep linting
  - [x] Azure Policy validation
- [x] Update status to `Validated`
- [x] Record proof

## 8. Validation Proof

| Check | Command | Result | Timestamp |
|-------|---------|--------|-----------|
| Bicep and monorepo | Bicep lint/build and full pnpm regression | Pass | 2026-09-25T12:12:43-04:00 |
| Azure preflight | Resource-group validate and what-if | Pass: 16 creates, 0 modifies, 0 deletes | 2026-09-25T12:14:15-04:00 |
| RBAC review | API -> SignalR App Server at SignalR scope | Pass | 2026-09-25T12:14:51-04:00 |
| Provider/policy | Register Microsoft.SignalRService and review policies | Pass | 2026-09-25T12:12:00-04:00 |

**Validated by:** azure-validate workflow
**Validation timestamp:** 2026-09-25T12:14:51-04:00

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | TASK-204 source of truth | Complete |
| `infra/modules/realtime.bicep` | SignalR, diagnostics, and RBAC | Complete |
| `infra/main.bicep` | Composition and outputs | Complete |
| `infra/README.md` | Real-time configuration contract | Complete |

## 10. Next Steps

> Current: TASK-204 validated; ready for commit and pull request

1. Register the provider and implement the module.
2. Validate and publish TASK-204.
