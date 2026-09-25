# Contributing to Copilot Agent Mission Control

Thank you for helping build an inclusive, reliable workshop platform. This
project accepts documentation, campaign content, localization, design,
infrastructure, application code, tests, and operational guidance.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md)
and the security and privacy requirements in [SECURITY.md](SECURITY.md).

## Before starting

1. Read the [product and delivery plan](PLAN.md).
2. Select one unchecked roadmap task or an approved issue.
3. Confirm that another open pull request is not already implementing it.
4. Read the relevant architecture decision records under `docs/architecture/`.
5. Keep the change limited to the selected task and directly required support.

Do not include credentials, tokens, participant source code, personal data,
private prompts, customer information, or confidential event data in an issue,
commit, fixture, screenshot, log, or pull request.

## Development environment

The selected platform uses the active Node.js LTS release, pnpm workspaces, and
Turborepo. TASK-100 will add the root workspace and executable commands. After
that scaffold exists, the standard setup will be:

```powershell
corepack enable
pnpm install
pnpm build
pnpm test
```

Until the scaffold is available, documentation and schema changes must still be
validated with the most specific available tool. Campaign schemas use JSON
Schema Draft 2020-12 and include positive and negative fixtures under
`packages/campaign-contracts/fixtures/`.

## Contribution standards

### Application and contract changes

- Preserve strict TypeScript and package public boundaries.
- Keep domain packages independent from Fastify, React, Azure SDKs, and CLI
  frameworks.
- Treat public JSON contracts as versioned compatibility commitments.
- Validate untrusted data at the boundary and reject unknown properties.
- Preserve event-session and unit isolation in storage, APIs, telemetry, and
  real-time projections.
- Add or update tests for changed behavior.

### Campaign and localization changes

- Keep campaign identifiers and localization keys stable.
- Update `en`, `fr`, and `pt-BR` together unless the roadmap task explicitly
  stages translation work.
- Preserve ICU placeholder names across locales.
- Add generation prompts, accessibility requirements, licensing notes, and
  provenance metadata before adding generated media.
- Never add an approved asset without its checksum and review state.

### Documentation changes

- Use concise, inclusive language.
- Keep commands compatible with PowerShell 7 on Windows where practical.
- Use repository-relative links and verify that every added link resolves.
- Update the roadmap checkbox only for the task delivered by the branch.

### Accessibility and privacy

- Do not encode essential state only through color, motion, sound, or a map.
- Provide captions or transcripts for narrated media.
- Use fictional or synthetic data in examples.
- Public-display changes must use an allowlisted redacted projection.

## Branch, commit, and pull-request workflow

Follow the complete
[branching and pull-request guide](docs/contributing/branching-and-pull-requests.md).
The standard roadmap flow is:

1. Branch from the latest `main`.
2. Name the branch `task/<task-id>-<short-description>`.
3. Implement and validate one roadmap task.
4. Mark only that task `[x]` in `PLAN.md`.
5. Create one reviewable task commit.
6. Push the branch and open a pull request.
7. Merge only after required validation and review succeed.

Use this commit shape:

```text
<type>: <task outcome>

<optional concise explanation>

Roadmap: <TASK-ID>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Use the Copilot co-author trailer only when Copilot materially contributed to
the commit. Never credit a person or tool that did not contribute.

## Validation

Run the smallest validation set that proves the change:

| Change | Minimum evidence |
|---|---|
| Markdown only | Link checks and repository Markdown lint when available |
| JSON Schema | Meta-schema validation plus positive and negative fixtures |
| TypeScript package | Lint, type-check, unit tests, and package build |
| API contract | Contract tests, authorization tests, and idempotency tests |
| Dashboard | Unit tests, accessibility checks, and affected Playwright flows |
| Infrastructure | Bicep build, lint/security checks, and deployment what-if |
| Campaign content | Schema, reference, localization parity, and dry-run checks |

If an expected check cannot run, explain why in the pull request. Do not present
an unavailable or skipped check as passing.

## Pull-request review

Authors must:

- Complete the pull-request template.
- Explain behavior and contract changes, not only file changes.
- Identify security, privacy, localization, accessibility, and deployment
  effects.
- Respond to review without hiding unresolved concerns.
- Avoid force-pushing after review begins unless coordinated with reviewers.

Reviewers prioritize correctness, isolation, safety, compatibility,
accessibility, operability, and test evidence over style preferences.

## Reporting vulnerabilities

Do not open a public issue for a suspected vulnerability. Follow
[SECURITY.md](SECURITY.md) and use GitHub's private vulnerability reporting
flow.
