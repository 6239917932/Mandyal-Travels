# Railway production status — updated 8 September 2026

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

- 728 domain and security tests pass.
- All 104 SQLite migrations and the 132-model PostgreSQL parity contract pass.
- The production build completes with 255 application routes.
- Static verification confirms 503 internal links resolve to registered application routes.
- The additive PMS registry contains 44 unique workspaces: 33 live, 5 controlled foundations, and
  6 clearly labelled planned workspaces. Existing modules remain available; unfinished or
  provider-dependent transactions are not presented as live.
- Live Railway smoke, accessibility, internal-link, and bounded-load checks pass.
- A least-privilege synthetic monitor checks canonical availability, dependency readiness, security
  headers, and bounded latency twice per hour through GitHub Actions.
- The production dependency audit reports no known high-severity runtime vulnerabilities.
- Next.js 16.3.4 was merged only after the refreshed branch passed the complete CI matrix.

## Remaining commercial launch gates

- Activate and certify PayU live payment, webhook, reconciliation, refund, and chargeback flows.
- Complete supplier contracts, agreements, and onboarding approvals.
- Select and certify an SMS OTP provider if phone OTP is required in addition to email OTP.
- Complete legal, tax, privacy, and operational sign-off.
- Validate external paging and on-call ownership, execute and record a restore drill, and approve the high-availability topology.
- Enroll the platform administrator's authenticator before enabling live payments or supplier access.

Until those gates are complete, the portal remains in staging posture and must not process live payments or supplier payouts.
