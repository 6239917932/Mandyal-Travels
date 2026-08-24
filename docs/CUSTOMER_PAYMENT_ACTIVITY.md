# Customer hotel payment activity

`/account/payments` is an authenticated, read-only history of the payment and refund states already
recorded for hotel bookings. The matching API is `GET /api/v1/account/payments?page={1..20}`.

## Ownership and bounds

- The current session email is normalized before lookup. Ownership is established only when
  `LOWER(TRIM(BookingGuest.email))` exactly equals that normalized email.
- The lookup is capped at 300 owned hotel bookings, payment pages contain at most 15 records, and
  each payment contains at most the five newest refund updates. Larger histories fail closed and
  direct the customer to support rather than returning a partial or cross-customer result.
- This center currently covers hotel payments only. Flight, bus, and car checkout remains a
  prototype and is not represented as a payment ledger here.

## Disclosure boundary

The customer DTO contains only the hotel booking reference, safe hotel/stay labels, recorded amount
and currency, customer-facing payment/refund states, and timestamps. It never returns gateway or
provider names, provider references, checkout intents, reconciliation fields, internal review
notes, ledger entries, journals, allocation data, or raw payment/refund rows.

## Operational safety

The page and endpoint expose no mutation. They cannot capture, reconcile, retry, approve, reject,
or dispatch a payment or refund. Booking servicing remains in the existing manage-booking and
customer-support workflows. Cashfree is not configured or modified by this feature.
