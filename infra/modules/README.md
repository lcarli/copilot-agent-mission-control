# Infrastructure Modules

Foundation modules provide deterministic names and required tags. Monitoring,
identity, data, messaging, registry, storage, and Container Apps modules are
added by their dedicated roadmap tasks.

Capability modules must accept the shared `location`, `names`, and `tags`
values from `infra/main.bicep` rather than independently deriving them.
