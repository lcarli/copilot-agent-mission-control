# Event Ingestion

Validates participant domain events, enforces event/unit isolation, stores
events with aggregate and idempotency constraints, and publishes newly stored
events. Pending publication is retried by an equivalent idempotent request.
