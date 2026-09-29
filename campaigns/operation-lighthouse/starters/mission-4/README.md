# Mission 4 starter

Define at least three bounded specialist roles and choose the architecture.
Preserve evidence in every handoff using the supplied event contract.

The canonical mission ID is `specialist-network`. The schema validates one
handoff, not a full evidence package. Submit an envelope with `evidence` fields
`specialists`, `handoffs` and `review`. Each specialist needs `roleId`,
`responsibility`, nonempty `inputFields` and `outputFields`. Every role must be
a handoff target; each handoff must preserve evidence IDs and a payload.
`review` identifies different `proposerRoleId` and `reviewerRoleId` values and
an approving reviewer declared in the specialist list.

Optional advanced evidence includes `concurrentAnalyses`, `disagreements` and
per-specialist `latencyMs`/`toolsUsed`. Do not treat a declared specialist array
as proof that the agents actually ran; keep the real authoring and execution
evidence for the facilitator.
