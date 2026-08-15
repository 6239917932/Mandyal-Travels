# Mandyal Travels Project Status

Last reviewed: 12 August 2026

This document separates the working portal from items that require approved production providers,
credentials, or commercial rules. The Master Blueprint remains the product source of truth.

## Working portal scope

### Customer travel

- Customer registration, sign-in, sign-out, secure browser sessions, active-session review and
  other-device revocation, profile editing, and password changes
- Persistent booking-email, SMS-alert, WhatsApp-update, and marketing preferences
- Hotel, flight, bus, and car search and booking demonstrations
- Hotel availability results with typed star/amenity/refundability filters, price/rating sorting,
  and bounded pagination
- Provider-ready natural-language hotel discovery with explicit explanations and inventory-backed
  availability and pricing safeguards
- Promotion validation, protected demonstration payment forms, confirmation documents, and unified
  customer travel history
- Customer hotel cancellation/amendment handling and account-bound booking access
- Verified-stay hotel reviews restricted to signed-in customers with a completed confirmed booking
- Protected hotel-review moderation with rejection notes, supplier-scoped public responses, and
  partner audit history
- Booking-linked customer support cases with personal status tracking and operations resolution
- Bounded personal JSON archive for profile, preferences, bookings, company requests, and support
  history without passwords, session tokens, or card data
- Platform-admin user and organization directories with bounded search, pagination, and protected
  read-only servicing records for profile, access, travel, support, policy, and audit context
- Account security activity history for sign-ins, profile/password/preference changes, and session revocation
- Keyboard skip navigation, visible focus indicators, active-page semantics, and responsive primary
  navigation

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

- Separately provisioned, read-only platform operations console with an executive activity snapshot,
  quick navigation, and customer, organization, session, booking, company approval, support, and
  hotel amendment oversight
- Accurate full-account servicing totals, direct user-to-organization navigation, queue shortcuts,
  a visible security-control posture, and a prefilled bounded reporting window
- Platform support-case close/reopen servicing with organization audit entries for every state
  change
- Customer support servicing with required resolution notes and append-only case events
- Platform-admin operational travel CSV across hotel, flight, bus, and car records with date filters
  and bounded export size
- Admin-approved supplier onboarding with named sign-in and a scoped operations workspace
- Supplier-managed hotel properties, room types, rates, amenities, publication controls, dated
  availability and stop-sell controls connected to public hotel search and booking
- Expanded hotel property profiles covering type, contacts, map coordinates, timezone, languages,
  landmarks, guest eligibility, house rules, and multi-image galleries
- Structured hotel destination hierarchy covering locality, town or city, tehsil, district, state,
  searchable aliases, landmarks, and safe editing of already-published property locations; public
  and AI-assisted hotel discovery use the same expanded destination vocabulary
- Governed, categorized property and room amenity checklists with standardized supplier selections,
  duplicate normalization, responsive controls, and the same catalogue powering customer filters
- Supplier-managed car fleets with vehicle pricing and dated availability controls
- Booking dashboards, hotel amendment review, and append-only partner activity history
- Integration-key compatibility for approved server-to-server partner operations without exposing a
  shared key in browser forms
- Quote, availability-lock, booking, guest, payment-transaction, inventory-override, and amendment
  persistence
- Pagination and bounded query sizes for operational lists
- Explicit row limits for company travel, statement, and audit CSV exports with filter guidance when
  a report is too large
- Health/readiness endpoint at `/api/v1/health` verifies database access and core customer,
  organization, booking, and company-request schema availability
- Safe Windows start and update helpers with automatic pre-update database backups
- Automated clean-database migration and foreign-key integrity verification in the release quality
  gate

### Security and reliability controls

- Password hashing, server-side sessions, secure cookie settings, login/register throttling,
  account-scoped active-session controls, and session revocation after a password change
- Content-security policy, anti-framing, content-type, referrer, permissions, and production HTTPS
  response headers
- Self-contained system font stack so production builds do not depend on Google Fonts availability
- Same-origin enforcement for authenticated API mutations to protect account and booking actions
  from cross-site requests
- Authorization checks at customer, organization, administrator, and partner API boundaries,
  including property-level filtering for supplier booking, inventory, and amendment operations
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
