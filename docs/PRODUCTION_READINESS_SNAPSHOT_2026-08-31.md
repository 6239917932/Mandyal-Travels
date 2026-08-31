# Production readiness snapshot — 31 August 2026

This snapshot separates implemented portal controls from work that depends on an external approval,
credential, contract, professional review, or paid production service. A prepared integration is not
an activated integration.

## Public review posture

- The canonical website is `https://www.mandyaltravels.com` and the apex domain redirects to it.
- The public readiness endpoint reports only generic database, schema, and dependency posture.
- Payment checkout, capture, refund, payout, and provider webhooks remain in sandbox or disabled
  mode. No live Cashfree credential has been added.
- Supplier applications, partner mutations, and publication of supplier inventory remain paused.
- Flight, bus, car, and external hotel provider inventory remains disabled unless a contracted
  provider is explicitly configured and certified.
- Legal and commercial policies remain marked as operational drafts pending qualified review.

## Implemented and verified controls

- Private, server-side sessions use secure, HTTP-only cookies; platform-administrator sessions have
  a 12-hour absolute lifetime.
- Public registration cannot create a platform administrator. Production startup enforces the
  separately configured sole-administrator account and revokes any additional administrator role.
- Password hashing, common-password screening for new credentials, recovery-token hashing,
  password reset/change throttling, session revocation, and browser-data clearing are implemented.
- Authenticator-app MFA and recovery codes are implemented. The administrator console visibly
  warns until the sole administrator completes enrollment.
- Same-origin checks protect authenticated and public mutations; high-risk public actions have
  bounded request bodies and targeted rate limits.
- Partner publication is approval gated, and production partner mutations are disabled at the
  request boundary.
- Security headers include CSP, HSTS, anti-framing, MIME sniffing protection, a restrictive
  permissions policy, and a same-origin resource policy. Protected pages and APIs are private,
  no-store, and noindex.
- No raw card data is stored. Demonstration transport card forms are hard-disabled in production.
- GitHub branch protection requires the audit, container, verification, and CodeQL checks. Secret
  scanning, push protection, Dependabot security updates, and CodeQL are enabled.
- On 31 August 2026, the full local quality gate passed formatting, ESLint, strict TypeScript, 560
  domain tests, 86 migration checks, 100-table PostgreSQL parity, deployment verification, and a
  190-route production build. The repository reported no open npm, Dependabot, CodeQL, or secret
  scanning alerts at that snapshot.

## Mandatory owner actions before accepting real business

1. Complete Cashfree merchant approval, then add only the production credentials supplied through
   Render's secret settings. Certify signed webhooks, idempotency, reconciliation, chargebacks,
   refunds, and payout settlement before changing any payment feature flag.
2. Complete the sole administrator's authenticator enrollment and verify recovery codes from a
   second device before making MFA mandatory for every administrative session.
3. Obtain qualified Indian legal review of customer policies, supplier agreements, grievance
   disclosures, marketplace role, vehicle-aggregator classification, insurance allocation, and
   State-specific requirements. Replace draft versions only after signed approval.
4. Obtain GST/tax classification and invoicing sign-off for each marketplace supply model. Do not
   activate the proposed commission, GST ledger, tax invoice, or supplier settlement calculations
   from assumptions alone.
5. Upgrade the Render web service and PostgreSQL database from temporary/free review plans before
   collecting real customer or supplier data. Enable managed backups, point-in-time recovery,
   restore testing, monitoring, alerting, and a documented incident owner.
6. Configure and verify transactional email before relying on password recovery or booking
   notifications. Complete SPF, DKIM, DMARC, bounce/complaint handling, and suppression controls.
7. Obtain supplier contracts, KYC evidence, licences, permits, insurance, tax profiles, bank
   verification, and human listing approval before enabling supplier intake or publication.
8. Contract and certify each live hotel, flight, bus, or car inventory provider before disabling
   fixture-only or provider-disabled safeguards.
9. Commission an independent application-security assessment and penetration test after provider
   integrations are complete and before public commercial launch. Remediate findings and retest.

## Deliberately deferred product work

- Native Android and iOS releases require approved application identifiers, signing credentials,
  store accounts, device testing, privacy declarations, notification credentials, and store review.
  The installable responsive web application and mobile shortcut foundation are already present.
- Production AI requires an approved provider, data-processing terms, a secret-management path,
  evaluation evidence, cost and abuse limits, human review for consequential output, monitoring,
  and a kill switch. The current trip planner remains bounded and provider-neutral.
- SMS, WhatsApp, push notifications, analytics, and advertising remain inactive until provider,
  consent, telecom, privacy, and delivery-governance requirements are complete.

## Release rule

No single approval should silently activate commerce. Payment processing, payouts, supplier writes,
public inventory, provider adapters, tax documents, and optional tracking must each use an explicit,
reviewed production change with automated tests and a rollback path.
