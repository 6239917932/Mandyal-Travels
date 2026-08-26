# Scheduler and worker runbook

## Safe maintenance autopilot

The provider-neutral safe-maintenance pass is available through `npm run worker:maintenance`. It is
an authenticated, scheduler-owned, one-shot job. Each run acquires a database lease, writes a
correlation-scoped run record, and processes bounded batches of only these expiry transitions:

- delete expired direct-bus seat holds;
- mark expired active hotel availability locks as expired; and
- release expired reserved promotion claims while atomically returning campaign capacity.

The job cannot capture or refund a payment, release a payout, confirm or cancel a booking, alter a
price, publish inventory, or change a supplier. Those remain explicit, governed workflows.

Configure `AUTOPILOT_WORKER_SECRET` independently from every other secret, schedule only one active
invocation, and set bounded retry/backoff plus an alert on terminal failure. A duplicate invocation
receives HTTP 409 while the lease is active. Operators may replay after the lease expires; each
successful mutation is idempotent or compare-and-set protected. Preserve `AutomationJobRun` records
with scheduler logs as release evidence.

Recurring work must be idempotent, lease-protected, bounded, observable, retryable with backoff, and safe under duplicate delivery. Jobs include notification delivery, provider synchronization, payment reconciliation, settlement generation, privacy retention, search projection rebuilds, backup verification, and stale-hold cleanup.

Notification delivery uses the independent `NOTIFICATION_WORKER_SECRET`, a bounded batch, provider
deduplication keys, stale-item recovery, and the `NOTIFICATION_DELIVERY_V1` database lease. Every
invocation records private correlation evidence in `AutomationJobRun`; a duplicate active pass is
rejected with HTTP 409. The admin console displays only numeric delivery totals and a derived private
reference, never recipients, message content, provider references, or provider errors.

Use a managed scheduler and queue in production. Each job requires a service identity, timeout, batch limit, dead-letter path, correlation ID, health metric, manual replay procedure, and documented owner. Never run critical recurring work only from a web request or a developer laptop.
