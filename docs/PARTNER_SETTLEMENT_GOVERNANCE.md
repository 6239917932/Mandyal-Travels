# Partner settlement governance

Partner settlements include only confirmed, checked-out hotel bookings backed by live, matched
captures. Supplier settlement delays, captured allocation integrity, approved-refund proration, and
single-settlement booking constraints remain enforced before a draft can be created.

Bookings with a refund in `PENDING`, `PROCESSING`, or `PROVIDER_FAILED` are held out of settlement.
This prevents supplier money from being approved while a customer refund reservation is unresolved.
Rejected refunds release the hold; approved refunds reduce the eligible gross, commission, tax, and
supplier amounts proportionally. Inactive suppliers cannot receive new settlement drafts.

Draft creation, approval, and paid confirmation create append-only settlement events. Approval and
paid actions require a 10-500 character audit note and the version that the administrator reviewed.
Concurrent or stale actions fail closed and require refresh. Payment references are validated at the
API boundary and shown to administrators and suppliers only as deterministic private references.

Administrator and supplier statement lists are server-filtered and bounded to 25 records per page.
The administrator view provides exact state totals, a result-limit warning, and the five most recent
audit events for each visible settlement. Legacy records created before the event migration remain
valid and are explicitly identified when no transition history exists.

This workflow records governance state only. It does not submit money to a bank or payment provider.
Production payout activation still requires approved supplier contracts, verified tokenized payout
destinations, provider credentials, signed callbacks, failure handling, and reconciliation evidence.
Cashfree configuration and integration are intentionally unchanged.
