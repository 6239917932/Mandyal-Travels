# Guided hotel filter explanation

The hotel discovery assistant now shows customers the explanation already produced when their
natural-language request is converted into ordinary hotel-search filters.

## Safety boundary

- The browser stores a versioned, destination- and request-bound explanation for no more than five
  minutes. The request token also makes repeated guided searches for the same destination distinct.
- The destination is limited to 100 characters and the explanation to 500 characters. Malformed,
  legacy, stale, future-dated, mismatched, or oversized records are discarded without display.
- The display consumes and removes the session record before parsing, so it cannot reappear on a
  later unrelated hotel search. Customers may also dismiss the visible explanation.
- If session storage is disabled, unavailable, or full, guided search still navigates normally and
  the explanation fails closed.

The explanation describes filter interpretation only. It does not identify or activate an AI
provider, and it never changes search, availability, inventory, quote, booking, payment, or
Cashfree behavior. Hotel search and quote engines remain authoritative for inventory, policies,
availability, and final prices.
