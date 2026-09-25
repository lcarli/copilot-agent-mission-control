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
| `modules/identity-secrets.bicep` | Workload identities, Key Vault, and vault-scoped RBAC |
| `modules/data-storage.bicep` | Passwordless Cosmos DB and private campaign Blob Storage |
| `modules/realtime.bicep` | Passwordless Azure SignalR Service, diagnostics, and API RBAC |
| `modules/container-runtime.bicep` | ACR, Container Apps Environment, workloads, and AcrPull |

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

## Identity and secrets

The API and dashboard receive separate user-assigned managed identities. Only
the API identity receives `Key Vault Secrets User`, scoped directly to the
environment Key Vault. The dashboard identity has no vault permissions.

The vault uses Azure RBAC, soft delete, and no legacy access policies. Purge
protection defaults to enabled in the root template. The development parameter
example disables it so disposable environments can be fully removed by the
future TASK-207 cleanup flow.

No secret values belong in Bicep parameters or outputs. The root template
exposes only identity metadata and the vault resource ID, name, and URI:

- `identity.api`
- `identity.dashboard`
- `keyVault`

TASK-206 is responsible for authenticated secret seeding without placing secret
values in deployment history.

## Data and campaign storage

The data module provisions a serverless Cosmos DB for NoSQL account with
key-based authentication disabled. The `events` and `state` containers use
`/eventSessionId` as their partition key, keeping event data co-located and
isolated. The events container additionally enforces unique event IDs and
aggregate-version pairs within each event session.

Campaign archives use the private `campaigns` Blob container. Blob public access
and Storage Shared Key authorization are disabled; versioning and soft deletion
protect reviewed packages from accidental replacement.

The API identity receives:

- Cosmos DB Built-in Data Contributor at the Cosmos account.
- Storage Blob Data Contributor at the `campaigns` container only.

The `data` root output contains endpoints, resource IDs, and logical names but
never account keys or connection strings.

## Real-time messaging

Azure SignalR Service runs in `Default` mode on one `Standard_S1` unit. Local
access-key authentication is disabled; the API identity receives only the
`SignalR App Server` role at the SignalR resource scope.

Connectivity and HTTP request logs flow to the shared Log Analytics workspace.
Messaging logs and live trace remain disabled to control cost and avoid
collecting message content unnecessarily.

The `realtime` root output exposes the service ID, name, hostname, and HTTPS URI.
It does not expose SignalR keys or connection strings.

## Container runtime

The runtime module creates a Basic Azure Container Registry, one Consumption
Container Apps Environment, and externally accessible API and dashboard apps.
Both apps use their dedicated user-assigned identities and receive `AcrPull`
only at registry scope. ACR admin credentials and anonymous pull are disabled.

Until the API and dashboard HTTP runtimes are implemented, both apps run the
Microsoft Container Apps hello-world bootstrap image on port 80. TASK-206
replaces these references after publishing immutable images. The root `runtime`
output exposes the registry login server and both HTTPS application URLs.
