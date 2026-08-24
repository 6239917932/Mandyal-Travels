# Review moderation governance

Hotel reviews can be submitted only for a completed, confirmed stay and remain private until a
platform administrator makes a human moderation decision.

## Administrator workflow

- `/admin/reviews` defaults to the oldest pending reviews and supports closed status, rating, date,
  and bounded text filters.
- Counts are exact, results are paginated 25 at a time, and deep history is capped at 1,000 matching
  records with explicit filter guidance.
- The workbench includes published and rejected history. Decided records show the moderator,
  timestamp, and stored reason and cannot be moderated again.
- Administrators see a first-name/last-initial display and a stable one-way reviewer reference.
  Customer email addresses are intentionally excluded from this moderation surface.
- Rejections require a normalized reason of at least 10 characters. Request bodies are capped at
  2 KiB and the pending-only database update prevents concurrent duplicate decisions.

## Customer presentation

The public review list remains limited to the latest 50 published reviews for responsive delivery.
Its rating count and average are calculated independently across every published review for the
hotel, so customer summary figures are complete rather than truncated to the displayed list.

## Boundaries

Moderation is a human trust-and-safety control. It does not automatically publish, reject, alter,
or generate review content, and it does not change payment, refund, reconciliation, inventory, or
Cashfree behavior.
