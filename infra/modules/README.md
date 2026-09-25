# Infrastructure Modules

Foundation modules provide deterministic names and required tags. The
monitoring module provisions the shared Log Analytics workspace and
workspace-based Application Insights component. The identity/secrets module
creates separate workload identities, the environment Key Vault, and
vault-scoped secret-read RBAC for the API. Data, messaging, registry, storage,
and Container Apps modules are added by their dedicated roadmap tasks. The data
module owns Cosmos DB event/state containers, private campaign Blob Storage, and
their API data-plane role assignments.

Capability modules must accept the shared `location`, `names`, and `tags`
values from `infra/main.bicep` rather than independently deriving them.
