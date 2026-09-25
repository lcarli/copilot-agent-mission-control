# Operation Lighthouse

Campaign workspace for the initial Port Azure emergency-response scenario.
The package exports the canonical, immutable Port Azure world model used by
campaign simulators and validators. It defines stable identifiers and
cross-referenced districts, services, shelters, transport routes, electrical
grid sectors, and the initial recovery snapshot.

The `starters/` tree supplies progressively decreasing participant scaffolding.
`starter-manifest.json` is the authoritative file list and guidance order;
`pnpm --filter @mission-control/campaign-operation-lighthouse test` validates
path containment, file presence, progression, and credential-like content.
