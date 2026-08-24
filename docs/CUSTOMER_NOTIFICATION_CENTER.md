# Customer notification center

`/account/notifications` gives an authenticated customer a read-only history of communications
prepared for their account. The page is provider-independent and does not send, retry, cancel, or
otherwise mutate a delivery.

## Privacy boundary

- Every count and list query is scoped by the current session's exact user identifier.
- The customer projection contains only channel, customer-friendly state, safe category, and
  preparation or delivery time.
- Recipient addresses, provider references, delivery errors, template variables, retry metadata,
  deduplication keys, and raw template content remain inside the operations boundary.
- Unknown template categories fall back to `Account update`; internal template keys are not shown.

## Bounded browsing

Status, channel, and time-window filters use fixed allowlists. Pagination is limited to 20 records
per page and the browse window is capped at 500 matches. Customers can narrow the filters when the
retained history is larger.

## Status language

Known provider states are translated into `Delivered`, `In progress`, or `Delivery delayed`;
unknown values fail closed as `Status unavailable`. A delayed
communication does not imply that a booking, payment, refund, or account record changed. Customers
are directed to support when they need assistance.
