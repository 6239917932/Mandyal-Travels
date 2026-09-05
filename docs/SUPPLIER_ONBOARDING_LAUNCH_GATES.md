# Supplier onboarding launch gates

The administrator enrollment workbench at `/admin/partners/onboarding` can create paused,
bounded launch waivers, activate or pause them with version-safe audited reasons, and inspect a
privacy-minimized enrollment ledger. This control surface does not remove any launch gate below.

Status: implementation and legal review checklist. This is not legal advice or a signed supplier agreement.

## Commercial configuration

- One-time setup fee: ₹25,000 (2,500,000 paise).
- Monthly subscription: ₹999 (99,900 paise).
- First checkout snapshot: ₹25,999 unless an approved campaign changes the commercial offer.
- A valid platform-created waiver coupon may reduce the first checkout to ₹0. Coupon claims must be bounded, auditable, and server validated.
- A ₹0 waiver is an explicit entitlement; it is not a fake payment transaction.
- Recurring collection must not start until a separate PayU mandate and supplier consent are recorded.

## Non-negotiable technical gates

1. PayU payment or an approved waiver must be reconciled server-side before commercial completion.
2. The supplier must accept the exact approved agreement version. Store its version and hash, acceptance time, account, IP/user-agent hashes, and independent phone-OTP verification reference.
3. Do not describe ordinary OTP clickwrap as a statutory digital signature. The agreement requires Indian counsel approval before activation.
4. KYC evidence, tax review, supplier approval, and listing approval remain independent gates. Payment never auto-approves a supplier or listing.
5. Hotels and vehicles remain non-public until a platform administrator approves them. Open high-risk signals block approval; a human makes the final decision.
6. Admin removal is a recoverable archive with a reason and audit trail. Existing bookings, payment, complaint, tax, and settlement records are preserved.
7. Supplier bank/UPI details must be captured by the approved payout provider. Mandyal stores only provider references and masked display data.

## Implemented enrollment controls

- The enrollment order stores an immutable price/version snapshot in paise, while the PayU boundary converts the charge to whole INR and converts verified INR back to paise for comparison.
- Browser redirects and signed PayU webhooks both use server-side `verify_payment`; browser-provided success text never marks an order captured.
- Full-waiver coupons are created by a platform administrator, bounded by a start/end time and optional usage cap, and cannot be consumed repeatedly by the same supplier account.
- Agreement acceptance stores the exact approved content hash and hashed request evidence. It requires a current provider-backed phone-verification record and a captured or waived enrollment order.
- Agreement text is stored as an immutable, server-hashed draft. Releasing it requires an exact
  confirmation, the current governance version, a decision reason, and a counsel-approval reference.
  Releasing a new version atomically supersedes the previous release, and only the single current
  release can be accepted.
- Supplier application submission and administrator approval independently re-check the completed enrollment when `PAID_PARTNER_ONBOARDING` is enabled.
- `PAID_PARTNER_ONBOARDING` remains disabled by default. The UI and data model being present do not authorize production enrollment.

## Legal and compliance review

- Consumer disclosures and marketplace conduct: Consumer Protection (E-Commerce) Rules, 2020 and related Department of Consumer Affairs rules: https://consumeraffairs.nic.in/acts-and-rules/consumer-protection/consumer-protection
- Electronic contracts: Information Technology Act, 2000, section 10A: https://www.indiacode.nic.in/bitstream/123456789/15413/1/20_the_information_technology_act%2C_2000%283%29.pdf
- Personal-data notice, minimisation, security, rights and breach controls: Digital Personal Data Protection Rules, 2025: https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025%3B
- Aadhaar: offer alternatives and avoid storing full Aadhaar; use authorised/offline verification where applicable: https://uidai.gov.in/en/307-faqs/aadhaar-online-services/aadhaar-paperless-offline-e-kyc/10726-what-is-aadhaar-offline-e-kyc.html
- OTP messaging requires an approved provider and applicable TRAI/DLT sender registration and templates: https://trai.gov.in/advice-to-senders
- Vehicle aggregation requires Central and State-specific licensing review under the Motor Vehicle Aggregator Guidelines, 2025: https://morth.nic.in/sites/default/files/circulars_document/MV-Aggregators-Guidelines-2025%20-%20English%20and%20Hindi.pdf
- GST/TCS and notified e-commerce supplies require a qualified tax review: https://cbic-gst.gov.in/hindi/sectoral-faq.html

## Required external approvals before opening enrollment

- Indian technology/e-commerce counsel approves the final supplier agreement, privacy notice, cancellation/refund allocation, dispute process, and clickwrap/OTP evidence.
- Chartered accountant/GST adviser approves invoicing, GST/TCS/TDS treatment, fee tax treatment, and settlement statements.
- PayU confirms marketplace/split-settlement and recurring-mandate configuration.
- SMS provider/DLT registration and OTP template are active.
- Private object storage, malware scanning, access logging, retention, and deletion controls are active for KYC evidence.
- For cars, counsel confirms each target State’s aggregator, permit, insurance, driver, and vehicle requirements before `CAR_MARKETPLACE` is enabled.
