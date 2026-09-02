# Hotelbeds certification readiness

This connector remains an isolated, administrator-only evaluation integration. Hotelbeds inventory
is not published to customers, and no booking, cancellation, voucher, payment, or settlement call is
made automatically.

## Implemented contract

- Signed, server-only requests with gzip response negotiation.
- One Availability request per booking workflow.
- Up to 2,000 unique hotel codes in one Availability call.
- Every room/occupancy included in the same call, with explicit child ages.
- CheckRate only when the chosen rate has `rateType=RECHECK`.
- Up to 10 rate keys in one CheckRate request.
- Unknown additive response fields are ignored safely.
- Availability and CheckRate evidence preserves promotion names, cancellation amounts and
  destination-local effective timestamps, room and board details, and rate-comment references.
- A rate with an unresolved `rateCommentsId` fails pre-booking display readiness. Package/opaque
  rates also fail until their combined-product eligibility is explicitly approved.
- A booking workflow cannot become ready until the required CheckRate has completed.
- The future booking transport must use a timeout of at least 60 seconds; the local contract reserves
  65 seconds.
- A governed Content API cache stores bounded, hashed hotel payloads without publishing them.
- Initial content loads use pages of at most 1,000 hotels; later runs use daily differential dates.
- Content synchronization is separately disabled by default, authenticated, lease-protected,
  idempotent by correlation ID, bounded to five pages, and never called from customer search.
- The protected Hotelbeds readiness page reports the sync gate, active cached-property count,
  newest fetch time, freshness state, and ten most recent bounded runs without exposing secrets,
  correlation IDs, or raw provider payloads.
- Content is considered fresh through 36 hours, due soon through 72 hours, and overdue after that.
  An unmigrated database produces a migration-required administrator message instead of a portal
  runtime error.
- Runtime readiness remains unaffected while content sync is disabled. After a release owner
  explicitly requires the sync, `/api/v1/health` fails closed for incomplete connector
  configuration, an unsafe environment, a missing migration, an empty cache, or content older than
  72 hours. A still-usable cache reports attention during an active refresh or after a recent failed
  refresh. The health probe reads local evidence only and never calls Hotelbeds.

## Deliberately blocked

- Booking and cancellation endpoints are not wired. Hotelbeds test/live reservations may have real
  commercial consequences and require an explicit, reviewed certification run.
- Customer search cannot invoke this adapter.
- Production credentials cannot be enabled in a production runtime until the provider environment is
  explicitly set to production.
- The Content API cache schema and worker foundation are provisioned, but no provider request is
  made until a release owner explicitly enables the connector and content-sync gates. Cached HBX
  content is not connected to public search or booking results.
- Voucher output cannot be certified until the exact Hotelbeds booking response fixture is approved.

## Evidence still needed before requesting certification

1. HBX commercial approval and certification contact confirmation.
2. A provider-issued certification URL, test user, and permitted test hotel/rate fixtures.
3. Agreed commercial exclusions and a reliable administrator-only HBX inventory filter.
4. Reviewed Availability and CheckRate evidence from the evaluation account.
5. Approved booking, cancellation, rate-comment, cancellation-policy, and voucher fixtures.
6. An approved evaluation run of the Content API initial load, differential refresh, and freshness
   monitoring with retained scheduler evidence.
7. A supervised certification booking with no customer traffic and no live payment.

## Safe evaluation sequence now

1. Keep `HOTELBEDS_ENVIRONMENT=evaluation`; never commit or display the API key or secret.
2. Run `npm run supplier:verify:hotelbeds` to make only the signed status request.
3. Obtain HBX-approved test hotels and dates before capturing Availability evidence.
4. Confirm every candidate rate passes the pre-booking disclosure inspection. A
   `rateCommentsId` must be resolved through approved Content API evidence or CheckRate before it
   can pass.
5. Do not enable public results, Booking, cancellation, voucher fulfilment, payment, or production
   credentials through this evaluation connector.

## Certification request outline

When the evidence above is ready, the release owner can send the following information to the HBX
certification contact:

- Integration workflow: Availability, conditional CheckRate for RECHECK rates, then Booking.
- Distribution channel: Mandyal Travels web portal; Hotelbeds remains separately identifiable to
  administrators during certification.
- Commercial decisions and any excluded destinations, hotels, rooms, boards, or rates.
- Certification URL and time-limited test administrator credentials.
- Instructions for filtering Hotelbeds-only evaluation inventory.
- Confirmation that customer payment and live supplier activation are disabled during certification.

Never include the API key or signature secret in email, documentation, screenshots, source control,
or pull-request text.
