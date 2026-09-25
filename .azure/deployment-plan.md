# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

## 1. Project Overview

**Goal:** Implement TASK-207 safe environment destruction.

**Path:** Add exact-scope cleanup automation to the standalone Bicep platform.

## 2. Requirements

- Target only one explicitly named environment resource group.
- Verify subscription, resource group identity, and managed tags before deletion.
- Show the exact resources and deletion blockers.
- Require typed confirmation immediately before deletion.
- Reject non-interactive bypass by default.
- Poll deletion status and report soft-deleted Key Vault handling.
- Never broaden cleanup to a subscription or wildcard scope.
- Default context: subscription `4e4f76f7-bfb7-4163-84bd-2a19561451b5`,
  region `canadaeast`.

## 3. Components Detected

- Subscription-scoped deployment creates exactly one tagged environment
  resource group.
- Resource group tags include `managedBy=bicep`, `workload`, `environment`, and
  `owner`.
- Development defaults disable Key Vault purge protection, while retained
  environments may enable it.
- No cleanup automation exists yet.

## 4. Recipe Selection

**Selected:** PowerShell plus Azure CLI against the existing Bicep contract.

## 5. Architecture

| Safeguard | Decision |
|-----------|----------|
| Required target | Caller must provide the full resource-group name and expected environment |
| Subscription | Set and echo the exact subscription before inspection |
| Ownership check | Require `managedBy=bicep`, matching `workload`, and matching `environment` tags |
| Scope check | Resolve and display the exact resource-group resource ID; reject wildcard-like names |
| Inventory | List every resource in the group before confirmation |
| Blockers | Detect resource-group/resource locks and stop without deleting |
| Key Vault | Report purge-protection state and expected soft-delete retention; never purge |
| Confirmation | Require typing `delete <resource-group-name>`; no force/bypass option |
| Execution | Issue only `az group delete --name <exact-name> --yes --no-wait` |
| Status | Poll `az group exists` until false or timeout; report incomplete deletion explicitly |
| Preview | `-PreviewOnly` performs every check but never prompts or deletes |

The script does not enumerate or delete unrelated groups, does not delete at
subscription scope, and does not purge recoverable services.

## 6. Execution Checklist

- [x] Complete planning and approval
- [x] Generate exact-scope cleanup script
- [x] Add status/blocker checks
- [x] Document destructive safeguards
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
| Script parser | PowerShell AST parser | Passed | 2026-09-25 |
| Missing target | `destroy.ps1 -PreviewOnly` | Safe no-op | 2026-09-25 |
| Unmanaged target | `destroy.ps1 -PreviewOnly` | Rejected before deletion | 2026-09-25 |
| Bicep | `az bicep lint/build` | Passed | 2026-09-25 |
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

- **Status:** Verified; TASK-207 adds no role assignments.
- **Cleanup authorization:** Azure CLI uses only the signed-in principal's
  existing management-plane permissions.
- **Scope:** The script resolves one exact resource-group ID and does not grant,
  elevate, or modify access.
- **Issues:** None.

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `scripts/destroy.ps1` | Guarded exact-resource-group deletion | Complete |
| `package.json` | Repository cleanup command | Complete |
| `infra/README.md` | Safeguards and recovery behavior | Complete |
| `PLAN.md` | Complete TASK-207 | Complete |

## 10. Next Steps

> Current: Validated; ready for TASK-207 publication

1. Complete the official azure-validate workflow.
2. Publish TASK-207 without deleting Azure resources.
