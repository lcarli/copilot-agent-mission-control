# Operation Lighthouse presentations

Two English, editable, 16:9 PowerPoint decks for the full-day workshop.

| File | Audience | Contents |
| --- | --- | --- |
| [OL-WORKSHOP-en.pptx](OL-WORKSHOP-en.pptx) | Participants; project this file | 60 slides in 11 sections: story, teaching, five missions, lab holds, debriefs and closure |
| [OL-FACILITATOR-en.pptx](OL-FACILITATOR-en.pptx) | Instructor and support staff; do not project | 18 reference slides in 4 sections: preparation, coaching, recovery and event closure |

**Distribute only the workshop deck to participants.** The facilitator guide is
a separate operating reference, not a hidden appendix in the public file.
Every slide has English speaker notes. Neither deck contains event credentials,
real participant results, embedded video or embedded audio.

## Delivery

- The public agenda totals **455 minutes**, including 60 minutes for lunch and
  a 15-minute break. The five main lab holds account for 176 minutes.
- Timings are delivery budgets, not automatic transitions. Announce the actual
  return time at each break.
- Public **JOURNEY** links return to P05; its mission labels open the five
  briefings. Use native PowerPoint sections for other navigation.
- Private **INDEX** links return to I02. Select a stage name for its coaching
  reference; the displayed P-ranges refer to the separate public deck.
- Keep the relevant mission canvas projected while units work. Presenter notes
  contain the spoken transition, questions, demonstration cues and sources.
- Videos remain deferred. The opening, mission briefings and ending already
  have complete still-based treatments.

### Typography and editable content

The delivered files use **Segoe UI** for headings/body and **Consolas** for
technical labels. This is an explicit production fallback: IBM Plex Sans,
IBM Plex Mono and the guide's Aptos fallback were unavailable in the authoring
environment. Fonts are not embedded; check for substitution when opening the
files on another machine.

Titles, body text, mission canvases, diagrams, connections and labels are native
PowerPoint elements. Portraits and approved transparent logos are embedded
images. Logo lettering comes from the final
[brand exports](../../../docs/brand/exports/), not substituted live fonts.

## Before live demonstrations

The decks are complete teaching materials, **not evidence that the event
integration has been rehearsed**. Examples are labeled, and no fixed display
data is presented as actual participant achievement.

Resolve the [readiness gates in the production plan](../../../docs/presentations/powerpoint-plan.md#10-readiness-gates-before-technical-slide-capture)
before live technical delivery: Mission 1 ID/schema alignment, Mission 3 tool
naming, Mission 5 evidence mapping, populated scenario fixtures, public
projection data, and participant packaging/end-to-end rehearsal.

Local `mission validate` checks the evidence envelope; it is not a passed
server-side mission evaluation. The decks preserve that distinction.
The instructor guide contains coaching and honest fallback procedures.
This presentation work does not modify the application or resolve those gates.

For current runtime operation, use the
[private facilitator runbook](../../../docs/facilitator-runbook.md) alongside
I01-I18. It reconciles historical mismatch/placeholder notes with the delivered
local fixes, hosted preparation, actual CLI commands and remaining human gates.
Keep it private. The approved slide files and their original notes are unchanged.

## Authoring and rebuilding

| Source | Responsibility |
| --- | --- |
| [slides.cjs](slides.cjs) | Concise English slide content, examples, navigation targets and speaker notes |
| [build.cjs](build.cjs) | Theme, editable layouts, imagery, sections and PowerPoint generation |
| [finalize.ps1](finalize.ps1) | Native PowerPoint save for Office interoperability; branded creator/editor metadata |
| [office-metadata.ps1](office-metadata.ps1) | Shared creator/editor metadata helper, also used by the completion certificate |
| [PowerPoint production plan](../../../docs/presentations/powerpoint-plan.md) | Canonical P01-P60 / I01-I18 titles, public slide timings, source register and readiness gates |

**Rebuilding overwrites the two `.pptx` files.** Close those files first.
Manual edits made in PowerPoint are not imported back into the source.
For repeatable changes, update the content/layout sources and rebuild.

From the repository root, use Node.js 24, an isolated PptxGenJS installation,
and desktop Microsoft PowerPoint on Windows for finalization. No repository
dependency-manifest change is required:

```powershell
$tools = Join-Path $env:TEMP 'operation-lighthouse-pptx-tools'
npm install --prefix $tools --no-audit --no-fund --ignore-scripts --save-exact pptxgenjs@4.0.1
if ($LASTEXITCODE -ne 0) { throw 'Presentation tooling installation failed.' }

$previousNodePath = $env:NODE_PATH
try {
    $env:NODE_PATH = Join-Path $tools 'node_modules'
    node '.\campaigns\operation-lighthouse\presentations\build.cjs'
    if ($LASTEXITCODE -ne 0) { throw 'PowerPoint generation failed.' }
    pwsh -NoProfile -File '.\campaigns\operation-lighthouse\presentations\finalize.ps1'
    if ($LASTEXITCODE -ne 0) { throw 'PowerPoint finalization failed.' }
}
finally {
    $env:NODE_PATH = $previousNodePath
}
```

The builder checks slide IDs, counts, required notes, available assets and the
455-minute timing total. Native PowerPoint finalization normalizes the generated
notes-master structure without changing the authored content. Reordering the
manifest alone is not a compatible substitute. The script refuses to modify
a deck that is already open and leaves other presentations untouched.
After changing content, open both decks in PowerPoint,
render the affected slides and inspect wrapping, spacing, image crops, links
and speaker notes. File generation alone does not establish visual quality or
room readiness.
