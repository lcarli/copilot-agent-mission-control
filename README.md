# copilot-agent-mission-control
Mission-based, multilingual workshops for building GitHub Copilot agents in VS Code.

## Workspace

This repository is a pnpm and Turborepo monorepo targeting Node.js 24.

```powershell
corepack enable
pnpm install
pnpm build
pnpm test
```

Browser end-to-end scenarios require Chromium once per development machine:
`pnpm --filter @mission-control/tests-e2e exec playwright install chromium`.
For the no-cloud rehearsal, use `pnpm build:local` and the
[local workshop instructions](docs/local-workshop.md); this does not certify
the production deployment or presentation/media assets.

| Path | Purpose |
|---|---|
| `apps/api` | Mission Control API and validation runtime |
| `apps/command-center` | Instructor dashboard and public presentation |
| `apps/participant-cli` | Participant workflow CLI |
| `packages` | Shared authentication, domain management, contracts, and localization packages |
| `campaigns` | Versioned campaign workspaces |
| `infra` | Azure Bicep infrastructure |
| `tests` | Contract, end-to-end, and load test workspaces |
| `scripts` | Operational PowerShell automation |

## Project documentation

- [Product and delivery plan](PLAN.md)
- [Visual identity and logo production prompts](docs/brand/visual-identity.md)
- [Workshop PowerPoint production plan](docs/presentations/powerpoint-plan.md)
- [Workshop decks and facilitator guide](campaigns/operation-lighthouse/presentations/README.md)
- [Workshop readiness and conversation handoff](docs/workshop-readiness-handoff.md)
- [Local workshop rehearsal](docs/local-workshop.md)
- [Participant guide](docs/participant-guide.md)
- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security policy](SECURITY.md)
- [Branching and pull requests](docs/contributing/branching-and-pull-requests.md)
- [ADR 0001: Platform stack, repository tooling, and packaging](docs/architecture/0001-platform-stack-and-packaging.md)
- [ADR 0002: Domain and API contracts](docs/architecture/0002-domain-and-api-contracts.md)
- [ADR 0003: Campaign pack schema contracts](docs/architecture/0003-campaign-schema-contracts.md)
- [Campaign contract schemas](packages/campaign-contracts/README.md)
