# Customer review and eligibility center

`/account/reviews` is an authenticated, bounded hotel-stay review center. Review history is scoped
only by the current session's user ID. Booking eligibility is scoped by the current session email
because the existing hotel `Booking` model has no user relation.

## Eligibility and submission

A booking is eligible only when it is confirmed, its operational state is `CHECKED_OUT`, its
checkout date has passed, its guest email exactly matches the signed-in account, and it has no
review. The customer submits the visible booking reference; the server re-resolves that exact
booking with every eligibility predicate inside a serializable transaction. The database's unique
booking-review relation prevents duplicate reviews, and concurrent submissions return a conflict.

Ratings are integers from one through five. Titles are normalized and limited to 100 characters;
review bodies are normalized and limited to 2,000 characters with a 20-character minimum. Request
bodies are limited to 2 KiB.

## Privacy and moderation

Customers see only their own submitted reviews and customer-facing booking references. Database
IDs and moderator identities are not exposed. Pending reviews remain private. Rejected reviews can
show stored moderation guidance to their author, and published reviews can show the property reply.
Customers cannot edit, delete, or resubmit a decided review.

The center is hotel-only. Flight, bus, and car feedback programmes are not launched. Review actions
never change bookings, payments, refunds, reconciliation, inventory, suppliers, loyalty records, or
Cashfree behavior.
