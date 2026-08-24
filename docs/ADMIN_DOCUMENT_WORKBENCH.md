# Administrator document readiness workbench

`/admin/documents` is a platform-administrator-only, read-only view of customer document
readiness. It does not bypass customer document authorization and it does not mutate bookings,
payments, refunds, amendments, inventory, or supplier records.

## Readiness rules

- A hotel voucher and provisional payment receipt are `READY` only when the booking is confirmed
  and its captured payment amount and currency match the booking.
- Pending amendments, pending refunds, and provider-failed refunds are `REVIEW` exceptions.
- Unconfirmed bookings or missing captured-payment evidence are `BLOCKED`.
- Confirmed Flight, Bus, and Car records can have a `READY` operational confirmation, itinerary,
  ticket, or voucher. Billing is `NOT AVAILABLE` because provider-backed payment evidence is not
  persisted for these products.

Search is bounded to 100 characters, filter values are allow-listed, date ranges fail closed, and
each product list is paginated at 25 records. Customer-facing document URLs are intentionally not
exposed to administrators because those routes require the customer's booking token or account.

## Tax boundary

The existing hotel billing document is a provisional payment receipt, not a statutory GST tax
invoice. This workbench does not generate GST invoices, credit notes, supplier tax records, or tax
identifiers. Those capabilities remain blocked until adviser-approved tax rules and production
seller/supplier registrations are configured.
