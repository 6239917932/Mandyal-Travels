# Administrator user-access governance

Platform administrators can inspect and govern account access from `/admin/users/[userId]` without changing public or organization roles. Every account is explicitly `ACTIVE` or `SUSPENDED`. Unknown stored states fail closed.

## Suspension and restoration contract

- Each change requires the current access version, an operational reason between 10 and 500 characters, and the exact phrase `SUSPEND email@example.com` or `RESTORE email@example.com`.
- Changes use a serializable database transaction and a conditional old-status/old-version update. Concurrent or stale reviews return a conflict instead of overwriting newer evidence.
- A successful transition increments the access version once, records the change time, revokes every session for the account, and appends one immutable `UserAccessEvent` with the actor, prior state, next state, reason, and matching version.
- Administrators cannot suspend their own signed-in account. The final active platform administrator cannot be suspended.
- Restoration permits a fresh sign-in; it never recreates a revoked session.
- Suspended accounts receive the same credential failure returned for invalid public sign-in credentials. Session lookup checks the live account state and removes any residual suspended session before returning no session.

The administrator audit workbench exposes access events in the `SECURITY` domain. User records show the current state, version, last change, and recent decisions. This capability does not provide role promotion, delete accounts, change organization membership, or modify bookings, payments, refunds, suppliers, or inventory.

## Platform administrator provisioning

Public registration cannot create a platform administrator. The existing offline command only accepts a separate active `CUSTOMER`, requires an email-bound confirmation argument, revokes existing sessions, and records a security event:

```powershell
npm run admin:grant -- administrator@example.com --confirm=GRANT_PLATFORM_ADMIN:administrator@example.com
```

Run database migrations before using this command. Role removal or web-based role promotion is not part of this lifecycle.
