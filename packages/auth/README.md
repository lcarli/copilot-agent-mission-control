# Authentication

Authentication primitives for event registration and instructor operations.

- Event codes are generated with a nonambiguous alphabet and stored only as
  versioned scrypt verifiers.
- Unit JWTs are short-lived, audience-bound, and scoped to exactly one event
  session and unit.
- Token versions support immediate unit-wide revocation and rotation.
- Instructor authorization is explicit by role, action, and event-session
  scope.

The package does not persist plaintext event codes, tokens, signing secrets, or
upstream instructor credentials.
