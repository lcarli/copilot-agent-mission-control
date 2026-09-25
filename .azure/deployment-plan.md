# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

## 1. Project Overview

**Goal:** Implement TASK-206 one-command deployment.

**Path:** Add deployment automation to the existing standalone Bicep platform.

## 2. Requirements

- Preflight Azure CLI, authentication, subscription, providers, and local tools.
- Bicep build and what-if before any deployment.
- Explicit confirmation before Azure resource creation or modification.
- Deploy the resource-group-scoped platform.
- Publish bootstrap application images to ACR without registry credentials.
- Seed versioned campaign packages through Entra-authenticated Blob access.
- Update Container Apps to immutable image digests.
- Print non-sensitive resource and application outputs.
- Target subscription `4e4f76f7-bfb7-4163-84bd-2a19561451b5` in `canadaeast`.

## 3. Components Detected

- Resource-group-scoped Bicep platform with 20 planned resources.
- API and Command Center package shells using the public Container Apps
  bootstrap image until their application phases.
- Operation Lighthouse campaign workspace at version `0.0.0`; campaign content
  is intentionally minimal until Phase 6.
- No existing deployment scripts or `azure.yaml`.

## 4. Recipe Selection

**Selected:** Standalone Bicep plus PowerShell deployment orchestration.

## 5. Architecture

| Component | Decision |
|-----------|----------|
| Subscription entrypoint | Add subscription-scoped `infra/deploy.bicep` to create the resource group and invoke `main.bicep` |
| Preflight | Verify PowerShell, Azure CLI, Bicep, tar, Git, authentication, subscription, providers, and campaign path |
| Preview | Run subscription-scope ARM validation and what-if before deployment |
| Confirmation | Require explicit interactive confirmation unless `-Force` is supplied |
| Images | Import the reviewed Microsoft bootstrap image into ACR under commit-SHA tags, resolve digests, then redeploy the apps by digest |
| Campaign | Create a reproducible `.tgz`, compute SHA-256, upload archive and checksum with Entra authentication |
| Seeder RBAC | Grant the invoking principal Storage Blob Data Contributor only at the campaigns container scope |
| Summary | Print deployment ID, ACR, app URLs, image digests, campaign blob, and checksum; never print secrets |

Canada East is advertised for Container Apps, ACR, SignalR, Cosmos DB, and
Application Insights. The deployment remains passwordless: ACR import uses the
management plane, image pulls use managed identities, and campaign upload uses
the signed-in Entra principal.

## 6. Execution Checklist

- [x] Complete planning and approval
- [x] Generate deployment automation
- [x] Add image publishing and campaign seeding
- [x] Add output summary and documentation
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
| Deployment preview | `scripts/deploy.ps1 -PreviewOnly` | 21 creates, 5 unsupported analyses, no changes applied | 2026-09-25 |
| Bicep | `az bicep lint/build` | Passed | 2026-09-25 |
| Formatting | `pnpm format:check` | Passed | 2026-09-25 |
| Peer dependencies | `pnpm peers check` | Passed | 2026-09-25 |
| Lint | `pnpm lint` | Passed | 2026-09-25 |
| Types | `pnpm typecheck` | Passed | 2026-09-25 |
| Tests | `pnpm test` | Passed | 2026-09-25 |
| Build | `pnpm build` | Passed | 2026-09-25 |
| Diff hygiene | `git diff --check` | Passed | 2026-09-25 |
| Official ARM validation | `validate-deployment.ps1 -Scope sub` | Passed | 2026-09-25 |
| Official ARM what-if | `validate-deployment.ps1 -Scope sub` | 21 creates, 0 modifies, 0 deletes | 2026-09-25 |
| Azure Policy | `az policy assignment list` | No conflicting assignments | 2026-09-25 |

## 8. Role Assignment Verification

- **Status:** Verified
- **Campaign seeder:** Storage Blob Data Contributor at the `campaigns`
  container only; no account, resource-group, or subscription-wide data role.
- **Workload identities:** Existing API roles remain service-specific; API and
  dashboard retain AcrPull only at the registry.
- **Authentication:** ACR import uses the management plane, Blob upload uses
  the signed-in Entra principal, and no registry/storage credentials are
  generated or printed.
- **Issues:** None.

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `infra/deploy.bicep` | Subscription-scope resource group and platform entrypoint | Complete |
| `infra/deploy.bicepparam` | Safe development deployment parameters | Complete |
| `infra/modules/data-storage.bicep` | Optional campaign-seeder role assignment | Complete |
| `infra/main.bicep` | Pass campaign seeder identity | Complete |
| `scripts/deploy.ps1` | One-command orchestration | Complete |
| `package.json` | Repository deployment command | Complete |
| `infra/README.md` | Deployment and promotion documentation | Complete |
| `PLAN.md` | Complete TASK-206 | Complete |

## 10. Next Steps

> Current: Validated; ready for TASK-206 publication

1. Complete the official azure-validate workflow.
2. Publish TASK-206.
