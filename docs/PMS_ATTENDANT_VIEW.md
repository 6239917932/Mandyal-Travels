# PMS attendant view

The attendant view is a focused projection of the existing hotel room-operations records. It does
not create a second housekeeping store or a parallel workflow.

## Scope and authorization

- The server resolves the authenticated hotel partner and applies partner scope before querying.
- Only active managed-property rooms appear.
- Reads are bounded by the shared room-operations safety limits.
- Status changes continue through the existing protected physical-room endpoint.
- Inspection writes remain idempotent and append an audit record through the existing service.
- Maintenance context comes from the existing immutable work-order history.

## Queue order

Rooms are ordered by operational risk: out of service, urgent maintenance, dirty, cleaning, failed
inspection, unknown state requiring review, then ready. Ties use property and natural room-number
order so a refresh is deterministic.

## Recovery behavior

Failed client requests remain visible and can be retried. The attendant page never assumes a failed
write succeeded. If the bounded display limit is reached, the page warns the user and directs them
to the full operational views.
