# Launch readiness register

`/admin/readiness` consolidates the next 20 production launch gates without weakening any existing
feature control. It reports only the presence of bounded technical evidence; it never renders secret
values and it cannot activate payments, payouts, public listings, provider connectivity, uploads or
mobile messaging.

The register deliberately distinguishes internal action from external approval. Legal, finance and
provider-owned rows remain externally blocked until the responsible party issues real approval.
Environment-variable presence is operational evidence for review, not proof of certification and not
an authorization boundary.

Run `npm run launch:verify-register` to confirm that the register still contains exactly 20 unique
gates and that every row references a committed runbook. New gates require an owner, a bounded
readiness signal where one exists, fail-closed behavior, tests and a runbook.
