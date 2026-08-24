# Customer travel-document center

## Scope

`/account/documents` is a private, authenticated index of documents already supported by the
portal. It does not generate new financial evidence or claim live provider fulfillment.

- Hotel records can link to the existing booking voucher and provisional payment receipt when the
  stored booking/payment posture is eligible. The receipt is not a statutory GST tax invoice.
- Confirmed Flight, Bus, and Car records can link to the existing prototype itinerary, ticket, or
  voucher. Final provider documents remain provider-fulfillment work.
- Every destination route performs its existing ownership check again. An index link is never an
  authorization grant.

The same bounded index is available from authenticated `GET /api/v1/account/documents`.

## Ownership and disclosure boundary

Transport records are selected only by the signed-in user's exact `User.id`. Legacy hotel booking
records are selected only by the signed-in user's exact normalized session email. The two identity
models are deliberately not combined with a broad fallback query.

Transport `detailsJson` is treated as untrusted internal storage. The index parses only its
`documentQuery` string and rebuilds a link from a closed, product-specific allowlist of public
search criteria. It never returns raw JSON, payment details, supplier payloads, provider
references, secrets, or tokens. Malformed, oversized, incomplete, non-confirmed, or unknown
records fail closed without a link.

Public transport titles and subtitles already shown in travel history may be displayed, but no
private provider payload is projected into the response.

## Bounds and states

Hotel and transport results are independently paginated at 20 records per page. Each collection is
hard-capped at the latest 500 records (25 pages) so a customer request cannot create an unbounded
database response. The page includes independent empty, loading, error/retry, capped-result, and
document-unavailable states.

No schema, payment, refund, supplier-integration, Cashfree, or account-export behavior is changed
by this module.
