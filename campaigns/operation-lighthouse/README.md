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

The deterministic campaign dry run traverses every narrative beat, validates all
five missions, exercises every simulator and incident modifier, and proves that
collective recovery unlocks the finale without leaking state between runs.

The [PowerPoint deliverables](presentations/README.md) include an editable
60-slide English public workshop deck and a separate 18-slide private
facilitator guide, both with speaker notes and still-based delivery.
The [production plan](../../docs/presentations/powerpoint-plan.md) records the
455-minute agenda, source contracts and remaining live-demo readiness gates.
Event rehearsal precedes the final video production; no videos are required
by the delivered slides.

The [completion certificate](certificates/README.md) provides an editable
English A4 landscape template and a printable PDF. Eligibility is full
workshop attendance and participation in the hands-on activities, not
passing all five missions.

The `media/asset-manifest.json` file is the authoritative media inventory.
`pnpm --filter @mission-control/campaign-operation-lighthouse validate:assets`
checks prompt completeness, variants, locale coverage, continuity, provenance,
and approved file integrity.
Repository-maintained fallback assets can be reproduced with
`pnpm --filter @mission-control/campaign-operation-lighthouse generate:reviewed-media`;
localized captions and their checksums are recorded in
`media/caption-manifest.json`.
Editorial approvals and locale-specific terminology decisions are recorded in
`media/content-reviews.json` and `media/reviews/`.
`pnpm --filter @mission-control/campaign-operation-lighthouse validate:localization`
checks media keys, placeholders, layout expansion, localized asset references,
caption content and checksums, variant uniqueness, and review approvals.

The realistic opening video is deferred. Historical fallback assets and
approvals do not establish that the realistic opening is finished.

Video drafts in `media` are intentionally ignored by Git and are not required
for a fresh checkout or the still-based workshop. The opening asset remains
`prompt-ready` without a distributed file; its older generator metadata is
historical, not approval of the current drafts. Local video copies are retained
on the production machine. Prompts, captions, still images and audio remain
versioned so production can resume later.

The redesigned reference-first workflow, visual storyboard, audio plan, and
copy-ready Flow chat prompts are documented in the
[Flow opening storyboard v2 (pt-BR)](media/FLOW-OPENING-STORYBOARD-V2.md).

Historical notes also reference `media\FLOW-OPENING-PROMPTS.md` and
`media\FLOW-OPENING-FROM-SCRATCH.md`; those files are not present in this checkout.
The future production remains English throughout: storyboard, dialogue,
narration, captions and title. The versioned Portuguese V2 guide remains
historical material, not the final English production plan.

The `starters/` tree supplies progressively decreasing participant scaffolding.
`starter-manifest.json` is the authoritative file list and guidance order;
`pnpm --filter @mission-control/campaign-operation-lighthouse test` validates
path containment, file presence, progression, and credential-like content.
