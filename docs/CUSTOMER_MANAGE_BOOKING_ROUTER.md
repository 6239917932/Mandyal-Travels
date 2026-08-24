# Manage-booking reference routing

The customer manage-booking lookup accepts only the portal's closed reference families:

- `MT` routes to the Hotel booking service.
- `MF`, `MB`, and `MC` route to the authenticated Flight, Bus, or Car trip service.

References are trimmed, uppercased, limited to 22 characters, and require 8–20 alphanumeric
characters after the prefix. An unknown or malformed prefix is rejected before any request.

## Failure and access boundary

Each valid reference reaches exactly one service. A Hotel service outage is shown as a recoverable
Hotel management error and is never retried against transport storage. Access-denied and missing
records use bounded customer wording and never reveal another customer's booking. A newer lookup
cancels the prior browser request so a stale response cannot replace the current result.

Hotel access-token cookies and signed-in guest access remain inside the existing Hotel API. Voucher,
receipt, cancellation, and amendment behavior is unchanged. Transport responses must match the
normalized reference and its fixed product before display. Their support link is built only from
that verified reference/product pair and remains a human-review request, not an automatic booking
change or refund.

This work does not change booking mutations, trip persistence, payment, refunds, schema, Cashfree,
or provider integrations.
