# Mandyal Travels API v1 governance

## Contract

All supported endpoints are rooted at `/api/v1`. JSON successes use a `data` member where practical. Failures use an `error` object with a stable machine-readable `code` and a user-safe `message`. Validation details must never contain credentials, provider payloads, or stack traces.

## B2B travel-agency customers

`GET` and `POST /api/v1/agent/customers` are restricted to an authenticated administrator of a
`TRAVEL_AGENCY` organization. `PATCH /api/v1/agent/customers/{customerId}` applies the same
organization scope, allows only `ACTIVE` or `INACTIVE` lifecycle states, preserves historical
records, and writes an organization audit entry. Duplicate customer email addresses are rejected
within the agency.

`POST /api/v1/agent/travel-requests` requires a UUID v4 `Idempotency-Key`, an active customer owned
by the same agency, a supported product, governed travel dates, and integer INR estimated value.
The created organization request retains its agency-customer attribution and policy snapshot.
Reusing the key with different customer, organization, actor, or request details is rejected.
An approved attributed request may be serviced by its creating agent or another administrator of
the same `TRAVEL_AGENCY`; this team access never applies to ordinary company requests. Checkout
still revalidates request status, product, dates, amount, policy cabin, inventory, and final price.

`GET /api/v1/agent/reports/export` provides a filterable CSV of customer-attributed requests. It
applies the authenticated travel agency's scope to both the request and customer relation, includes
historical inactive customers, excludes private servicing notes, escapes spreadsheet formulas, and
refuses exports above 5,000 rows instead of returning an incomplete financial report.

Every API response includes `X-Request-ID`. Callers may supply an identifier matching `[A-Za-z0-9][A-Za-z0-9._:-]{7,127}`; invalid values are replaced. Operations that create money, bookings, tickets, settlements, deliveries, or supplier sync work must use a bounded `Idempotency-Key` or an equivalent persisted deduplication key.

List endpoints default to 25 records and must cap requests at 100 unless a stricter product bound is documented. Cursor pagination is preferred for mutable operational data. Responses must expose an opaque next cursor rather than database offsets.

## Compatibility and deprecation

Breaking changes require a new major API path. Additive fields may be introduced in v1 and clients must ignore unknown response fields. A deprecated endpoint remains available for at least 180 days and returns `Deprecation: true`, an RFC 8594 `Sunset` timestamp, and a `Link` header pointing to its successor. Security-critical retirement may be faster only with a recorded incident decision and direct partner notification.

The live contract summary is available from `GET /api/v1/meta`. Provider-specific credentials, schemas, rate limits, certification evidence, and signed commercial obligations remain in the relevant integration runbook and are not committed to source control.

## Platform release controls

`PATCH /api/v1/admin/configuration/features/{key}` is restricted to platform administrators and a
closed catalogue of supported public features. A change requires the version last reviewed by the
administrator and a bounded reason. Successful updates increment the version and write an
append-only event. Stale versions fail with `409` so one administrator cannot silently overwrite
another administrator's decision. The guided trip-planner and new-partner-application controls are
enforced at both their page and API entry points; they never modify existing bookings, partner
memberships, payments, refunds, or provider configuration.

## Customer booking support

`POST /api/v1/account/support` requires an authenticated customer, bounded case details, and a
supported category. When a booking reference is supplied, the API accepts it only when the
corresponding hotel booking or Flight, Bus, or Car trip belongs to the signed-in customer. Created
cases are rate limited and linked to the owned booking with an append-only creation event. A support
case is a request for human review: it does not itself change or cancel inventory, issue a refund,
or alter a payment.

## Account recovery

`POST /api/v1/auth/password-reset/request` accepts an email address and always returns the same
accepted response for valid, unknown, and non-disclosable accounts. Requests are rate limited. When
the account exists, delivery is scheduled after the response so provider latency cannot disclose
account existence.

`POST /api/v1/auth/password-reset/confirm` accepts a 256-bit one-time token plus matching new
password fields. Tokens are stored only as SHA-256 hashes, expire after 30 minutes, and are claimed
atomically before the password changes. Success invalidates every outstanding reset token and every
browser session for the account. The email URL carries the raw token in a fragment so it is not sent
to the web server in the initial request or included in referrer headers.

## Observability and security

Logs and audit events should carry the request ID, authenticated actor ID, action, result, latency, and a non-sensitive entity reference. Authentication secrets, payment data, identity documents, raw supplier payloads, and notification recipients must be redacted. Cookie-authenticated writes are origin checked; privileged routes additionally enforce role and scoped supplier ownership.
