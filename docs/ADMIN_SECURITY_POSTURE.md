# Administrator security posture

The protected `/admin/security` route gives platform administrators read-only access to aggregate
MFA adoption, administrator MFA adoption, active/stale/expired session counts, 24-hour security
event volume, and privacy-preserving request-throttle evidence.

Throttle filters use a closed action and state catalogue. Results are capped at 1,000 records and
paginated at 25. The table intentionally omits the stored key hash as well as the source IP, email,
account identifier, session token, MFA secret, and recovery codes. It shows only the protected
action, attempt count, window timing, block timing, and derived block posture.

This is an observation surface. Account-scoped session revocation remains in account security;
authorized event detail remains in the audit workbench. The page cannot unblock a caller, revoke a
session, change MFA, modify authentication policy, activate providers, or configure Cashfree.
