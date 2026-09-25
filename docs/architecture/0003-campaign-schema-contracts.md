# ADR 0003: Campaign Pack Schema Contracts

- **Status:** Accepted
- **Date:** 2026-09-25
- **Decision owners:** Copilot Agent Mission Control maintainers
- **Roadmap:** TASK-003

## Context

Campaign packs must be loadable without changing core application code. A pack
contains campaign metadata, mission definitions, an asset manifest, and
localized messages. These documents may be authored as JSON or YAML, but the
platform needs one machine-validatable contract before campaign loading and
content authoring begin.

ADR 0002 defines the domain meanings and identifiers. This ADR defines the
portable document format used to represent campaign content.

## Decision

Campaign pack documents use JSON Schema Draft 2020-12. The canonical schemas
are stored in `packages/campaign-contracts/schemas/v1/`:

- `campaign.schema.json`
- `mission.schema.json`
- `asset-manifest.schema.json`
- `localization.schema.json`
- `common.schema.json`

JSON files are validated directly. YAML files are parsed using the YAML 1.2
core schema, converted to the equivalent JSON data model, and then validated
against the same JSON Schemas. YAML-specific tags, aliases that produce cycles,
duplicate mapping keys, and non-JSON values are rejected.

Every root document contains:

- `schemaVersion`, fixed to `1.0` for these schemas.
- A `kind` discriminator.
- Campaign identity and version information where applicable.

Schemas close objects with `additionalProperties: false`. Contract extensions
must therefore be introduced through a new schema version rather than
unreviewed properties.

### Campaign manifest

`campaign.json` or `campaign.yaml` is the pack entry point. It declares:

- Stable campaign identity and semantic version.
- Localized title and synopsis keys.
- Platform compatibility.
- Supported locales and the default locale.
- Capacity guidance.
- Ordered mission identifiers.
- Paths to mission, asset-manifest, and localization documents.

The initial platform requires `en`, `fr`, and `pt-BR` resources in every
campaign. The default locale must be one of the supported locales.

### Mission definition

Each mission document declares:

- Identity, semantic version, and prerequisite missions.
- Recommended duration and localized content keys.
- Core and advanced objectives.
- Required domain event types and available tools.
- Submission schema reference.
- Validator identity, version, and timeout.
- Exactly three progressive hint levels.
- Score maximum and dimension weights.
- Dashboard effects and instructor modifiers.
- Failure, pause, and retry behavior.

Mission-specific participant output remains a separate JSON Schema referenced
by `submissionSchema`. The platform resolves that path only within the campaign
archive.

### Asset manifest

The asset manifest contains all planned and produced media. Each record includes
the complete prompt, prohibited elements, variants, language requirements,
continuity references, accessibility requirements, output constraints,
licensing and provenance notes, and review state.

Generated media files are optional while an asset is `planned`, `prompt-ready`,
or `in-review`. An `approved` record must have a repository or archive-relative
file path and SHA-256 checksum; this cross-field rule is enforced by the schema.

### Localization resource

Localization resources use a flat message map with canonical dot-separated
keys and ICU MessageFormat-compatible strings. English is the canonical key
set. Automated parity validation must compare:

- Key presence across `en`, `fr`, and `pt-BR`.
- Placeholder names used by each translation.
- References from campaign, mission, validation, UI, and asset documents.

JSON Schema validates each individual resource. Cross-resource parity and
reference resolution are pack-level semantic validations.

## Pack layout

```text
campaigns/<campaign-id>/
├── campaign.yaml
├── missions/
│   └── <mission-id>.yaml
├── schemas/
│   └── submissions/
├── assets/
│   └── manifest.yaml
└── locales/
    ├── en.json
    ├── fr.json
    └── pt-BR.json
```

All paths use `/`, are relative to the campaign root, and cannot contain empty
segments, `.` segments, `..` segments, backslashes, drive letters, URL schemes,
or a leading slash. Loaders must resolve the final path and verify that it
remains inside the extracted campaign root.

## Semantic validation beyond JSON Schema

The campaign loader must additionally reject packs when:

- A declared document is missing or its resolved path leaves the pack root.
- Document campaign IDs or campaign versions disagree.
- `defaultLocale` is not included in `supportedLocales`.
- Recommended capacity exceeds maximum capacity.
- Mission IDs are duplicated, missing, or differ from their filenames.
- A prerequisite is unknown, self-referential, or part of a cycle.
- Objective, tool, effect, or modifier identifiers are duplicated in a mission.
- Score dimension weights do not total `10000`.
- Required event types, tools, validators, modifiers, or dashboard effects are
  unavailable in the selected platform version.
- Localization keys are missing, extra relative to policy, or use different
  placeholder names across locales.
- Asset IDs are duplicated or an approved file checksum does not match.
- A referenced submission schema is missing, invalid, or outside the pack.
- The platform version is outside the manifest's declared compatibility range.

Validation errors contain the document path, JSON Pointer, stable error code,
message key, and bounded arguments. They never include arbitrary file contents
in telemetry.

## Compatibility

- New optional properties may be added in a backward-compatible minor schema
  release only when older loaders already ignore them; because v1 objects are
  closed, normal additions require a new explicit schema version.
- A campaign declares the exact schema major version it uses.
- Loaders may support multiple schema versions concurrently.
- A migration tool may produce a newer document, but loaders never silently
  rewrite campaign source.
- Semantic version ranges use standard npm-compatible range syntax.

## Consequences

### Positive

- JSON and YAML authors share one validation model.
- Closed, discriminated documents catch misspellings and unsupported content.
- Campaigns remain data packages rather than executable application plugins.
- Paths and checksums make campaign archives portable and auditable.
- Localization parity and placeholder checks have explicit inputs.

### Trade-offs

- Some graph, cross-file, checksum, range, and placeholder rules require a
  semantic validator in addition to JSON Schema.
- Closed schemas require intentional versioning for extensions.
- Flat localization resources favor tooling simplicity over nested authoring.
- Asset records are verbose because prompts, accessibility, provenance, and
  review metadata are mandatory.

## Follow-up work

- TASK-102 implements loading, path containment, reference resolution, and
  semantic validation.
- TASK-103 implements locale fallback and parity validation.
- TASK-700 implements asset-manifest validation and provenance workflows.
- Campaign mission tasks provide mission-specific submission schemas.

Any change to required fields or their meaning requires a superseding ADR and a
new compatible schema version.
