# Administrator autopilot operations

`/admin/automation` is a platform-administrator-only, read-only view of scheduler leases and safe
maintenance, notification-delivery, search-projection, and successful isolated database-restore
verification evidence. It provides closed status and time-window filters, capped pagination, private
correlation references, lease health, processed totals, and allow-listed numeric summaries.

The page never exposes worker secrets, lease tokens, raw correlation identifiers, stored JSON,
provider errors, recipients, message content, or customer data. It cannot manually trigger a run or mutate payments, refunds,
payouts, prices, bookings, inventory, or suppliers. Scheduler activation still requires production
infrastructure, a secret-managed `AUTOPILOT_WORKER_SECRET`, alerts, and an accountable run owner.
Database recovery reporting also requires a real provider backup, an isolated restore target, and a
successful read-only PostgreSQL restore rehearsal; the portal never creates or restores a backup.
