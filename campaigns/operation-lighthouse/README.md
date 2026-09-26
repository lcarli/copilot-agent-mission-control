# Operation Lighthouse

Campaign workspace for the initial Port Azure emergency-response scenario.
The package exports the canonical, immutable Port Azure world model used by
campaign simulators and validators. It defines stable identifiers and
cross-referenced districts, services, shelters, transport routes, electrical
grid sectors, and the initial recovery snapshot.

The narrative catalog defines stable characters, the seven-beat campaign
timeline, a terminology glossary, and localization guidance. English, French,
and Brazilian Portuguese catalogs are checked for key and placeholder parity.

Instructor incident modifiers use a closed catalog with bounded parameters,
facilitator guidance, conflict detection, and reversible state transitions.

The `starters/` tree supplies progressively decreasing participant scaffolding.
`starter-manifest.json` is the authoritative file list and guidance order;
`pnpm --filter @mission-control/campaign-operation-lighthouse test` validates
path containment, file presence, progression, and credential-like content.
