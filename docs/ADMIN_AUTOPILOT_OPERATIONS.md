# Administrator autopilot operations

`/admin/automation` is a platform-administrator-only, read-only view of scheduler leases and safe
maintenance and notification-delivery run evidence. It provides closed status and time-window filters, capped pagination,
private correlation references, lease health, processed totals, and allow-listed numeric expiry
summaries.

The page never exposes worker secrets, lease tokens, raw correlation identifiers, stored JSON,
provider errors, recipients, message content, or customer data. It cannot manually trigger a run or mutate payments, refunds,
payouts, prices, bookings, inventory, or suppliers. Scheduler activation still requires production
infrastructure, a secret-managed `AUTOPILOT_WORKER_SECRET`, alerts, and an accountable run owner.
