# Administrator integration registry

The protected `/admin/integrations` route gives platform administrators one read-only view of the
portal's provider-facing configuration and asynchronous delivery posture.

It covers hotel channel connections, flight supplier connections, notification-delivery counts,
and integration-outbox counts. Supplier lists are capped at 100 records per type and ordered by the
most recently updated connection.

## Security boundary

- The route requires a platform administrator session.
- Credential and external-account references are never rendered. The registry reports only whether
  a reference exists.
- The page has no activation, credential, synchronization, retry, payment, or configuration action.
- Provider onboarding, approved commercial terms, credentials, and production infrastructure stay
  outside this local implementation.
- Cashfree is not configured or modified by this registry.

Operational retries remain in `/admin/operations`; notification management remains in
`/admin/notifications`; supplier-owned mapping and synchronization remain in the scoped partner
workspaces.
