# Mandyal Travels deep audit register — 21 September 2026

## Objective

Re-audit the complete Mandyal Travels platform from the first delivered feature through the current
production release. Verify behavior with evidence, repair reproducible defects, remove accidental
duplication, and preserve fail-closed controls where legal, tax, payment, supplier, privacy, or
provider approval is incomplete.

This register is the durable source of truth for the audit. It does not replace approval by qualified
Indian legal, tax, privacy, payment, employment, or travel-industry advisers.

## Audit rules

- Preserve user data and unrelated work. Never weaken authentication, authorization, audit trails,
  payment controls, tax gates, consent requirements, or provider feature flags to make a test pass.
- Treat production records as live. Use clearly labelled internal test records and never create a
  real payment, supplier fulfilment, statutory invoice, identity record, or public claim during QA.
- Support a claim only with code, automated-test, production-monitor, or controlled UI evidence.
- Verify changing legal and regulatory requirements against current primary government, regulator,
  standards-body, or contracted-provider sources. Record the source, retrieval date, applicability,
  owner, and required professional approval.
- Fix verified defects in small reviewable batches. Run proportionate regression tests after every
  batch and the complete release suite before deployment.

## Workstreams

1. Repository integrity: formatting, lint, types, build, migrations, dependency health, dead code,
   duplicate routes/components, unfinished markers, unsafe defaults, and configuration drift.
2. Security and privacy: authentication, authorization, tenant isolation, sessions, CSRF/origin
   controls, rate limits, uploads, secrets, logs, consent, retention, export, and deletion behavior.
3. Data and finance: booking state machines, idempotency, concurrency, inventory, folios, cashier,
   settlement, refunds, tax gates, append-only evidence, reconciliation, backup, and restore.
4. Product journeys: public hotel discovery and booking; traveller, partner/PMS, business/agency,
   and administrator workspaces; email and worker journeys; desktop and mobile accessibility.
5. Navigation and actions: every generated page, internal link, form, button, empty/error/loading
   state, permission boundary, and cross-workspace return path.
6. Production operations: Railway services, workers, scheduled jobs, monitoring, alert ownership,
   recovery procedures, deployment configuration, and launch gates.
7. Legal and commercial readiness: company disclosures, consumer terms, cancellation/refunds,
   privacy/cookies, GST and invoicing, payment-provider obligations, supplier contracting, hotel
   onboarding, communications consent, accessibility, and international applicability.
8. Business completeness: compare the implemented hotel marketplace and PMS journeys with actual
   operator needs. Add only low-risk, evidence-backed essentials; register external integrations or
   regulated capabilities as gated work rather than presenting them as live.

## Severity and completion standard

- **Critical:** unauthorized access, data exposure, financial corruption, unsafe production action,
  or legally misleading live behavior. Fix or disable before launch.
- **High:** broken core booking/PMS journey, tenant leak, irreversible inconsistency, or missing
  required control. Fix before customer onboarding.
- **Medium:** broken secondary action, confusing state, accessibility failure, duplicated logic, or
  weak recovery. Fix before broad release when practical.
- **Low:** polish, maintainability, or non-blocking improvement. Fix in bounded batches.

A workstream is complete only when its findings, fixes, tests, residual risks, external approvals,
and production evidence are recorded here or in a linked dated report.

## Current baseline

- The 21 September operational-date fix is deployed and production-monitored.
- Controlled PMS reservation `MT55D90995DD9C` is checked in to Room 103 with no payment recorded.
- The trial property is on operational date 2026-09-21; five rooms are housekeeping-ready.
- The static launch-readiness register currently verifies 20 unique gates with committed runbooks.
- Live payments, statutory invoicing, supplier payouts, and unapproved external channels remain
  outside controlled-trial authorization until their existing launch gates are satisfied.

## Findings ledger

### DA-001 — Sensitive account mutations lacked an explicit same-origin guard

- **Severity:** High
- **Affected operations:** profile update, notification/marketing consent update, privacy-request
  creation, and revocation of other sessions.
- **Evidence:** the four authenticated route handlers parsed or mutated account state without first
  calling the shared `isSameOriginMutation` control.
- **Resolution:** added a fail-closed 403 origin check before authentication-dependent state reads or
  writes and added a source-level regression test covering all four routes.
- **Residual risk:** session-cookie controls remain defense in depth; browser and production-route
  verification must still pass before release.

Additional findings will be appended with identifiers, severity, evidence, owner, resolution,
tests, deployment reference, and any remaining external dependency.
