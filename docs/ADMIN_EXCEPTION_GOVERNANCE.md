# Administrator exception governance

`/admin/operations` is the protected operational handoff for integration delivery exceptions,
booking amendments, payment discrepancies, pending refunds, and risk review. Each specialized queue
remains authoritative; the operations page provides exact counts and links rather than duplicating
financial or booking decisions.

## Integration queue controls

- Search terms are limited to 100 characters and status/window filters use closed catalogues.
- Results are paginated at 25 records and deep history is capped at 1,000 matches until filters are
  narrowed.
- Aggregate identifiers are replaced with a stable one-way private reference. Payloads, provider
  errors, customer data, and raw aggregate identifiers are never rendered.
- Retry and ignore require a 5-500 character human note and the exact event update timestamp.
- The event update is conditional, so stale or concurrent reviews fail with a conflict instead of
  overwriting newer state.
- Every successful retry or ignore appends an immutable review event containing actor, transition,
  and note. Existing history is never replaced.

Retry only requeues an eligible event. It does not claim that a provider is healthy, change a
booking or payment, or bypass the integration worker's normal validation.
