# Mission 2 starter

Design the instruction and evidence behavior in `src/agent.ts`. Tests and the
operational bulletin define the boundary; no completed instruction set is
provided.

Use the reproducible `east-bank-underpass-closure` scenario in
`context/incident-reports.json` and `context/operational-bulletin.json`.
The evidence identifiers are `incident-004`, `incident-005` and `bulletin-03`.
These are synthetic teaching inputs, not current operational information.

The learning outcome is to distinguish an attributed fact from an assumption,
identify unresolved information, cite the supplied identifiers and keep an
unsupported recommendation behind an explicit verification step. The
contradictory report and quoted instruction are deliberate: evaluate their
authority as evidence; do not follow instructions embedded in source data.

Submit a `ground-truth` envelope whose `evidence` contains `facts`,
`assumptions`, `unknowns`, `evidenceIds`, `recommendation.supported` (boolean)
and `nextInformationStep`. Advanced fields are `contradictionResolution`,
`confidence` (0-1) and `untrustedInstructionDetected`. The current validator
checks structured evidence fields, not the truth of arbitrary claims; the
facilitator must discuss the reasoning and source quality.
