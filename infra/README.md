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
| `modules/monitoring.bicep` | Log Analytics and workspace-based Application Insights |

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

## Monitoring

The monitoring module creates one `PerGB2018` Log Analytics workspace and one
workspace-based Application Insights component. Development parameters retain
logs for 30 days and cap ingestion at 1 GB per day. Both values are configurable
through `logRetentionInDays` and `logDailyQuotaGb`.

The root template exposes:

- `monitoring.logAnalyticsWorkspaceId`
- `monitoring.logAnalyticsCustomerId`
- `monitoring.applicationInsightsId`
- `monitoring.applicationInsightsConnectionString`

The connection string is intended for later Container Apps composition and
OpenTelemetry setup. Workspace shared keys are never emitted as deployment
outputs.
