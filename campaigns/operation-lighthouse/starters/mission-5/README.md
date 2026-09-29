# Mission 5 starter

Use the runtime incident brief and success criteria to create an auditable
decision package. No agent implementation or prescribed architecture is
included.

`contracts/submission.schema.json` describes the full submission envelope and
the inner evidence structure: combined incident assessment, at least five
evidence identifiers, at least four distinct successful tool sources, ordered
actions, resource allocations, specialist handoffs, final review and audit.
The server unwraps `evidence` before invoking the campaign validator.

Schema validity is necessary but not sufficient. The validator also checks
consecutive priorities, scoped server-observed receipt IDs, total resource
quantities against observed inventory, canonical destination districts,
distinct handoff roles and approved final review. Every trace entry needs an
`evidenceId`; nested action, handoff and audit citations must belong to the
successful receipts cited by the package. Validator 1.1.0 no longer accepts
declared tool traces without actual observations. Its result contains
individual required and advanced rules.
Modifier handling, replanning, rejected alternatives, human-approval tracking
and efficient tool use remain advanced objectives; do not make all advanced
fields mandatory to complete the core.

Use `mission tools restore-the-lighthouse` and `mission tool` to collect
weather, grid, shelter, transport, resource inventory and incident evidence.
`totalToolCalls`, when provided for the advanced objective, must match the
actual invocation count, including failures. HTTP replay is not a new call.

The local integration validates tool provenance but does not execute the
proposed allocations or validate human identity. Never label a submitted approval flag as proof of an
actual human authorization. Instructor fixtures are kept outside the participant
starters.
