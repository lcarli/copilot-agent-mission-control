# Azure Infrastructure

The infrastructure uses standalone, resource-group-scoped Bicep. The
foundation centralizes deployment parameters, deterministic Azure-compliant
resource names, and common tags so capability modules remain consistent.

## Foundation

| File | Responsibility |
|------|----------------|
| `deploy.bicep` | Subscription entry point that creates the environment resource group |
| `deploy.bicepparam` | Safe subscription-scoped development parameter example |
| `main.bicep` | Resource-group orchestration and shared deployment contract |
| `main.bicepparam` | Safe development parameter example |
| `runtime-types.bicep` | Closed bootstrap/workshop configuration with required hosted references |
| `workshop.bicepparam` | Synthetic hosted-profile example for offline compilation, not deployment |
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
az bicep build-params --file infra/deploy.bicepparam
```

The generated ARM JSON files are build artifacts and must not be committed.
TASK-201 through TASK-205 add capability modules to this orchestration entry
point. `scripts/deploy.ps1` implements TASK-206 deployment automation; cleanup
automation remains deferred to TASK-207.

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
- Storage Blob Data Reader at the `campaigns` container only.

The separately authorized campaign publisher receives Blob Data Contributor.
Incremental deployment does not revoke historical workload Contributor grants;
review and remove superseded assignments only through an approved migration.

The `data` root output contains endpoints, resource IDs, and logical names but
never account keys or connection strings.

## Real-time messaging

Azure SignalR Service is prepared in `Serverless` mode on one `Standard_S1`
unit. Local access-key authentication is disabled; the API identity receives
`SignalR REST API Owner` at the SignalR resource scope. Its current actions
include client-token generation and REST publication. The hosted profile allows
exactly the dashboard origin resolved before promotion; bootstrap is not an
operational workshop. Actual permission/CORS verification remains a live gate.

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

The explicit `bootstrap` profile runs Microsoft hello-world images on port 80,
without a registry link. The `workshop` profile requires all image, identity,
signing-version and campaign-digest references. Its API runs on port 3000 with
one replica; its dashboard runs on 8080 with a fixed same-origin API proxy.
Operational health paths replace the placeholder root probes. Managed-identity
registry links are enabled only for workshop images. The `runtime` output includes
the profile mode, registry login server and application URLs.

## Staged deployment

The current approval covers preparation only, not executing Azure commands.
Future live work requires a separately confirmed subscription, region and scope.
Start each infrastructure/promotion stage with a preview:

```powershell
pnpm deploy:azure -- -Stage Bootstrap -SubscriptionId <approved-uuid> -Location <approved-region> -Owner <team> -PreviewOnly
```

`Bootstrap` creates foundation resources but refuses to replace an existing
non-bootstrap app. `Artifacts` snapshots allowlisted committed sources, builds
real API/dashboard images in ACR, verifies the immutable runtime JSON in private
Blob Storage, and writes a new release manifest without changing Container Apps.
`Workshop` consumes that release plus closed Entra/signing-reference settings,
rechecks digests, validates ARM, rejects what-if deletes and promotes the hosted
configuration. It never silently restores placeholder images.

Each stage has an explicit confirmation; `-Force` is only for already-approved
automation. `Artifacts -PreviewOnly` performs no build/upload or manifest creation.
No registrations, secret values, provider registrations or signing-key migrations
are automatically created. Purge protection now defaults to enabled; use the
development exception only for an explicitly disposable environment.

See [the hosted operating guide](../docs/hosted-workshop.md) for exact stages,
settings, publisher permissions, partial-failure handling and the live gates.

## Safe environment destruction

Preview the exact cleanup scope with:

```powershell
pnpm destroy:azure -- -ResourceGroupName rg-camc-dev -EnvironmentName dev -PreviewOnly
```

Remove `-PreviewOnly` only after reviewing the inventory. The script requires
the full resource-group name, verifies the subscription, location, and Bicep
ownership tags, lists every resource, and stops if any deletion lock exists.
It then requires typing `delete <resource-group-name>` exactly; there is no
force or confirmation-bypass option.

Cleanup issues only one exact `az group delete` operation and polls until Azure
reports that group absent. It never enumerates other resource groups and never
purges soft-deleted Key Vault data. Purge-protected vaults remain recoverable
until their configured retention period expires.

## Infrastructure validation

Run deterministic local/CI checks without Azure credentials:

```powershell
pnpm validate:infra -- -Offline
```

Omit `-Offline` to add subscription-scoped ARM validation and what-if. Supply
`-ResourceGroupName rg-camc-dev` only when validating an existing deployed
environment; this enables read-only smoke tests for resource provisioning,
managed identities, passwordless settings, campaign privacy/seeding, and both
HTTPS endpoints.

`-Offline` cannot be combined with a resource group. Live smoke checks reject
bootstrap/legacy output as workshop evidence and check the operational health
paths, proxy/auth bridge, hosted metadata, exact campaign digest and SignalR
configuration. They do not replace a real instructor login or public push rehearsal.

The validator compiles all Bicep and parameter entrypoints into a temporary
directory, checks security invariants in the compiled ARM template, emits a
PASS/FAIL/SKIP table, and exits nonzero on any required failure. The
`Infrastructure validation` GitHub Actions workflow runs offline checks on
infrastructure-related pull requests and requires no Azure credentials.
Negative configuration examples and twelve strictly offline command-double
scenarios cover required hosted settings, no-op previews, immutable source/artifact
publication, destination isolation and prevention of bootstrap downgrades.
`Container validation` builds and smoke-checks real Linux images without
publishing to a registry or deploying Azure.
