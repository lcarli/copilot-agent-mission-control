# Operation Lighthouse

Campaign workspace for the initial Port Azure emergency-response scenario.
TASK-600 and subsequent campaign tasks add the world model, localized content,
simulators, validators, and media manifest.

The `starters/` tree supplies progressively decreasing participant scaffolding.
`starter-manifest.json` is the authoritative file list and guidance order;
`pnpm --filter @mission-control/campaign-operation-lighthouse test` validates
path containment, file presence, progression, and credential-like content.
