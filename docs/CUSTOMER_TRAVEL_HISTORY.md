# Customer travel history

The signed-in travel-history directory is a read-only projection. It combines transport and rental
records (`FLIGHT`, `BUS`, and `CAR`) with hotel bookings without exposing raw booking records.

## Ownership

- Transport records match the authenticated `userId` exactly.
- A normalized session-email match is permitted only for legacy `CustomerTrip` rows whose `userId`
  is `NULL`. A row claimed by another user never falls back to email.
- Hotel records match the normalized signed-in email against the booking guest email.
- Every detail, voucher, ticket, and itinerary destination performs its own authorization. A
  directory link is not an authorization grant.

## Bounds and projection

- Each category exposes 20 records per page and at most the latest 500 records. A 501st identifier
  is read only to disclose that the result is capped.
- Queries first select owned identifiers and then fetch only the fields needed for the current page.
- Product types, statuses, dates, and money use closed customer-safe mappings. Unknown or malformed
  values display as under review or unavailable.
- DTOs never contain customer email, passenger or driver data, booking contacts, provider payloads,
  payment data, tokens, identity documents, special requests, or raw JSON.

## Document links

Transport `detailsJson` is read only for document-link recovery, with a 32 KB limit. The stored
query is parsed and rebuilt from a product-specific allowlist. Required values, dates, counts,
enums, and duplicate keys fail closed. Unknown keys are discarded, so private contact, provider,
payment, passenger, and driver fields cannot be copied into a URL.

Both the full travel-history directory and the account dashboard's recent-trip cards consume this
same document projection. Neither page parses or concatenates the stored query itself.

Hotel voucher links are rebuilt from the validated booking reference. Document destinations always
reauthorize the signed-in customer before displaying a document.

The directory does not mutate bookings, payments, refunds, supplier state, or documents. Cashfree
and provider integrations are outside this feature.
