# Event and Unit Management

Domain service for event-session and unit lifecycle operations.

- Creates event sessions without persisting plaintext event codes.
- Opens lobbies and starts or closes events with optimistic versions.
- Registers units with event-scoped display-name uniqueness.
- Issues short-lived unit tokens and one-time-disclosed reconnect secrets.
- Reconnects eligible units without exposing other unit state.
- Enforces token, event-session, unit, and token-version isolation.

The included in-memory repository is intended for tests and local development.
Azure persistence adapters can implement the same repository interface.
