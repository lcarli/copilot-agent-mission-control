# English content review

**Status:** Approved  
**Reviewed:** 2026-09-25  
**Scope:** Participant content, instructor controls, command-center UI, campaign
narrative, mission validators, media prompts, narration, captions, and
accessibility metadata.

## Editorial decisions

- Use direct operational verbs: assess, verify, cite, compare, route, review,
  approve, and re-plan.
- Use **agent** for the bounded software behavior participants build; do not use
  agent as a synonym for a person.
- Use **evidence** for source-linked observations and **grounding** for the
  explicit connection between a claim and that evidence.
- Use **tool** for external simulator operations, **handoff** for explicit
  specialist transfers, and **human approval** for accountable high-impact
  decisions.
- Describe **recovery** as measurable progress supported by evidence, never as a
  guarantee that all risk has ended.
- Preserve `Port Azure`, `Mission Commander`, `Maya Chen`, `Jules Martin`, and
  `Aurora` exactly.

## Accessibility review

- Instructions do not depend on color, sound, or motion alone.
- Narrated videos require synchronized captions and descriptive transcripts.
- Reduced-motion and sensory-reduced variants are explicit.
- Emergency language communicates urgency without panic, injury spectacle, or
  blame.
- Sentences are concise enough for presentation and caption use; abbreviations
  and unexplained idioms are avoided.

## Reviewed surfaces

- `apps/command-center/src/messages.ts`
- `apps/participant-cli/src/translations.ts`
- `campaigns/operation-lighthouse/src/narrative.ts`
- `campaigns/operation-lighthouse/src/missions/`
- `campaigns/operation-lighthouse/media/asset-manifest.json`
- `campaigns/operation-lighthouse/media/localization/en.json`
- `campaigns/operation-lighthouse/media/captions/*.en.vtt`

No release-blocking English findings remain.
