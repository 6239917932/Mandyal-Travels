# Customer hotel booking detail

`/account/hotel-bookings/[confirmationCode]` is an authenticated, read-only view of one hotel
booking and its stored date-change and customer-support milestones.

## Ownership and disclosure

- The route accepts only a generated Mandyal hotel reference. The service normalizes the signed-in
  email and requires an exact `LOWER(TRIM(BookingGuest.email))` match before reading the booking.
- Linked support cases are additionally restricted to the current user ID. A missing, malformed,
  or unowned reference receives the same customer-safe unavailable state.
- The DTO contains the booking reference, safe hotel/stay labels, dates, room count, current total,
  and closed customer-facing statuses. It excludes guest contact and request details, access
  tokens, payment/refund/provider data, partner notes, assigned rooms, inventory sources,
  integration events, review notes, and raw relational IDs.

## Complete bounded history

The view returns every stored amendment and account-owned support milestone for a booking only
when the history fits the hard bounds: at most 25 amendments, 25 support cases, and 101 derived
events. Queries request one extra relation row so an oversized history fails closed and directs the
customer to support rather than silently presenting a partial record.

The timeline is informational. Voucher and receipt links retain their existing authorization,
while manage-booking and support links lead to the established servicing flows. This feature does
not change a booking, approve a request, capture a payment, issue a refund, configure a provider, or
modify Cashfree.
