# Railway production status — 7 September 2026

## Verified platform state

- `www.mandyaltravels.com` is the canonical Railway-hosted portal and the apex domain redirects to it.
- The Railway application and PostgreSQL services are online. Public, authentication, partner, administrator, and health routes return successfully.
- Readiness checks report the database, schema, and required dependencies as ready.
- The migrated PostgreSQL data was reconciled with the former source without an unexpected table-count mismatch.
- The current schema, sole platform-administrator invariant, and session-revocation controls were verified.
- PostgreSQL point-in-time recovery and daily, weekly, and monthly volume backups are enabled. A post-migration restore point is present.
- The retired Render Blueprint, web service, database, and account were removed; the former service URLs no longer serve the portal.
- Email OTP is mandatory for customer and partner authentication. Administrator authenticator enrollment remains intentionally pending.

## Quality evidence

- 617 domain and security tests pass.
- All 92 SQLite migrations and the 110-model PostgreSQL parity contract pass.
- The production build completes with 200 application routes.
- Live Railway smoke, accessibility, internal-link, and bounded-load checks pass.
- The production dependency audit reports no known high-severity runtime vulnerabilities.

## Remaining commercial launch gates

- Activate and certify PayU live payment, webhook, reconciliation, refund, and chargeback flows.
- Complete supplier contracts, agreements, and onboarding approvals.
- Select and certify an SMS OTP provider if phone OTP is required in addition to email OTP.
- Complete legal, tax, privacy, and operational sign-off.
- Configure production monitoring and alerting, execute and record a restore drill, and approve the high-availability topology.
- Enroll the platform administrator's authenticator before enabling live payments or supplier access.

Until those gates are complete, the portal remains in staging posture and must not process live payments or supplier payouts.
