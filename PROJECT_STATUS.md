# Mandyal Travels Project Status

Last reviewed: 15 August 2026

This document separates the working portal from items that require approved production providers,
credentials, or commercial rules. The Master Blueprint remains the product source of truth.

## Working portal scope

### Customer travel

- Customer registration, sign-in, sign-out, secure browser sessions, active-session review and
  other-device revocation, profile editing, and password changes
- Persistent booking-email, SMS-alert, WhatsApp-update, and marketing preferences
- Hotel, flight, bus, and car search and booking demonstrations
- Provider-neutral Flight search validation now enforces IATA-style airport codes, travel dates,
  bounded passenger counts, route/cabin/date matching, seat sufficiency, positive prices, valid
  segment timing, and continuous connections before supplier offers can enter checkout
- Versioned, no-store Flight offer search and revalidation APIs expose the same governed service
  boundary to future web, Android, iOS, B2B, and corporate clients
- Personal Flight, Bus, and Car checkout now revalidates the selected inventory, travel dates,
  promotion, and final total on the server and fails safely when persistence is unavailable; the
  browser can no longer show a successful confirmation for an unsaved trip
- Flight booking persistence validates the exact adult count, bounded passenger names, supported
  gender values, email address, and normalized phone length at the API boundary
- Flight offers distinguish outbound and return legs, reject incomplete or wrong-date round trips,
  and display both legs before selection; the fixture adapter includes a revalidatable round-trip
  example without pretending to provide live airline inventory
- Provider-neutral Bus validation rejects wrong-date, wrong-route, over-capacity, malformed-timing,
  invalid-rating, and non-positive-price offers while normalizing bounded amenity data; personal
  Bus checkout also fails safely if its server-side booking cannot be saved
- Versioned, no-store Bus offer search and revalidation APIs reuse that supplier boundary for
  future mobile, partner, B2B, and corporate clients
- Bus checkout validates the exact passenger roster, booking contact, and a unique seat assignment
  for every traveller at the server boundary instead of trusting browser session data
- Car search and revalidation now enforce bounded locations, drivers and rental length, validate
  provider inventory/capacity/pricing, normalize feature data, and expose versioned no-store APIs
  shared by direct partner and future external supplier inventory
- Car checkout validates the primary driver's age, name, driving licence, email, and phone again at
  the server boundary before any personal or approved-company trip can be confirmed
- Hotel availability results with typed star/amenity/refundability filters, price/rating sorting,
  and bounded pagination
- Provider-ready natural-language hotel discovery with explicit explanations and inventory-backed
  availability and pricing safeguards
- Promotion validation, protected demonstration payment forms, confirmation documents, and unified
  customer travel history
- Flight, Bus, and Car confirmations, tickets, itineraries, and vouchers require the signed-in
  customer to own the matching persisted trip; URL parameters alone cannot unlock documents
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
- Editable supplier room definitions and normalized multi-rate-plan management with meal plans,
  refundable policies, taxes, and enforced minimum/maximum stay restrictions; the additive
  migration backfills every existing room without changing its public rate-plan identifier
- Structured free-cancellation cutoffs on supplier rates, validated from 0 to 720 hours and used by
  customer refund-eligibility decisions
- Refund cutoffs anchored to each property's configured check-in time and IANA timezone rather than
  UTC midnight, with invalid timezone data failing closed
- Date-level Hotel PMS controls for seasonal pricing, availability limits, stop-sell,
  closed-to-arrival, closed-to-departure, and minimum/maximum stays, enforced by customer search
  and booking quote validation
- Supplier-managed car fleets with vehicle pricing and dated availability controls
- Booking dashboards, hotel amendment review, and append-only partner activity history
- Guarded hotel stay operations for check-in, check-out, and no-show handling with append-only
  supplier audit entries
- Property-timezone-aware arrival guards prevent future stays from being checked in or marked as
  no-shows, and prevent check-in after the scheduled stay has ended
- Persisted physical room assignments required at check-in, validated against booked quantity and
  overlapping checked-in stays, displayed to front-desk users, audited, and included in exports
- Supplier-owned physical room registry with room-type inventory caps, unique room numbers,
  ready/dirty/cleaning and active/out-of-service controls, audited changes, ready-room enforcement
  at check-in, and automatic dirty status after checkout
- Front-desk room allocation loads only registered, active, housekeeping-ready rooms for the booked
  room type, excludes rooms occupied by active stays, and requires exact checkbox selection before check-in
- A dedicated supplier housekeeping board summarizes ready, dirty, cleaning, and out-of-service rooms
  across managed properties and uses the existing scoped, audited room-status workflow
- Supplier-private front-desk booking notes with bounded content, partner scoping, and append-only
  audit records; notes remain excluded from customer records and operational CSV exports
- Guest special requests captured before payment, persisted with the lead guest, shown on customer
  confirmation and supplier booking operations, and explicitly presented as non-guaranteed preferences
- Platform property review workflow for supplier-created listings with pending, approved, and
  rejected states, correction notes, administrator decisions, audit history, and approval-gated search publication
- Consolidated administrator property-review queue with oldest-first ordering, submission context,
  active-room counts, and direct navigation to the exact supplier listing decision controls
- Formula-safe supplier booking CSV exports that honor active dashboard filters and reject result
  sets above the bounded 1,000-record operational limit instead of silently truncating records
- Server-side supplier booking search and booking/stay-status filters with matching scoped totals,
  captured-value summaries, and pagination
- Validated arrival-window filters for front-desk arrival lists, combinable with booking search and
  operational status filters
- Integration-key compatibility for approved server-to-server partner operations without exposing a
  shared key in browser forms
- Integration-key requests require a validated active supplier identifier; an integration key alone
  cannot enumerate cross-supplier bookings, properties, inventory, amendments, reviews, or exports
- Supplier-scoped activity history with server-side action, record-type, and text filters, bounded
  pagination, actor attribution, and immutable operational audit records
- Arrival-based supplier performance reports with bounded periods and exact booking, captured-value,
  room-night, cancellation, no-show, check-out, average-value, and per-property rollups
- Quote, availability-lock, booking, guest, payment-transaction, inventory-override, and amendment
  persistence
- Pagination and bounded query sizes for operational lists
- Explicit row limits for company travel, statement, and audit CSV exports with filter guidance when
  a report is too large
- Health/readiness endpoint at `/api/v1/health` verifies database access and core customer,
  organization, booking, and company-request schema availability, plus pending and dead-letter
  integration-event health
- Transactional hotel-booking integration outbox with deduplication, worker leases, bounded
  exponential retry, dead-letter handling, and a provider-neutral delivery adapter
- Automated Hotel domain regression tests for PMS restrictions, seasonal rates, property approval,
  stay timing, physical-room assignment, housekeeping readiness, and integration retries
- On-demand SQLite backups with SHA-256 sidecars and bounded retention, plus a production release
  environment preflight that rejects missing, short, or placeholder secrets
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
6. Production database, off-site encrypted backup storage, monitoring, alerting, domain/DNS, TLS,
   hosting, and a scheduler/worker for the prepared integration outbox
7. Legal pages and approved customer communications: privacy, terms, cancellation, refunds, and
   consent wording

The current company statements intentionally identify themselves as reporting statements, not GST
tax invoices.

## Release procedure

1. Run `npm run db:backup` and copy the backup plus checksum to approved encrypted storage.
2. Run `UPDATE-PORTAL.cmd`. Never approve a Prisma data-loss warning without review.
3. Run `npm run check`.
4. Run `npm run release:verify-env` with the production environment loaded.
5. Start the portal with `START-PORTAL.cmd`.
6. Confirm `/api/v1/health` reports ready and has no unexplained dead-letter events.
7. Smoke-test one customer journey and one company approval-to-booking journey.

## Current quality gate

Seasonal pricing is rate-plan-specific: room-only, breakfast, and other plans retain independent
daily prices across search and booking quotes, while availability and stay restrictions remain
room-scoped. The additive `PartnerRatePlanInventoryDay` model keeps those overrides normalized and
supplier-scoped.

Front-desk stay transitions are evaluated using the property's configured timezone. Future arrivals
cannot be checked in or marked as no-shows, and an expired stay cannot be checked in.

Managed properties can register their physical rooms and operate a basic housekeeping lifecycle.
When a room type has registered rooms, check-in accepts only registered rooms that are ready and in
service; checkout marks the assigned rooms dirty for housekeeping follow-up.

Booking operations include a private supplier note for arrival preferences, accessibility support,
and shift handovers. Every note change is scoped to the assigned supplier and recorded in activity
history without copying the note text into audit metadata.

Guests can submit bounded accessibility, dietary, arrival, and room-preference requests before
payment. The request is persisted with the booking and handed to the assigned property while the UI
clearly states that fulfilment depends on availability.

Supplier-created properties enter a platform review queue after an active room is added. Only an
administrator-approved property can publish to hotel search; rejected listings remain private with
correction guidance, while the additive migration preserves existing published inventory as approved.

The current travel-domain milestone passes 20 regression tests, Prisma Client generation,
strict TypeScript, ESLint, a Next.js production build with all 86 generated route entries, and
clean-database verification of all 43 migrations with foreign-key integrity enabled. Provider
integration work must preserve those checks and add provider-specific automated tests before going live.
