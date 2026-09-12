# Railway production status — updated 12 September 2026

## Verified platform state

- `www.mandyaltravels.com` is the canonical Railway-hosted portal and the apex domain redirects to it.
- The Railway application and PostgreSQL services are online. Public, authentication, partner,
  administrator, and health routes return successfully.
- Readiness checks report the database, schema, and required dependencies as ready.
- The migrated PostgreSQL data was reconciled with the former source without an unexpected
  table-count mismatch.
- The current schema, sole platform-administrator invariant, and session-revocation controls were
  verified.
- PostgreSQL point-in-time recovery and daily, weekly, and monthly volume backups are enabled. A
  post-migration restore point is present.
- The retired Render Blueprint, web service, database, and account were removed; the former service
  URLs no longer serve the portal.
- Email OTP is mandatory for customer and partner authentication. Administrator authenticator
  enrollment remains a launch gate.

## Quality evidence

- 762 domain and security tests pass.
- All 104 SQLite migrations and the 132-model PostgreSQL parity contract pass.
- The production build completes with 265 application routes.
- Static verification confirms 541 internal links resolve to registered application routes.
- Twelve focused mobile-readiness, mobile-workspace, registry, and provider-gate tests pass.
- The additive PMS registry contains 46 unique workspaces: 42 live, 3 controlled foundations, and
  1 clearly labelled planned workspace. Existing modules remain available; unfinished or
  provider-dependent transactions are not presented as live.
- Live Railway smoke, accessibility, internal-link, and bounded-load checks pass.
- A least-privilege synthetic monitor checks canonical availability, dependency readiness, security
  headers, and bounded latency twice per hour through GitHub Actions.
- The production dependency audit reports no known high-severity runtime vulnerabilities.
- Restaurant POS, kitchen tickets, QR ordering, captain/mobile service, split billing, expense and
  payroll registers, provisional P&L, and reviewed Tally XML export are live governed workflows.
- Next.js 16.3.4 was merged only after the refreshed branch passed the complete CI matrix.

## Acceptance evidence — 12 September 2026

The trial workspace completed an end-to-end controlled PMS workflow using reservation
`MT09A19EC47A7B`: room assignment and check-in, simulated accommodation/room-service/POS charges,
split cash and UPI recording, checkout, housekeeping inspection, cashier reconciliation, night
audit, expense and payroll registers, provisional P&L, operational reports, and balanced Tally XML
scope. The recorded totals were ₹2,250 revenue/collections, ₹1,050 expenses, and a ₹1,200
provisional result.

The test also verified that:

- statutory GST invoicing remains blocked until GSTIN, state code, profile review, and tax-adviser
  approval are complete;
- guest identity registration requires a real document inspection and lawful basis/consent, so no
  fictional identity evidence was recorded;
- append-only audit controls preserve the trial records instead of silently rewriting history; and
- the administrator account still requires authenticator enrollment before sensitive production
  activation.

## Remaining commercial launch gates

- Activate and certify PayU live payment, webhook, reconciliation, refund, and chargeback flows.
- Complete supplier contracts, agreements, and onboarding approvals.
- Select and certify an SMS OTP provider if phone OTP is required in addition to email OTP.
- Complete legal, GST/tax, privacy, and operational sign-off.
- Validate external paging and on-call ownership, execute and record a restore drill, and approve the
  high-availability topology.
- Enroll the platform administrator's authenticator before enabling live payments or supplier
  access.
- Contract and certify any external OTA/channel provider before enabling external synchronization.

Until those gates are complete, the portal remains in controlled pre-launch posture and must not
process live payments or supplier payouts.
