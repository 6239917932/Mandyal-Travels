# Fraud operations runbook

The portal records governed risk cases, queue decisions, actor attribution, payment events, KYC status, and immutable finance activity. Production fraud controls should combine rate limits, identity/account signals, payment-provider risk signals, velocity and mismatch rules, supplier anomalies, refund abuse, device/session signals, and manual review without automatically discriminating on protected traits.

Every rule needs an owner, version, threshold rationale, monitoring, false-positive review, appeal path, audit trail, and safe rollback. High-risk actions should hold rather than delete orders, and sensitive risk evidence must have restricted access and retention.
