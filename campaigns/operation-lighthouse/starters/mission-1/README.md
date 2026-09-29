# Mission 1 starter: Signal in the Storm

The canonical mission identifier is `signal-in-the-storm`. Use this identifier
in CLI commands and evidence envelopes; `incident-intake` is not a mission alias.

Complete the TODO in `src/agent.ts`, or implement the same assessment with your
VS Code custom agent. Preserve `contracts/output.schema.json`: `location` and
`affectedServices` are required alongside category, severity and missing
information. `severityExplanation` and `duplicateOf` are optional advanced
fields. Do not invent a duplicate merely to populate an optional field.

`examples/incident-report.txt` and `examples/evidence.json` are a public worked
example of the contract, not the instructor's solution to a live exercise.
The output schema applies to the inner `evidence` object. The CLI submits the
outer envelope, including `schemaVersion` and `missionId`; the server passes
the inner object to the campaign validator.

`mission validate` checks only that envelope. It neither runs the campaign
validator nor awards points. Submit to a running event and inspect server
feedback separately. Passing all core rules does not require passing both
advanced rules.
