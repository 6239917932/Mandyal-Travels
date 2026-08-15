# Hotel API and channel-manager activation

The supplier PMS already provides scoped property, room, rate-plan, calendar, mapping, synchronization, conflict-reconciliation, and audit APIs. External channel managers must integrate through a contracted adapter; credentials are stored only as secret references and each connection remains inactive until supplier and platform approval.

## Certification sequence

1. Complete commercial, privacy, security, support, and sandbox onboarding with the provider.
2. Register provider property, room, and rate identifiers in the mapping workspace.
3. Verify full inventory/rate import, incremental availability updates, idempotent booking delivery, cancellation delivery, retries, and conflict handling.
4. Reconcile sandbox totals and timestamps against the PMS calendar.
5. Rotate production credentials, enable one pilot property, observe delivery health, and only then expand rollout.

No provider is represented as live until its credentials, webhook signatures, mapping certification, and operational support process have been approved. The internal APIs and queue are production-shaped; the provider-specific network adapter is the final contracted integration step.
