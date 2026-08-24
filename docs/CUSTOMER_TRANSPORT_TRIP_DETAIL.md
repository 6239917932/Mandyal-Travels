# Customer transport booking detail

`/account/trips/[confirmationCode]` is an authenticated, read-only detail and servicing timeline
for locally recorded Flight, Bus, and Car bookings.

## Ownership

- Current records require an exact `CustomerTrip.userId` match.
- Normalized session-email matching is accepted only for legacy records whose `userId` is null.
- The booking reference prefix closes the product type (`MF` Flight, `MB` Bus, `MC` Car), and the
  stored product must match it.
- Missing, malformed, unsupported, ambiguous, and unowned references share the same unavailable
  state.

## Privacy and bounds

- Stored transport details pass through a product-specific scalar allowlist. Nested traveler,
  driver, contact, payment, document-query, offer, provider-reference, and other unknown fields are
  ignored.
- The returned DTO never contains raw `detailsJson`, relational IDs, provider or supplier payloads,
  payment evidence, credentials, or private support narratives.
- Only account-owned support milestones are included. The query requests one extra row and fails
  closed above 25 cases or 51 derived events instead of silently showing partial history.
- Unknown status, date, currency, amount, or display values resolve to bounded customer-safe review
  states.

## Authority and provider boundary

The page cannot modify travel, seating, vehicles, payments, refunds, or provider fulfilment. It
links only to the existing human-review support flow. A local `CONFIRMED` record is explicitly not
presented as a live provider-issued ticket, voucher, or operational confirmation while supplier
connections remain pending.

Cashfree, payment configuration, provider configuration, database schemas, and shared CSS remain
unchanged.

## Verification

```powershell
node --experimental-strip-types --test tests/customer-transport-trip-detail.test.mts
npm run check
```
