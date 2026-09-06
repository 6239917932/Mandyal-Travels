# PMS direct booking

The hotel partner workspace provides a real direct reservation workflow at
`/partner/pms/walk-in`.

## Control boundary

- Only an authenticated active hotel partner can use the workflow.
- Property lookup is scoped to active `MANAGED` properties owned by that partner.
- The server validates dates, occupancy, room inventory, calendar restrictions,
  rate-plan stay limits, seasonal rates, and taxes before returning a quote.
- A reviewed room is held for ten minutes. Confirmation converts that hold so
  overlapping availability cannot be sold by a later request.
- Confirmation requires a dedicated UUID idempotency key and detects mismatched
  retries.
- The booking source is persisted as `PARTNER_DIRECT`.
- The payment transaction is persisted as `pending` with provider
  `PAY_AT_PROPERTY`. It is not represented as an online capture, does not create
  a payment journal, and does not create supplier settlement value.
- Booking and audit records are written in one database transaction.

## Operator flow

1. Select the property, room type, rate plan, dates, rooms, and occupancy.
2. Review the server-calculated total and ten-minute hold.
3. Enter guest details and explicitly confirm the pay-at-property arrangement.
4. Open Front desk to assign a physical room and perform valid stay transitions.

Collection or reconciliation of money received at the property is a separate
finance capability. Until that workflow is implemented, the reservation remains
clearly marked `Due at property` and is excluded from captured platform revenue.
