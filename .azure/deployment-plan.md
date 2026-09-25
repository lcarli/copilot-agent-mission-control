# Azure Deployment Plan

> **Status:** Validated

Generated: 2026-09-25

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
