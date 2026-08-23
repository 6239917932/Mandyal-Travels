# Commercial approvals

Supplier onboarding, KYC, contract status, commissions, settlements, promotions, and property publication are governed separately. No production supplier may sell until finance and commercial owners approve its legal entity, bank account, tax profile, contract version, commission/take rate, settlement cadence, cancellation liability, service levels, and support contacts.

Every exception must carry an owner, reason, effective dates, evidence reference, and audit trail. Approval never substitutes for technical certification or platform-admin property review.

## Implementation decisions

- 24 August 2026: stored promotion campaigns became authoritative for matching coupon codes, with
  version-safe, reason-required, append-only activation controls. Usage-capped campaigns fail closed
  until persisted redemption counting is implemented. See `PROMOTION_GOVERNANCE.md`.
