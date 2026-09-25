# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

## 1. Project Overview

**Goal:** Implement TASK-203 with passwordless Cosmos DB event/state storage
and private Blob Storage for versioned campaign packages.

**Path:** Add Components

## 2. Requirements

| Attribute | Value |
|-----------|-------|
| Classification | Production workshop platform |
| Scale | Up to 50 participants; one disposable event environment |
| Budget | Cost-optimized serverless Cosmos DB and Standard LRS Blob Storage |
| Subscription | `ME-MngEnvMCAP266581-lramoscostah-3` |
| Location | `eastus2`, configurable |
| Authentication | API managed identity only; account keys/shared keys disabled |
| Data isolation | Every operational document carries `eventSessionId` |

The existing Defender policies do not conflict with these resources. Both
providers are registered in East US 2.

## 3. Components Detected

| Component | Need |
|-----------|------|
| Mission Control API | Read/write operational state, events, and campaign blobs |
| Campaign loader | Read immutable campaign archives |
| API managed identity | Passwordless data-plane access |

## 4. Recipe Selection

**Selected:** Bicep, extending the existing local module composition.

## 5. Architecture

| Resource | Configuration |
|----------|---------------|
| Cosmos DB for NoSQL | Serverless, Session consistency, TLS 1.2, local/key auth disabled |
| Database | `mission-control` |
| `events` container | Append-only domain events, partition key `/eventSessionId` |
| `state` container | Aggregates, projections, submissions, and idempotency records, partition key `/eventSessionId` |
| Storage account | StorageV2, Standard LRS by default, HTTPS/TLS 1.2, public blobs and Shared Key disabled |
| `campaigns` container | Private Blob container with versioning and soft-delete protection |

### RBAC

- API identity -> Cosmos DB Built-in Data Contributor at account scope
- API identity -> Storage Blob Data Contributor at `campaigns` container scope
- No account keys, connection strings, or shared keys are output

## 6. Provisioning Limit Checklist

Quota CLI exposed no entries for these providers. Azure Resource Graph found
one existing Cosmos account and zero Storage accounts in East US 2.

| Resource Type | Deploy | Total | Limit |
|---------------|-------:|------:|------:|
| Cosmos DB accounts | 1 | 2 | 250 default |
| Cosmos databases/containers | 3 | 3 in new account | 500 per account |
| Storage accounts | 1 | 1 | 250 default per region |
| Blob containers | 1 | 1 | Within account service limits |
| Data-plane role assignments | 2 | 2 new | Within service/ARM limits |

**Status:** All resources within limits.

## 7. Execution Checklist

### Phase 1: Planning

- [x] Analyze data requirements and contracts
- [x] Confirm Azure context, policies, and quotas
- [x] Research Cosmos DB and Blob Storage
- [x] Finalize containers, partition keys, and RBAC
- [x] User approved completion of all remaining roadmap tasks

### Phase 2: Execution

- [x] Generate data/storage module
- [x] Add least-privilege API role assignments
- [x] Wire parameters and outputs
- [x] Document data boundaries
- [x] Run local verification
- [x] Update status to `Ready for Validation`

### Phase 3: Validation

- [x] Invoke azure-validate
- [x] All validation checks pass
  - [x] Core validation: CLI, authentication, Bicep build, resource-group validation, and what-if
  - [x] Bicep linting
  - [x] Azure Policy validation
- [x] Update status to `Validated`
- [x] Record proof

### Phase 4: Deployment

- [ ] Deferred to TASK-206

## 8. Validation Proof

| Check | Command | Result | Timestamp |
|-------|---------|--------|-----------|
| Bicep lint/build | `az bicep lint`, `build`, and `build-params` | Pass | 2026-09-25T12:05:32-04:00 |
| Azure preflight | `validate-deployment.ps1 -Scope group -ResourceGroup rg-cyberdeck` | Pass: 14 creates, 0 modifies, 0 deletes | 2026-09-25T12:08:15-04:00 |
| Static RBAC review | Cosmos Data Contributor at account; Blob Data Contributor at campaigns container | Pass: passwordless and least privilege | 2026-09-25T12:09:02-04:00 |
| Quota/policy review | Quota scripts, Resource Graph, providers, policies | Pass | 2026-09-25T12:05:02-04:00 |
| Monorepo regression | `pnpm format:check`, peers, lint, typecheck, test, build | Pass | 2026-09-25T12:06:20-04:00 |

**Validated by:** azure-validate workflow
**Validation timestamp:** 2026-09-25T12:09:19-04:00

## 9. Files to Generate

| File | Purpose | Status |
|------|---------|--------|
| `.azure/deployment-plan.md` | TASK-203 source of truth | Complete |
| `infra/modules/data-storage.bicep` | Cosmos DB, Blob Storage, and RBAC | Complete |
| `infra/main.bicep` | Module composition and outputs | Complete |
| `infra/main.bicepparam` | Development storage settings | Complete |
| `infra/README.md` | Data architecture and access contract | Complete |

## 10. Next Steps

> Current: TASK-203 validated; ready for commit and pull request

1. Implement and validate the data module.
2. Publish and merge TASK-203.
