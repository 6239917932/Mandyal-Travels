# Customer transport trip persistence integrity

Flight, Bus, and Car booking records use a closed booking-reference contract:

- `MF` references are Flight records.
- `MB` references are Bus records.
- `MC` references are Car records.

The account trip endpoint rejects any reference/product mismatch before inventory revalidation or
persistence. The authenticated user's exact ID owns current records. Normalized email matching is
accepted only for legacy records whose stored `userId` is null; it cannot override another user's
non-null ownership.

## Idempotent retry boundary

Before accepting an existing confirmation reference, the service compares an immutable fingerprint
covering the product, reference, dates, title, subtitle, total, currency, status, company-request
context, and a SHA-256 digest of the private details JSON. An exact retry returns the existing safe
receipt with HTTP 200. Any changed context returns HTTP 409 and never overwrites the stored booking.

The final existing-reference check and create operation share the same database transaction. Direct
Bus seat and Car vehicle reservations remain in that transaction, so a failed or concurrent create
cannot leave a duplicate reservation. A concurrent winner is re-resolved against the same ownership
and immutable fingerprint rules.

## Disclosure and authority

POST and GET return only the reference, product, customer-facing booking status, dates, bounded
title/subtitle, INR total, and currency. They never return raw `detailsJson`, passenger or driver
records, payment state, document queries, supplier/provider references, credentials, or internal
database identifiers.

The change does not alter inventory validation, partner reservation rules, booking totals, payment
behavior, Cashfree, provider adapters, or the API catalogue. Existing same-origin protection for
authenticated API mutations remains in the application proxy.
