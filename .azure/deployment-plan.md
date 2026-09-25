# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

---

## 1. Project Overview

**Goal:** Implement TASK-202 by adding workload-specific user-assigned managed
identities, one environment-scoped Key Vault, and least-privilege secret-read
RBAC to the existing Bicep orchestration.

**Path:** Add Components

---

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production workshop platform with disposable environments |
| Scale | Two application workloads and up to 50 participants |
| Budget | Cost-optimized standard Key Vault |
| Subscription | `ME-MngEnvMCAP266581-lramoscostah-3` (`4e4f76f7-bfb7-4163-84bd-2a19561451b5`) |
| Location | `eastus2`, configurable |
| Authorization | Azure RBAC; legacy Key Vault access policies prohibited |
| Identity boundary | Separate API and dashboard identities |
| Secret boundary | API can read secret values; dashboard has no vault access |
| Deletion | Soft delete enabled; purge protection configurable for disposable vs. long-lived environments |

### Policy Constraints

The two subscription-level Microsoft Defender assignments do not restrict
managed identities, Key Vault, or resource-scoped RBAC. Both resource providers
are registered and advertise `East US 2`.

---

## 3. Components Detected

| Component | Type | Technology | Path |
|-----------|------|------------|------|
| Bicep orchestration | Infrastructure | Resource-group-scoped Bicep | `infra/main.bicep` |
| Shared naming and tags | Infrastructure modules | Bicep | `infra/modules` |
| Mission Control API | Secret-consuming workload | Node.js/Container Apps target | `apps/api` |
| Command Center | Public web workload | React/Container Apps target | `apps/command-center` |

---

## 4. Recipe Selection

**Selected:** Bicep

**Rationale:** Extend the validated standalone Bicep foundation with a local
identity/secrets capability module and explicit outputs for TASK-205.

---

## 5. Architecture

| Component | Azure Service | Security configuration |
|-----------|---------------|------------------------|
| API identity | User-assigned managed identity | Receives only `Key Vault Secrets User` on the environment vault |
| Dashboard identity | User-assigned managed identity | No Key Vault role; later receives only roles required by hosting |
| Secret store | Key Vault Standard | Azure RBAC, soft delete, optional purge protection, no deployment/template access |
| Role assignment | Azure RBAC | Deterministic assignment scoped to the Key Vault resource |

The module creates no secrets. Secret material must never enter Bicep
parameters, deployment outputs, or deployment history. TASK-206 will seed
required secrets through an authenticated operational step.

Public network access remains enabled because no private-networking task exists
in the current roadmap. Access still requires Microsoft Entra authentication
and vault-scoped RBAC.

### Outputs

- Key Vault resource ID, name, and URI
- API identity resource ID, client ID, and principal ID
- Dashboard identity resource ID, client ID, and principal ID

### Role Assignment Verification

- **API identity:** `Key Vault Secrets User`
  (`4633458b-17de-408a-b874-0445c86b69e6`) at Key Vault scope
- **Dashboard identity:** no role assignment in TASK-202
- **Administrative roles:** none granted
- **Secrets Officer/Administrator:** intentionally not granted to workloads

---

## 6. Provisioning Limit Checklist

The Microsoft Quota API returned no quota resources for
`Microsoft.ManagedIdentity` or `Microsoft.KeyVault` in `eastus2`. Azure Resource
Graph found zero existing resources of these types in the subscription and
region.

| Resource Type | Number to Deploy | Total After Deployment | Limit/Quota | Notes |
|---------------|------------------|------------------------|-------------|-------|
| `Microsoft.ManagedIdentity/userAssignedIdentities` | 2 | 2 | No provider quota exposed | Far below documented creation-rate and tenant object limits |
| `Microsoft.KeyVault/vaults` | 1 | 1 | No provider quota exposed | Standard vault service limits apply to operations, not this resource count |
| `Microsoft.Authorization/roleAssignments` | 1 | 1 new | 4,000 per subscription | Deterministic vault-scoped assignment |

**Status:** All resources within documented limits.

---

## 7. Execution Checklist

### Phase 1: Planning

- [x] Analyze workspace and requirements
- [x] Confirm Azure context and policies
- [x] Prepare resource inventory and validate limits
- [x] Research identity, Key Vault, and RBAC guidance
- [x] Finalize architecture and role boundaries
- [x] User approved completion of all remaining roadmap tasks

### Phase 2: Execution

- [x] Generate identity and secrets module
- [x] Wire parameters and outputs into orchestration
- [x] Document RBAC, deletion, and secret boundaries
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
| Bicep lint and build | `az bicep lint`; `az bicep build`; `az bicep build-params` | Pass | 2026-09-25T12:00:26-04:00 |
| Azure preflight | `validate-deployment.ps1 -Scope group -ResourceGroup rg-cyberdeck` | Pass: 7 creates, 0 modifies, 0 deletes | 2026-09-25T12:02:42-04:00 |
| Static RBAC review | API identity -> Key Vault Secrets User at Key Vault scope; dashboard -> no role | Pass: least privilege and deterministic assignment | 2026-09-25T12:03:22-04:00 |
| Quota and policy | Quota scripts, Azure Resource Graph, provider and policy queries | Pass: providers available, zero existing resources, no conflicting policy | 2026-09-25T11:59:20-04:00 |
| Monorepo regression | `pnpm format:check && pnpm peers check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` | Pass | 2026-09-25T12:01:25-04:00 |

**Validated by:** azure-validate workflow
**Validation timestamp:** 2026-09-25T12:03:47-04:00

---

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | TASK-202 preparation and validation record | Complete |
| `infra/modules/identity-secrets.bicep` | Identities, Key Vault, and RBAC | Complete |
| `infra/modules/naming.bicep` | Separate API and dashboard identity names | Complete |
| `infra/main.bicep` | Composition, parameters, and identity outputs | Complete |
| `infra/main.bicepparam` | Disposable-development vault settings | Complete |
| `infra/README.md` | Identity, RBAC, and secret operational contract | Complete |

---

## 10. Next Steps

> Current: TASK-202 validated; ready for commit and pull request

1. Implement the identity/secrets module.
2. Complete local and Azure validation.
3. Publish and merge TASK-202 before starting TASK-203.
