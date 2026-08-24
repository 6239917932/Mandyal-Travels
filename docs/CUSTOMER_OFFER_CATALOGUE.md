# Governed customer offer catalogue

`/offers` is a public, read-only projection of promotion rules that are currently resolvable by the
same governed campaign controls used during checkout validation.

## Authority and bounds

- The built-in promotion catalogue remains the fallback only when no stored campaign exists for
  that code. A stored campaign is authoritative even when it is paused, scheduled, expired,
  malformed, or blocked because capped redemption is not tracked; in those states the baseline
  code is not advertised.
- Stored overrides for every built-in code are queried separately from additional campaigns so the
  100-record public bound can never hide an override and accidentally revive stale baseline copy.
- Additional stored campaigns are ordered by code and read with a 101-record sentinel. The page
  evaluates at most 100 and discloses when the catalogue was truncated.
- Each displayed product must resolve through the existing stored or baseline rule resolver at the
  time of the request. Numeric values are validated again before presentation.

## Public disclosure boundary

The page returns only coupon code, customer-facing name and description, eligible product links,
percentage, minimum booking value, and maximum discount. Campaign IDs, operator identities,
versions, audit reasons, internal state labels, usage caps, and dates are not returned. Product
links come from a closed Hotel, Flight, Bus, and Car map.

The catalogue never reserves inventory or guarantees eligibility, a discount, or a final price.
Checkout remains authoritative. The implementation does not change campaign rules, dates, caps,
administration, payment behavior, or Cashfree.
