# Administrator audit workbench

The protected `/admin/audit` workbench gives platform administrators one read-only timeline for
material platform configuration, destination content, promotion governance, partner settlements,
integration exception reviews, supplier, organization, customer-support, privacy-review, and
account-security history. Public registration cannot grant access; the page repeats the
platform-administrator authorization check before reading any records.

Filters use a closed domain catalogue, a 100-character search limit, validated date bounds, and
server-side queries. Results are merged by recorded time and paginated in groups of 25. Deep access
is capped at the latest 1,000 matching records; when more records exist, the interface explicitly
asks the administrator to narrow the domain, search, or date range. This prevents an unbounded
cross-table database read while preserving exact ordering for every available page.

The workbench displays only the actor identity and operational context needed for investigation.
Integration aggregates use deterministic private references, and settlement history excludes payment
references. It does not expose passwords, session tokens, reset tokens, payment credentials, provider
payloads, delivery errors, or free-form audit metadata. It offers no create, update, delete, booking,
inventory, payment, refund, or reconciliation action. Cashfree is not read, configured, or modified by
this module.
