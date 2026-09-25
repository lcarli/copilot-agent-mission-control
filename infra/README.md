# Azure Infrastructure

The infrastructure uses standalone, resource-group-scoped Bicep. The
foundation centralizes deployment parameters, deterministic Azure-compliant
resource names, and common tags so capability modules remain consistent.

## Foundation

| File | Responsibility |
|------|----------------|
| `main.bicep` | Orchestration entry point and shared deployment contract |
| `main.bicepparam` | Safe development parameter example |
| `modules/naming.bicep` | Deterministic names for resources added by later tasks |
| `modules/tags.bicep` | Required tags merged with caller-supplied tags |

`workloadName` and `environmentName` should contain lowercase letters, numbers,
and hyphens. Keep them short because services such as Key Vault and Storage
Accounts have restrictive name limits.

Build the template locally with:

```powershell
az bicep build --file infra/main.bicep
az bicep build-params --file infra/main.bicepparam
```

The generated ARM JSON files are build artifacts and must not be committed.
TASK-201 through TASK-205 add capability modules to this orchestration entry
point. Deployment and cleanup automation are intentionally deferred to
TASK-206 and TASK-207.
