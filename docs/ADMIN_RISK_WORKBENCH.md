# Administrator risk review workbench

`/admin/risk` is a platform-administrator-only suspicious-activity review queue. It provides bounded
status, severity, time-window, and search filters; complete pagination across the first 1,000 matches;
and explicit posture for new, pending, and signals aging beyond 72 hours.

The workbench deliberately treats every signal as decision support. Only a human platform
administrator can use the existing reason-required resolve or dismiss controls. The page never
blocks an account, changes a booking, cancels inventory, modifies a payment or refund, activates a
provider, or configures Cashfree.

Raw `evidenceJson`, direct subject identifiers, IP addresses, email addresses, and long numeric
identifiers are not rendered. A one-way short private reference supports correlation without exposing
the underlying subject value. Full evidence remains server-side for separately authorized
investigation and retention procedures.
