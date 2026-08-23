# Administrator inventory and rate governance

The protected `/admin/inventory` directory gives platform administrators read-only visibility over
active hotel room capacity, active rate plans, seasonal rate overrides, inventory overrides,
stop-sales, and arrival/departure or stay restrictions.

Search is bounded to 100 characters. Supported forward windows are 7, 30, and 90 days. A query must
match no more than 1,000 active room types, and the displayed result is paginated at 25 room types.
The state filter is a closed catalogue: on sale, stop-sell, sold out, restricted, missing active
rate plan, and capacity issue.

Structural issues take precedence in the deterministic assessment. A room without an active rate
plan is marked `RATE_MISSING`; zero or impossible base/override capacity is marked
`CAPACITY_ISSUE`. Valid stop-sales and restrictions remain visible as intentional operational
controls rather than being silently treated as defects.

The page has no write actions. It cannot change prices, availability, restrictions, bookings,
supplier mappings, payment state, provider configuration, or Cashfree. Partners remain the owners
of their scoped PMS calendar, and existing administrator partner/catalog records provide governance
context.
