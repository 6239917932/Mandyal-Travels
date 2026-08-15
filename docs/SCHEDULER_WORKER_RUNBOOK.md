# Scheduler and worker runbook

Recurring work must be idempotent, lease-protected, bounded, observable, retryable with backoff, and safe under duplicate delivery. Jobs include notification delivery, provider synchronization, payment reconciliation, settlement generation, privacy retention, search projection rebuilds, backup verification, and stale-hold cleanup.

Use a managed scheduler and queue in production. Each job requires a service identity, timeout, batch limit, dead-letter path, correlation ID, health metric, manual replay procedure, and documented owner. Never run critical recurring work only from a web request or a developer laptop.
