# Mandyal Travels Project Status

Last reviewed: 11 August 2026

This document separates the working portal from items that require approved production providers,
credentials, or commercial rules. The Master Blueprint remains the product source of truth.

## Working portal scope

### Customer travel

- Customer registration, sign-in, sign-out, secure browser sessions, profile editing, and password
  changes
- Persistent booking-email, SMS-alert, WhatsApp-update, and marketing preferences
- Hotel, flight, bus, and car search and booking demonstrations
- Promotion validation, protected demonstration payment forms, confirmation documents, and unified
  customer travel history
- Customer hotel cancellation/amendment handling and account-bound booking access

### Business travel

- Separate organization workspace and personal customer account
- Organization contact and billing profile, traveller invitations, membership removal, and
  administrator/traveller roles
- Versioned travel policy with approval requirement, default flight cabin, and maximum trip amount
- Company travel requests with policy snapshots, retry protection, approval/rejection decisions,
  reviewer notes, and immutable audit history
- Approved-request checkout safeguards for hotel, flight, bus, and car bookings; rejected or pending
  requests cannot be used to create a company booking
- Company reporting, CSV export, booking statements, full request history, team access history, audit
  export, and organization support cases

### Partner and operational foundation

- Partner-key protected hotel booking, inventory, and amendment operations
- Quote, availability-lock, booking, guest, payment-transaction, inventory-override, and amendment
  persistence
- Pagination and bounded query sizes for operational lists
- Health/readiness endpoint at `/api/v1/health`
- Safe Windows start and update helpers with automatic pre-update database backups
- Automated clean-database migration and foreign-key integrity verification in the release quality
  gate

### Security and reliability controls

- Password hashing, server-side sessions, secure cookie settings, login/register throttling, and
  session revocation after a password change
- Content-security policy, anti-framing, content-type, referrer, permissions, and production HTTPS
  response headers
- Same-origin enforcement for authenticated API mutations to protect account and booking actions
  from cross-site requests
- Authorization checks at customer, organization, administrator, and partner API boundaries
- Bounded JSON bodies and server-side validation for booking, policy, member, support, and account
  mutations
- Idempotency/retry safeguards for travel requests and booking completion
- No raw payment-card data is persisted
- Production startup rejects missing, placeholder, shared, or short application secrets

## Production integrations still required

These are not safely implementable with invented values. They require provider accounts, approved
credentials, contracts, or signed-off business rules:

1. Live payment authorization, capture, refund, reconciliation, and webhook processing
2. Live hotel, airline, bus, and car supplier APIs with production inventory and ticketing
3. Transactional email, SMS, and WhatsApp delivery providers
4. Statutory GST tax invoices, tax component rules, credit notes, and invoice numbering
5. Contracted corporate pricing, partner commission, markup, settlement, and refund rules
6. Production database, encrypted backups, monitoring, alerting, domain/DNS, TLS, and hosting
7. Legal pages and approved customer communications: privacy, terms, cancellation, refunds, and
   consent wording

The current company statements intentionally identify themselves as reporting statements, not GST
tax invoices.

## Release procedure

1. Back up the database.
2. Run `UPDATE-PORTAL.cmd`. Never approve a Prisma data-loss warning without review.
3. Run `npm run check`.
4. Start the portal with `START-PORTAL.cmd`.
5. Confirm `/api/v1/health` reports ready.
6. Smoke-test one customer journey and one company approval-to-booking journey.

## Current quality gate

The saved baseline is expected to pass lint, TypeScript checking, and a production build. Provider
integration work must preserve those checks and add provider-specific automated tests before going
live.
