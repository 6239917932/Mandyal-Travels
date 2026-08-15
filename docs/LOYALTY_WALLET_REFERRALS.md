# Loyalty, wallet, and referral governance

The data foundation provides one loyalty account per user, immutable idempotent ledger entries, integer point and wallet balances, explicit wallet currency, and bounded referral-code usage. Balance changes must occur transactionally with a ledger entry; direct unaudited balance edits are prohibited.

Production launch requires approved earn/burn/expiry rules, liability accounting, refund reversals, negative-balance handling, wallet licensing/legal review, KYC and funding restrictions where applicable, fraud and self-referral controls, tax treatment, customer statements, support tools, and reconciliation. No monetary wallet funding is enabled by this schema alone.
