# Campaign contract schemas

This directory contains the technology-neutral JSON Schema Draft 2020-12
contracts for campaign packs.

## Schemas

- `schemas/v1/campaign.schema.json`
- `schemas/v1/mission.schema.json`
- `schemas/v1/asset-manifest.schema.json`
- `schemas/v1/localization.schema.json`
- `schemas/v1/common.schema.json`

Documents authored as YAML must use YAML 1.2 core types and are validated after
conversion to the JSON data model.

The fixtures under `fixtures/v1/valid/` must pass their corresponding schema.
Fixtures under `fixtures/v1/invalid/` must fail. Pack-level semantic rules that
cannot be expressed by JSON Schema are specified in
[`ADR 0003`](../../docs/architecture/0003-campaign-schema-contracts.md).

## Campaign loader

```ts
import { loadCampaignPack } from '@mission-control/campaign-contracts';

const campaign = await loadCampaignPack(
  'campaigns/operation-lighthouse',
  {
    platformVersion: '0.1.0',
    capabilities: {
      eventTypes: new Set(['mission.submitted', 'mission.completed']),
      validators: new Set(['signal-in-the-storm-validator']),
    },
  },
);
```

The loader:

- Parses JSON and YAML 1.2 core documents without aliases.
- Rejects duplicate YAML keys and paths outside the campaign root.
- Applies the Draft 2020-12 root schemas.
- Resolves missions, localization, asset, submission, and modifier schemas.
- Checks identity, version, capacity, graph, uniqueness, scoring, capability,
  localization, checksum, and platform compatibility rules.
- Returns bounded `CampaignLoadIssue` records without embedding file contents.
