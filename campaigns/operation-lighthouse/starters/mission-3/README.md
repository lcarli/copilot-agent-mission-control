# Mission 3 starter

Implement an agent from the supplied tool contracts. Authentication values are
injected at runtime; never commit a token or credential.

The canonical tool identifiers are `weather`, `shelter` and `transport`.
The `toolTrace[].tool` values submitted to `connected-city` must use these
names; `shelters` is not an alias. Supply a trace with successful calls to all
three tools, at least three cited evidence identifiers, a shelter and route
recommendation, and a recorded retryable failure followed by a successful
retry of the same operation and arguments, within two retries.
Do not invent tool calls to make a submission pass.

Use `mission tools connected-city` to discover the authenticated operations and
`mission tool connected-city --request <JSON path>` to invoke one. A request
contains `tool`, `operation` and `arguments`; the returned `evidenceId` is a
server-generated receipt scoped to this event, unit and mission. Include that ID
in every trace entry, including failures, and cite successful receipt IDs in
the recommendation. Native IDs inside simulator data are not receipt IDs.

Validator 1.1.0 rejects invented, foreign or mismatched receipts. The selected
shelter must be open with remaining capacity; the route must match a successful
`transport` / `journey` result ending at that shelter's district. Each local
mission session starts at the 10:00 scenario step: its first `weather` /
`forecast` call fails transiently and the next new call succeeds. Reusing the
same idempotency key replays the failure rather than invoking a retry.

The local API records actual HTTP/CLI tool calls but is not an MCP server.
The facilitator must still rehearse the selected VS Code agent and permissions.
