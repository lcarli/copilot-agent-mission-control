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
