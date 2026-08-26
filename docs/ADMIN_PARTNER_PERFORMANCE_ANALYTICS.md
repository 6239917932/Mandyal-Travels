# Administrator partner performance analytics

`/admin/analytics` includes a read-only, platform-administrator-only partner performance section.
It uses persisted INR settlement records from the last 30 days to show platform gross, commission,
partner net value, represented bookings, and the ten partners with the highest recorded gross value.

The view does not infer missing revenue, rank partners without settlement evidence, expose payout
accounts or provider identifiers, or initiate payouts. Currency conversion, externally executed
payouts, and provider reconciliation remain separately governed operations.
