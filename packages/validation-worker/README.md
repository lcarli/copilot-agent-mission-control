# Validation worker

Runs closed, versioned validator modules against server-resolved structured
submissions and evidence. The worker enforces scope isolation, deadlines,
bounded structured results, retries, and idempotent result persistence. It does
not execute participant source code.
